from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crud.base import CRUDBase
from app.models.provider import Provider
from app.models.server import Server


class ProviderCRUD(CRUDBase[Provider]):
    async def get_multi(self, db: AsyncSession, skip: int = 0, limit: int = 100) -> list[dict]:
        stmt = (
            select(Provider, func.count(Server.id).label("server_count"))
            .outerjoin(Server, Provider.id == Server.provider_id)
            .group_by(Provider.id)
            .offset(skip).limit(limit)
        )
        result = await db.execute(stmt)
        rows = result.all()
        out = []
        for provider, count in rows:
            out.append({"provider": provider, "server_count": count})
        return out

    async def get_with_servers(self, db: AsyncSession, id: int) -> Provider | None:
        stmt = select(Provider).where(Provider.id == id).options(selectinload(Provider.servers))
        result = await db.execute(stmt)
        return result.scalar_one_or_none()


provider_crud = ProviderCRUD(Provider)
