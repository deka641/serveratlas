from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.application import Application
from app.models.backup import Backup, BackupStatus
from app.models.provider import Provider
from app.models.server import Server, ServerStatus
from app.models.ssh_key import SshKey
from app.schemas.dashboard import CostByProvider, CostSummary, DashboardStats


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
                Provider.name,
                func.coalesce(func.sum(Server.monthly_cost), 0).label("total_cost"),
                func.coalesce(Server.cost_currency, "EUR").label("currency"),
                func.count(Server.id).label("server_count"),
            )
            .join(Server, Provider.id == Server.provider_id)
            .group_by(Provider.name, Server.cost_currency)
        )
        result = await db.execute(stmt)
        rows = result.all()

        by_provider = []
        total = Decimal("0.00")
        for name, cost, currency, count in rows:
            cost_val = Decimal(str(cost))
            total += cost_val
            by_provider.append(CostByProvider(
                provider_name=name, total_cost=cost_val, currency=currency or "EUR", server_count=count
            ))

        return CostSummary(total_monthly_cost=total, by_provider=by_provider)


dashboard_crud = DashboardCRUD()
