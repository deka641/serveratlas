from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crud.base import CRUDBase
from app.crud.utils import escape_like as _escape_like
from app.models.provider import Provider
from app.models.server import Server


class ProviderCRUD(CRUDBase[Provider]):
    async def get_multi(self, db: AsyncSession, skip: int = 0, limit: int = 100, search: str | None = None) -> list[dict]:
        stmt = (
            select(Provider, func.count(Server.id).label("server_count"))
            .outerjoin(Server, Provider.id == Server.provider_id)
            .group_by(Provider.id)
        )
        if search:
            escaped = _escape_like(search)
            stmt = stmt.where(
                Provider.name.ilike(f"%{escaped}%", escape="\\") |
                Provider.website.ilike(f"%{escaped}%", escape="\\")
            )
        stmt = stmt.offset(skip).limit(limit)
        result = await db.execute(stmt)
        rows = result.all()
        out = []
        for provider, count in rows:
            out.append({"provider": provider, "server_count": count})
        return out

    async def count_filtered(
        self, db: AsyncSession, search: str | None = None,
    ) -> int:
        stmt = select(func.count(Provider.id))
        if search:
            escaped = _escape_like(search)
            stmt = stmt.where(
                Provider.name.ilike(f"%{escaped}%", escape="\\") |
                Provider.website.ilike(f"%{escaped}%", escape="\\")
            )
        result = await db.execute(stmt)
        return result.scalar() or 0

    async def get_with_servers(self, db: AsyncSession, id: int) -> Provider | None:
        stmt = select(Provider).where(Provider.id == id).options(selectinload(Provider.servers))
        result = await db.execute(stmt)
        return result.scalar_one_or_none()


provider_crud = ProviderCRUD(Provider)
