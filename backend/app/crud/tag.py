from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.crud.utils import escape_like
from app.models.tag import Tag, ServerTag


class TagCRUD(CRUDBase[Tag]):
    async def get_by_name(self, db: AsyncSession, name: str) -> Tag | None:
        result = await db.execute(select(Tag).where(Tag.name == name))
        return result.scalar_one_or_none()

    async def get_multi_filtered(self, db: AsyncSession, skip: int = 0, limit: int = 500, search: str | None = None) -> list[Tag]:
        stmt = select(Tag)
        if search:
            escaped = escape_like(search)
            stmt = stmt.where(Tag.name.ilike(f"%{escaped}%", escape="\\"))
        stmt = stmt.order_by(Tag.name).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def count_filtered(self, db: AsyncSession, search: str | None = None) -> int:
        stmt = select(func.count(Tag.id))
        if search:
            escaped = escape_like(search)
            stmt = stmt.where(Tag.name.ilike(f"%{escaped}%", escape="\\"))
        result = await db.execute(stmt)
        return result.scalar() or 0

    async def add_tag_to_server(self, db: AsyncSession, server_id: int, tag_id: int) -> ServerTag:
        assoc = ServerTag(server_id=server_id, tag_id=tag_id)
        db.add(assoc)
        await db.flush()
        return assoc

    async def remove_tag_from_server(self, db: AsyncSession, server_id: int, tag_id: int) -> bool:
        result = await db.execute(
            select(ServerTag).where(ServerTag.server_id == server_id, ServerTag.tag_id == tag_id)
        )
        assoc = result.scalar_one_or_none()
        if not assoc:
            return False
        await db.delete(assoc)
        await db.flush()
        return True

    async def get_server_count(self, db: AsyncSession, tag_id: int) -> int:
        result = await db.execute(
            select(func.count(ServerTag.server_id)).where(ServerTag.tag_id == tag_id)
        )
        return result.scalar() or 0


tag_crud = TagCRUD(Tag)
