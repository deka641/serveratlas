from datetime import datetime, timedelta

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.health_check import HealthCheck


class HealthCheckCRUD:
    async def create(self, db: AsyncSession, server_id: int, status: str, response_time_ms: int | None = None) -> HealthCheck:
        record = HealthCheck(
            server_id=server_id,
            status=status,
            response_time_ms=response_time_ms,
            checked_at=datetime.utcnow(),
        )
        db.add(record)
        await db.flush()
        return record

    async def get_by_server(
        self, db: AsyncSession, server_id: int, limit: int = 50, since: datetime | None = None
    ) -> list[HealthCheck]:
        stmt = (
            select(HealthCheck)
            .where(HealthCheck.server_id == server_id)
            .order_by(HealthCheck.checked_at.desc())
            .limit(limit)
        )
        if since:
            stmt = stmt.where(HealthCheck.checked_at >= since)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_uptime_stats(self, db: AsyncSession, server_id: int, days: int = 30) -> dict:
        since = datetime.utcnow() - timedelta(days=days)
        stmt = select(
            func.count(HealthCheck.id).label("total_checks"),
            func.count(
                case((HealthCheck.status == "healthy", HealthCheck.id), else_=None)
            ).label("healthy_checks"),
            func.avg(HealthCheck.response_time_ms).label("avg_response_ms"),
        ).where(
            HealthCheck.server_id == server_id,
            HealthCheck.checked_at >= since,
        )
        row = (await db.execute(stmt)).one()
        total = row.total_checks or 0
        healthy = row.healthy_checks or 0
        uptime_pct = round((healthy / total) * 100, 1) if total > 0 else None
        return {
            "total_checks": total,
            "healthy_checks": healthy,
            "uptime_pct": uptime_pct,
            "avg_response_ms": round(row.avg_response_ms) if row.avg_response_ms else None,
            "period_days": days,
        }

    async def cleanup(self, db: AsyncSession, retention_days: int = 90) -> int:
        cutoff = datetime.utcnow() - timedelta(days=retention_days)
        stmt = select(HealthCheck).where(HealthCheck.checked_at < cutoff)
        result = await db.execute(stmt)
        records = result.scalars().all()
        count = len(records)
        for r in records:
            await db.delete(r)
        await db.flush()
        return count


health_check_crud = HealthCheckCRUD()
