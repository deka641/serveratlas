from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crud.base import CRUDBase
from app.crud.utils import escape_like as _escape_like
from app.models.provider import Provider
from app.models.server import Server
from app.models.server_ssh_key import ServerSshKey


class ServerCRUD(CRUDBase[Server]):
    async def get_multi_filtered(
        self, db: AsyncSession, skip: int = 0, limit: int = 100,
        status: str | None = None, provider_id: int | None = None, search: str | None = None
    ) -> list[Server]:
        stmt = select(Server).outerjoin(Provider).options(selectinload(Server.provider))
        if status:
            stmt = stmt.where(Server.status == status)
        if provider_id:
            stmt = stmt.where(Server.provider_id == provider_id)
        if search:
            escaped = _escape_like(search)
            stmt = stmt.where(
                Server.name.ilike(f"%{escaped}%", escape="\\") |
                Server.hostname.ilike(f"%{escaped}%", escape="\\") |
                Server.ip_v4.ilike(f"%{escaped}%", escape="\\")
            )
        stmt = stmt.offset(skip).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def count_filtered(
        self, db: AsyncSession,
        status: str | None = None, provider_id: int | None = None, search: str | None = None
    ) -> int:
        stmt = select(func.count(Server.id))
        if status:
            stmt = stmt.where(Server.status == status)
        if provider_id:
            stmt = stmt.where(Server.provider_id == provider_id)
        if search:
            escaped = _escape_like(search)
            stmt = stmt.where(
                Server.name.ilike(f"%{escaped}%", escape="\\") |
                Server.hostname.ilike(f"%{escaped}%", escape="\\") |
                Server.ip_v4.ilike(f"%{escaped}%", escape="\\")
            )
        result = await db.execute(stmt)
        return result.scalar() or 0

    async def get_with_provider(self, db: AsyncSession, id: int) -> Server | None:
        stmt = (
            select(Server)
            .where(Server.id == id)
            .options(selectinload(Server.provider))
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_detail(self, db: AsyncSession, id: int) -> Server | None:
        stmt = (
            select(Server)
            .where(Server.id == id)
            .options(
                selectinload(Server.provider),
                selectinload(Server.applications),
                selectinload(Server.server_ssh_keys).selectinload(ServerSshKey.ssh_key),
                selectinload(Server.source_connections),
                selectinload(Server.target_connections),
                selectinload(Server.source_backups),
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def add_ssh_key(
        self, db: AsyncSession, server_id: int, ssh_key_id: int, data: dict[str, Any]
    ) -> ServerSshKey:
        assoc = ServerSshKey(server_id=server_id, ssh_key_id=ssh_key_id, **data)
        db.add(assoc)
        await db.flush()
        await db.refresh(assoc)
        return assoc

    async def remove_ssh_key(self, db: AsyncSession, server_id: int, ssh_key_id: int) -> bool:
        stmt = select(ServerSshKey).where(
            ServerSshKey.server_id == server_id,
            ServerSshKey.ssh_key_id == ssh_key_id,
        )
        result = await db.execute(stmt)
        assoc = result.scalar_one_or_none()
        if not assoc:
            return False
        await db.delete(assoc)
        await db.flush()
        return True


server_crud = ServerCRUD(Server)
