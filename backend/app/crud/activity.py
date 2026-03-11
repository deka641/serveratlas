import json
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

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
            changes=json.dumps({k: str(v) for k, v in changes.items()}) if changes else None,
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

    async def get_multi(
        self, db: AsyncSession,
        entity_type: str | None = None, entity_id: int | None = None,
        skip: int = 0, limit: int = 50,
    ) -> list[Activity]:
        stmt = select(Activity)
        if entity_type:
            stmt = stmt.where(Activity.entity_type == entity_type)
        if entity_id:
            stmt = stmt.where(Activity.entity_id == entity_id)
        stmt = stmt.order_by(Activity.created_at.desc()).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def count_filtered(
        self, db: AsyncSession,
        entity_type: str | None = None, entity_id: int | None = None,
    ) -> int:
        stmt = select(func.count(Activity.id))
        if entity_type:
            stmt = stmt.where(Activity.entity_type == entity_type)
        if entity_id:
            stmt = stmt.where(Activity.entity_id == entity_id)
        result = await db.execute(stmt)
        return result.scalar() or 0


activity_crud = ActivityCRUD()
