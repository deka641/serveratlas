from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.backup import Backup, BackupStatus
from app.models.server import Server, ServerStatus
from app.models.snapshot import InfrastructureSnapshot


class SnapshotCRUD:
    async def create_snapshot(self, db: AsyncSession) -> InfrastructureSnapshot:
        """Capture current infrastructure metrics as a snapshot."""
        # Server counts
        server_stmt = select(
            func.count(Server.id).label("total"),
            func.count(Server.id).filter(Server.status == ServerStatus.active).label("active"),
            func.count(Server.id).filter(Server.last_check_status == "healthy").label("healthy"),
            func.count(Server.id).filter(Server.last_check_status == "unhealthy").label("unhealthy"),
            func.coalesce(func.sum(Server.monthly_cost), 0).label("total_cost"),
        )
        row = (await db.execute(server_stmt)).one()

        total = row.total or 0

        # Backup coverage: % of active servers that have at least one backup
        if total > 0:
            servers_with_backup = (await db.execute(
                select(func.count(func.distinct(Backup.source_server_id)))
                .where(Backup.last_run_status != BackupStatus.never_run)
            )).scalar() or 0
            backup_pct = round((servers_with_backup / total) * 100, 2)
        else:
            backup_pct = 0

        # Documentation coverage: % of servers with non-null, non-empty documentation
        if total > 0:
            doc_count = (await db.execute(
                select(func.count(Server.id))
                .where(Server.documentation.isnot(None))
                .where(Server.documentation != "")
            )).scalar() or 0
            doc_pct = round((doc_count / total) * 100, 2)
        else:
            doc_pct = 0

        # Audit compliance: % of servers audited in last 90 days
        if total > 0:
            cutoff = datetime.utcnow() - timedelta(days=90)
            audited = (await db.execute(
                select(func.count(Server.id))
                .where(Server.last_audited_at.isnot(None))
                .where(Server.last_audited_at >= cutoff)
            )).scalar() or 0
            audit_pct = round((audited / total) * 100, 2)
        else:
            audit_pct = 0

        snapshot = InfrastructureSnapshot(
            total_servers=total,
            active_servers=row.active or 0,
            healthy_count=row.healthy or 0,
            unhealthy_count=row.unhealthy or 0,
            total_monthly_cost=row.total_cost,
            backup_coverage_pct=backup_pct,
            documentation_coverage_pct=doc_pct,
            audit_compliance_pct=audit_pct,
        )
        db.add(snapshot)
        await db.flush()
        return snapshot

    async def get_recent(self, db: AsyncSession, days: int = 30) -> list[InfrastructureSnapshot]:
        cutoff = datetime.utcnow() - timedelta(days=days)
        stmt = (
            select(InfrastructureSnapshot)
            .where(InfrastructureSnapshot.snapshot_date >= cutoff)
            .order_by(InfrastructureSnapshot.snapshot_date.asc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_latest(self, db: AsyncSession) -> InfrastructureSnapshot | None:
        stmt = select(InfrastructureSnapshot).order_by(InfrastructureSnapshot.snapshot_date.desc()).limit(1)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()


snapshot_crud = SnapshotCRUD()
