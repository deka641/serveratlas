from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.application import Application
from app.models.backup import Backup, BackupStatus
from app.models.provider import Provider
from app.models.server import Server, ServerStatus
from app.models.ssh_key import SshKey
from app.schemas.dashboard import CostByProvider, CostSummary, CurrencyTotal, DashboardStats, RecentBackup


class DashboardCRUD:
    async def get_stats(self, db: AsyncSession) -> DashboardStats:
        total_servers = (await db.execute(select(func.count(Server.id)))).scalar() or 0
        active_servers = (await db.execute(
            select(func.count(Server.id)).where(Server.status == ServerStatus.active)
        )).scalar() or 0
        total_providers = (await db.execute(select(func.count(Provider.id)))).scalar() or 0
        total_applications = (await db.execute(select(func.count(Application.id)))).scalar() or 0
        total_ssh_keys = (await db.execute(select(func.count(SshKey.id)))).scalar() or 0
        total_backups = (await db.execute(select(func.count(Backup.id)))).scalar() or 0
        failing_backups = (await db.execute(
            select(func.count(Backup.id)).where(Backup.last_run_status == BackupStatus.failed)
        )).scalar() or 0

        return DashboardStats(
            total_servers=total_servers,
            active_servers=active_servers,
            total_providers=total_providers,
            total_applications=total_applications,
            total_ssh_keys=total_ssh_keys,
            total_backups=total_backups,
            failing_backups=failing_backups,
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
        total = Decimal("0.00")
        for name, cost, currency, count in rows:
            cost_val = Decimal(str(cost))
            cur = currency or "EUR"
            total += cost_val
            totals_map[cur] = totals_map.get(cur, Decimal("0.00")) + cost_val
            by_provider.append(CostByProvider(
                provider_name=name, total_cost=cost_val, currency=cur, server_count=count
            ))

        totals_by_currency = [
            CurrencyTotal(currency=cur, amount=amt) for cur, amt in sorted(totals_map.items())
        ]

        return CostSummary(
            total_monthly_cost=total,
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


dashboard_crud = DashboardCRUD()
