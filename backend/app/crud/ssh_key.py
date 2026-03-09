from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crud.base import CRUDBase
from app.models.server_ssh_key import ServerSshKey
from app.models.ssh_key import SshKey


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


class SshKeyCRUD(CRUDBase[SshKey]):
    async def get_multi_filtered(
        self, db: AsyncSession, skip: int = 0, limit: int = 100,
        search: str | None = None,
    ) -> list[SshKey]:
        stmt = select(SshKey)
        if search:
            escaped = _escape_like(search)
            stmt = stmt.where(
                SshKey.name.ilike(f"%{escaped}%", escape="\\") |
                SshKey.fingerprint.ilike(f"%{escaped}%", escape="\\")
            )
        stmt = stmt.offset(skip).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_with_servers(self, db: AsyncSession, id: int) -> SshKey | None:
        stmt = (
            select(SshKey)
            .where(SshKey.id == id)
            .options(selectinload(SshKey.server_ssh_keys).selectinload(ServerSshKey.server))
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()


ssh_key_crud = SshKeyCRUD(SshKey)
