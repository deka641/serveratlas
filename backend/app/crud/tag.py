from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.models.tag import Tag, ServerTag


class TagCRUD(CRUDBase[Tag]):
    async def get_by_name(self, db: AsyncSession, name: str) -> Tag | None:
        result = await db.execute(select(Tag).where(Tag.name == name))
        return result.scalar_one_or_none()

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


tag_crud = TagCRUD(Tag)
