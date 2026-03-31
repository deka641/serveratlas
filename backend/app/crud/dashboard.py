from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.application import Application
from app.models.backup import Backup, BackupFrequency, BackupStatus
from app.models.provider import Provider
from app.models.server import Server, ServerStatus
from app.models.ssh_key import SshKey
from app.models.tag import Tag, ServerTag
from app.schemas.dashboard import BackupCoverage, CostByProvider, CostByTag, CostSummary, CurrencyTotal, DashboardStats, DocumentationCoverage, HealthSummary, OverdueBackup, RecentBackup, UndocumentedServer


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
                Provider.monthly_budget.label("monthly_budget"),
            )
            .outerjoin(Provider, Provider.id == Server.provider_id)
            .where(Server.monthly_cost.isnot(None))
            .group_by("provider_name", Server.cost_currency, Provider.monthly_budget)
        )
        result = await db.execute(stmt)
        rows = result.all()

        by_provider = []
        totals_map: dict[str, Decimal] = {}
        for row in rows:
            cost_val = Decimal(str(row.total_cost))
            cur = row.currency or "EUR"
            totals_map[cur] = totals_map.get(cur, Decimal("0.00")) + cost_val
            budget = Decimal(str(row.monthly_budget)) if row.monthly_budget else None
            utilization = round(float(cost_val / budget * 100), 1) if budget and budget > 0 else None
            by_provider.append(CostByProvider(
                provider_name=row.provider_name, total_cost=cost_val, currency=cur,
                server_count=row.server_count, monthly_budget=budget,
                budget_utilization_pct=utilization,
            ))

        totals_by_currency = [
            CurrencyTotal(currency=cur, amount=amt) for cur, amt in sorted(totals_map.items())
        ]

        total_monthly_cost = sum(totals_map.values(), Decimal("0.00"))

        return CostSummary(
            total_monthly_cost=total_monthly_cost,
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
        cutoff = datetime.utcnow() - timedelta(hours=24)

        # Consolidated query: total apps, covered apps, failed in 24h
        agg_stmt = (
            select(
                func.count(func.distinct(Application.id)).label("total_apps"),
                func.count(func.distinct(
                    case((Backup.application_id.isnot(None), Backup.application_id), else_=None)
                )).label("covered_apps"),
                func.count(func.distinct(
                    case(
                        (
                            (Backup.last_run_status == BackupStatus.failed) & (Backup.last_run_at >= cutoff),
                            Backup.id,
                        ),
                        else_=None,
                    )
                )).label("failed_24h"),
            )
            .select_from(Application)
            .outerjoin(Backup, Backup.application_id == Application.id)
        )
        row = (await db.execute(agg_stmt)).one()

        # Uncovered applications (separate query — needs actual names)
        uncovered_stmt = (
            select(Application.name)
            .where(~Application.id.in_(
                select(Backup.application_id).where(Backup.application_id.isnot(None))
            ))
        )
        uncovered_result = await db.execute(uncovered_stmt)
        uncovered_names = [r[0] for r in uncovered_result.all()]

        return BackupCoverage(
            total_applications=row.total_apps,
            covered_applications=row.covered_apps,
            failed_backups_24h=row.failed_24h,
            uncovered_applications=uncovered_names,
        )


    async def get_overdue_backups(self, db: AsyncSession) -> list[OverdueBackup]:
        from sqlalchemy import type_coerce, Integer as SAInteger

        # Compute deadline per frequency directly in SQL
        deadline_expr = case(
            (Backup.frequency == BackupFrequency.hourly, Backup.last_run_at + timedelta(hours=2)),
            (Backup.frequency == BackupFrequency.daily, Backup.last_run_at + timedelta(hours=26)),
            (Backup.frequency == BackupFrequency.weekly, Backup.last_run_at + timedelta(hours=170)),
            (Backup.frequency == BackupFrequency.monthly, Backup.last_run_at + timedelta(hours=744)),
        )

        hours_overdue_expr = func.floor(
            func.extract('epoch', func.now() - deadline_expr) / 3600
        )

        stmt = (
            select(
                Backup.id,
                Backup.name,
                Backup.frequency,
                Backup.last_run_at,
                Server.name.label("source_server_name"),
                Application.name.label("application_name"),
                type_coerce(hours_overdue_expr, SAInteger).label("hours_overdue"),
            )
            .outerjoin(Server, Backup.source_server_id == Server.id)
            .outerjoin(Application, Backup.application_id == Application.id)
            .where(
                Backup.frequency != BackupFrequency.manual,
                Backup.last_run_at.isnot(None),
                deadline_expr.isnot(None),
                func.now() > deadline_expr,
            )
            .order_by(hours_overdue_expr.desc())
        )
        result = await db.execute(stmt)
        rows = result.all()

        return [
            OverdueBackup(
                id=row.id,
                name=row.name,
                frequency=row.frequency.value if hasattr(row.frequency, 'value') else row.frequency,
                last_run_at=row.last_run_at.isoformat() if row.last_run_at else None,
                source_server_name=row.source_server_name,
                application_name=row.application_name,
                hours_overdue=max(row.hours_overdue or 0, 0),
            )
            for row in rows
        ]


    async def get_cost_by_tag(self, db: AsyncSession) -> list[CostByTag]:
        stmt = (
            select(
                Tag.id.label("tag_id"),
                Tag.name.label("tag_name"),
                Tag.color.label("tag_color"),
                func.coalesce(func.sum(Server.monthly_cost), 0).label("total_cost"),
                func.coalesce(Server.cost_currency, "EUR").label("currency"),
                func.count(Server.id).label("server_count"),
            )
            .join(ServerTag, ServerTag.tag_id == Tag.id)
            .join(Server, Server.id == ServerTag.server_id)
            .where(Server.monthly_cost.isnot(None))
            .group_by(Tag.id, Tag.name, Tag.color, Server.cost_currency)
            .order_by(func.sum(Server.monthly_cost).desc())
        )
        result = await db.execute(stmt)
        rows = result.all()
        return [
            CostByTag(
                tag_id=row.tag_id,
                tag_name=row.tag_name,
                tag_color=row.tag_color,
                total_cost=Decimal(str(row.total_cost)),
                currency=row.currency or "EUR",
                server_count=row.server_count,
            )
            for row in rows
        ]

    async def get_health_summary(self, db: AsyncSession) -> HealthSummary:
        stmt = select(
            func.count(Server.id).label("total"),
            func.count(Server.id).filter(Server.last_check_status == "healthy").label("healthy"),
            func.count(Server.id).filter(Server.last_check_status == "unhealthy").label("unhealthy"),
            func.count(Server.id).filter(Server.last_check_status.is_(None)).label("unchecked"),
            func.max(Server.last_checked_at).label("last_check"),
        )
        row = (await db.execute(stmt)).one()
        return HealthSummary(
            total=row.total,
            healthy=row.healthy,
            unhealthy=row.unhealthy,
            unchecked=row.unchecked,
            last_full_check=row.last_check.isoformat() if row.last_check else None,
        )


    async def get_documentation_coverage(self, db: AsyncSession) -> DocumentationCoverage:
        total = (await db.execute(select(func.count(Server.id)))).scalar() or 0
        documented = (await db.execute(
            select(func.count(Server.id)).where(
                Server.documentation.isnot(None),
                Server.documentation != "",
            )
        )).scalar() or 0

        undocumented_stmt = (
            select(Server.id, Server.name)
            .where(
                (Server.documentation.is_(None)) | (Server.documentation == "")
            )
            .order_by(Server.name)
            .limit(50)
        )
        result = await db.execute(undocumented_stmt)
        undocumented = [
            UndocumentedServer(id=row.id, name=row.name)
            for row in result.all()
        ]

        return DocumentationCoverage(
            total=total,
            documented=documented,
            undocumented_servers=undocumented,
        )


    async def get_efficiency_metrics(self, db: AsyncSession) -> list:
        from app.schemas.dashboard import EfficiencyMetric
        stmt = (
            select(
                func.coalesce(Provider.name, "Unassigned").label("provider_name"),
                func.sum(Server.monthly_cost).label("total_cost"),
                func.sum(Server.cpu_cores).label("total_cpu"),
                func.sum(Server.ram_mb).label("total_ram_mb"),
                func.sum(Server.disk_gb).label("total_disk_gb"),
                func.count(Server.id).label("server_count"),
            )
            .outerjoin(Provider, Provider.id == Server.provider_id)
            .where(Server.monthly_cost.isnot(None), Server.monthly_cost > 0)
            .group_by("provider_name")
            .order_by(func.sum(Server.monthly_cost).desc())
        )
        result = await db.execute(stmt)
        metrics = []
        for row in result.all():
            cost = float(row.total_cost) if row.total_cost else 0
            cpu = row.total_cpu or 0
            ram_gb = (row.total_ram_mb or 0) / 1024
            disk = row.total_disk_gb or 0
            count = row.server_count or 0
            metrics.append(EfficiencyMetric(
                provider_name=row.provider_name,
                cost_per_cpu=round(cost / cpu, 2) if cpu > 0 else None,
                cost_per_gb_ram=round(cost / ram_gb, 2) if ram_gb > 0 else None,
                cost_per_gb_disk=round(cost / disk, 2) if disk > 0 else None,
                avg_cost_per_server=round(cost / count, 2) if count > 0 else None,
                server_count=count,
            ))
        return metrics


dashboard_crud = DashboardCRUD()
