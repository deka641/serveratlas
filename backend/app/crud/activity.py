import json
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.utils import escape_like as _escape_like
from app.models.activity import Activity


class ActivityCRUD:
    async def log_activity(
        self, db: AsyncSession,
        entity_type: str, entity_id: int, entity_name: str,
        action: str, changes: dict[str, Any] | None = None,
    ) -> Activity:
        activity = Activity(
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            action=action,
            changes=json.dumps({k: v if isinstance(v, dict) else str(v) for k, v in changes.items()}) if changes else None,
        )
        db.add(activity)
        await db.flush()
        return activity

    async def get_recent(self, db: AsyncSession, limit: int = 50) -> list[Activity]:
        stmt = select(Activity).order_by(Activity.created_at.desc()).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_by_entity(
        self, db: AsyncSession, entity_type: str, entity_id: int
    ) -> list[Activity]:
        stmt = (
            select(Activity)
            .where(Activity.entity_type == entity_type, Activity.entity_id == entity_id)
            .order_by(Activity.created_at.desc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def count(self, db: AsyncSession) -> int:
        result = await db.execute(select(func.count(Activity.id)))
        return result.scalar() or 0

    def _apply_filters(self, stmt, entity_type=None, entity_id=None, action=None, search=None, date_from=None, date_to=None):
        if entity_type:
            stmt = stmt.where(Activity.entity_type == entity_type)
        if entity_id:
            stmt = stmt.where(Activity.entity_id == entity_id)
        if action:
            stmt = stmt.where(Activity.action == action)
        if search:
            escaped = _escape_like(search)
            stmt = stmt.where(Activity.entity_name.ilike(f"%{escaped}%", escape="\\"))
        if date_from:
            stmt = stmt.where(Activity.created_at >= date_from)
        if date_to:
            stmt = stmt.where(Activity.created_at <= date_to)
        return stmt

    async def get_multi(
        self, db: AsyncSession,
        entity_type: str | None = None, entity_id: int | None = None,
        action: str | None = None, search: str | None = None,
        date_from: datetime | None = None, date_to: datetime | None = None,
        skip: int = 0, limit: int = 50,
    ) -> list[Activity]:
        stmt = select(Activity)
        stmt = self._apply_filters(stmt, entity_type, entity_id, action, search, date_from, date_to)
        stmt = stmt.order_by(Activity.created_at.desc()).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def count_filtered(
        self, db: AsyncSession,
        entity_type: str | None = None, entity_id: int | None = None,
        action: str | None = None, search: str | None = None,
        date_from: datetime | None = None, date_to: datetime | None = None,
    ) -> int:
        stmt = select(func.count(Activity.id))
        stmt = self._apply_filters(stmt, entity_type, entity_id, action, search, date_from, date_to)
        result = await db.execute(stmt)
        return result.scalar() or 0

    async def delete_older_than(self, db: AsyncSession, days: int) -> int:
        from sqlalchemy import delete as sql_delete

        cutoff = datetime.utcnow() - timedelta(days=days)
        result = await db.execute(
            sql_delete(Activity).where(Activity.created_at < cutoff)
        )
        await db.flush()
        return result.rowcount

    async def get_stats(self, db: AsyncSession) -> dict:
        total = (await db.execute(select(func.count(Activity.id)))).scalar() or 0
        oldest_stmt = select(func.min(Activity.created_at))
        oldest = (await db.execute(oldest_stmt)).scalar()
        return {
            "total_count": total,
            "oldest_entry": oldest.isoformat() if oldest else None,
        }


activity_crud = ActivityCRUD()
