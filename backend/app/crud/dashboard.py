from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.application import Application
from app.models.backup import Backup, BackupFrequency, BackupStatus
from app.models.provider import Provider
from app.models.server import Server, ServerStatus
from app.models.ssh_key import SshKey
from app.schemas.dashboard import BackupCoverage, CostByProvider, CostSummary, CurrencyTotal, DashboardStats, OverdueBackup, RecentBackup


class DashboardCRUD:
    async def get_stats(self, db: AsyncSession) -> DashboardStats:
        # Combine server counts into one query
        server_stmt = select(
            func.count(Server.id).label("total"),
            func.count(Server.id).filter(Server.status == ServerStatus.active).label("active"),
            func.count(Server.id).filter(Server.last_check_status == "unhealthy").label("unhealthy"),
        )
        server_row = (await db.execute(server_stmt)).one()

        # Combine backup counts into one query
        backup_stmt = select(
            func.count(Backup.id).label("total"),
            func.count(Backup.id).filter(Backup.last_run_status == BackupStatus.failed).label("failing"),
        )
        backup_row = (await db.execute(backup_stmt)).one()

        total_providers = (await db.execute(select(func.count(Provider.id)))).scalar() or 0
        total_applications = (await db.execute(select(func.count(Application.id)))).scalar() or 0
        total_ssh_keys = (await db.execute(select(func.count(SshKey.id)))).scalar() or 0

        return DashboardStats(
            total_servers=server_row.total,
            active_servers=server_row.active,
            unhealthy_servers=server_row.unhealthy,
            total_providers=total_providers,
            total_applications=total_applications,
            total_ssh_keys=total_ssh_keys,
            total_backups=backup_row.total,
            failing_backups=backup_row.failing,
        )

    async def get_cost_summary(self, db: AsyncSession) -> CostSummary:
        stmt = (
            select(
                func.coalesce(Provider.name, "Unassigned").label("provider_name"),
                func.coalesce(func.sum(Server.monthly_cost), 0).label("total_cost"),
                func.coalesce(Server.cost_currency, "EUR").label("currency"),
                func.count(Server.id).label("server_count"),
            )
            .outerjoin(Provider, Provider.id == Server.provider_id)
            .where(Server.monthly_cost.isnot(None))
            .group_by("provider_name", Server.cost_currency)
        )
        result = await db.execute(stmt)
        rows = result.all()

        by_provider = []
        totals_map: dict[str, Decimal] = {}
        for name, cost, currency, count in rows:
            cost_val = Decimal(str(cost))
            cur = currency or "EUR"
            totals_map[cur] = totals_map.get(cur, Decimal("0.00")) + cost_val
            by_provider.append(CostByProvider(
                provider_name=name, total_cost=cost_val, currency=cur, server_count=count
            ))

        totals_by_currency = [
            CurrencyTotal(currency=cur, amount=amt) for cur, amt in sorted(totals_map.items())
        ]

        return CostSummary(
            total_monthly_cost=Decimal("0.00"),
            by_provider=by_provider,
            totals_by_currency=totals_by_currency,
        )

    async def get_recent_backups(self, db: AsyncSession, limit: int = 10) -> list[RecentBackup]:
        stmt = (
            select(Backup)
            .options(
                selectinload(Backup.source_server),
                selectinload(Backup.application),
            )
            .where(Backup.last_run_status.in_([BackupStatus.failed, BackupStatus.success, BackupStatus.running]))
            .order_by(Backup.last_run_at.desc().nullslast())
            .limit(limit)
        )
        result = await db.execute(stmt)
        backups = result.scalars().all()

        return [
            RecentBackup(
                id=b.id,
                name=b.name,
                source_server_name=b.source_server.name if b.source_server else None,
                application_name=b.application.name if b.application else None,
                last_run_status=b.last_run_status.value if b.last_run_status else "never_run",
                last_run_at=b.last_run_at.isoformat() if b.last_run_at else None,
            )
            for b in backups
        ]


    async def get_backup_coverage(self, db: AsyncSession) -> BackupCoverage:
        total_apps = (await db.execute(select(func.count(Application.id)))).scalar() or 0

        covered_stmt = (
            select(func.count(func.distinct(Backup.application_id)))
            .where(Backup.application_id.isnot(None))
        )
        covered_apps = (await db.execute(covered_stmt)).scalar() or 0

        cutoff = datetime.utcnow() - timedelta(hours=24)
        failed_stmt = (
            select(func.count(Backup.id))
            .where(
                Backup.last_run_status == BackupStatus.failed,
                Backup.last_run_at >= cutoff,
            )
        )
        failed_24h = (await db.execute(failed_stmt)).scalar() or 0

        uncovered_stmt = (
            select(Application.name)
            .where(~Application.id.in_(
                select(Backup.application_id).where(Backup.application_id.isnot(None))
            ))
        )
        uncovered_result = await db.execute(uncovered_stmt)
        uncovered_names = [row[0] for row in uncovered_result.all()]

        return BackupCoverage(
            total_applications=total_apps,
            covered_applications=covered_apps,
            failed_backups_24h=failed_24h,
            uncovered_applications=uncovered_names,
        )


    async def get_overdue_backups(self, db: AsyncSession) -> list[OverdueBackup]:
        frequency_hours = {
            BackupFrequency.hourly: 2,
            BackupFrequency.daily: 26,
            BackupFrequency.weekly: 170,
            BackupFrequency.monthly: 744,
        }

        now = datetime.utcnow()
        stmt = (
            select(Backup)
            .options(
                selectinload(Backup.source_server),
                selectinload(Backup.application),
            )
            .where(
                Backup.frequency != BackupFrequency.manual,
                Backup.last_run_at.isnot(None),
            )
        )
        result = await db.execute(stmt)
        backups = result.scalars().all()

        overdue = []
        for b in backups:
            max_hours = frequency_hours.get(b.frequency)
            if max_hours is None:
                continue
            deadline = b.last_run_at + timedelta(hours=max_hours)
            if now > deadline:
                hours_overdue = int((now - deadline).total_seconds() / 3600)
                overdue.append(OverdueBackup(
                    id=b.id,
                    name=b.name,
                    frequency=b.frequency.value,
                    last_run_at=b.last_run_at.isoformat() if b.last_run_at else None,
                    source_server_name=b.source_server.name if b.source_server else None,
                    application_name=b.application.name if b.application else None,
                    hours_overdue=hours_overdue,
                ))

        overdue.sort(key=lambda x: x.hours_overdue, reverse=True)
        return overdue


dashboard_crud = DashboardCRUD()
