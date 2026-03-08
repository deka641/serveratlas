from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crud.base import CRUDBase
from app.models.backup import Backup, BackupStatus


class BackupCRUD(CRUDBase[Backup]):
    async def get_multi_filtered(
        self, db: AsyncSession, skip: int = 0, limit: int = 100,
        source_server_id: int | None = None, application_id: int | None = None,
        status: str | None = None,
    ) -> list[Backup]:
        stmt = select(Backup).options(
            selectinload(Backup.application),
            selectinload(Backup.source_server),
            selectinload(Backup.target_server),
        )
        if source_server_id:
            stmt = stmt.where(Backup.source_server_id == source_server_id)
        if application_id:
            stmt = stmt.where(Backup.application_id == application_id)
        if status:
            stmt = stmt.where(Backup.last_run_status == status)
        stmt = stmt.offset(skip).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_detail(self, db: AsyncSession, id: int) -> Backup | None:
        stmt = (
            select(Backup)
            .where(Backup.id == id)
            .options(
                selectinload(Backup.application),
                selectinload(Backup.source_server),
                selectinload(Backup.target_server),
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_server(self, db: AsyncSession, server_id: int) -> list[Backup]:
        stmt = select(Backup).where(
            (Backup.source_server_id == server_id) | (Backup.target_server_id == server_id)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_by_application(self, db: AsyncSession, application_id: int) -> list[Backup]:
        stmt = select(Backup).where(Backup.application_id == application_id)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_failing(self, db: AsyncSession) -> list[Backup]:
        stmt = select(Backup).where(Backup.last_run_status == BackupStatus.failed)
        result = await db.execute(stmt)
        return list(result.scalars().all())


backup_crud = BackupCRUD(Backup)
