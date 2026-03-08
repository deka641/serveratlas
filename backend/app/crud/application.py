from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crud.base import CRUDBase
from app.models.application import Application


class ApplicationCRUD(CRUDBase[Application]):
    async def get_multi_filtered(
        self, db: AsyncSession, skip: int = 0, limit: int = 100,
        server_id: int | None = None, status: str | None = None
    ) -> list[Application]:
        stmt = select(Application).options(selectinload(Application.server))
        if server_id:
            stmt = stmt.where(Application.server_id == server_id)
        if status:
            stmt = stmt.where(Application.status == status)
        stmt = stmt.offset(skip).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_detail(self, db: AsyncSession, id: int) -> Application | None:
        stmt = (
            select(Application)
            .where(Application.id == id)
            .options(
                selectinload(Application.server),
                selectinload(Application.backups),
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_server(self, db: AsyncSession, server_id: int) -> list[Application]:
        stmt = select(Application).where(Application.server_id == server_id)
        result = await db.execute(stmt)
        return list(result.scalars().all())


application_crud = ApplicationCRUD(Application)
