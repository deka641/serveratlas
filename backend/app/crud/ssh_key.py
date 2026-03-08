from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crud.base import CRUDBase
from app.models.server_ssh_key import ServerSshKey
from app.models.ssh_key import SshKey


class SshKeyCRUD(CRUDBase[SshKey]):
    async def get_with_servers(self, db: AsyncSession, id: int) -> SshKey | None:
        stmt = (
            select(SshKey)
            .where(SshKey.id == id)
            .options(selectinload(SshKey.server_ssh_keys).selectinload(ServerSshKey.server))
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()


ssh_key_crud = SshKeyCRUD(SshKey)
