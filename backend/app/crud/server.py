from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crud.base import CRUDBase
from app.crud.utils import escape_like as _escape_like
from app.models.provider import Provider
from app.models.server import Server
from app.models.server_ssh_key import ServerSshKey
from app.models.tag import ServerTag


class ServerCRUD(CRUDBase[Server]):
    def _apply_range_filters(self, stmt, **kwargs):
        """Apply numeric range filters to a query statement."""
        range_map = {
            'ram_min': (Server.ram_mb, '>='),
            'ram_max': (Server.ram_mb, '<='),
            'cpu_min': (Server.cpu_cores, '>='),
            'cpu_max': (Server.cpu_cores, '<='),
            'disk_min': (Server.disk_gb, '>='),
            'disk_max': (Server.disk_gb, '<='),
            'cost_min': (Server.monthly_cost, '>='),
            'cost_max': (Server.monthly_cost, '<='),
        }
        for key, (col, op) in range_map.items():
            val = kwargs.get(key)
            if val is not None:
                if op == '>=':
                    stmt = stmt.where(col >= val)
                else:
                    stmt = stmt.where(col <= val)
        return stmt

    async def get_multi_filtered(
        self, db: AsyncSession, skip: int = 0, limit: int = 100,
        status: str | None = None, provider_id: int | None = None,
        search: str | None = None, tag_id: int | None = None,
        stale: bool | None = None,
        ram_min: int | None = None, ram_max: int | None = None,
        cpu_min: int | None = None, cpu_max: int | None = None,
        disk_min: int | None = None, disk_max: int | None = None,
        cost_min: float | None = None, cost_max: float | None = None,
    ) -> list[Server]:
        stmt = select(Server).outerjoin(Provider).options(
            selectinload(Server.provider),
            selectinload(Server.server_tags).selectinload(ServerTag.tag),
        )
        if status:
            stmt = stmt.where(Server.status == status)
        if provider_id:
            stmt = stmt.where(Server.provider_id == provider_id)
        if tag_id:
            stmt = stmt.join(ServerTag, ServerTag.server_id == Server.id).where(ServerTag.tag_id == tag_id)
        if search:
            escaped = _escape_like(search)
            stmt = stmt.where(
                Server.name.ilike(f"%{escaped}%", escape="\\") |
                Server.hostname.ilike(f"%{escaped}%", escape="\\") |
                Server.ip_v4.ilike(f"%{escaped}%", escape="\\")
            )
        if stale:
            cutoff = datetime.utcnow() - timedelta(days=90)
            stmt = stmt.where(
                or_(Server.last_audited_at.is_(None), Server.last_audited_at < cutoff)
            )
        stmt = self._apply_range_filters(
            stmt, ram_min=ram_min, ram_max=ram_max, cpu_min=cpu_min, cpu_max=cpu_max,
            disk_min=disk_min, disk_max=disk_max, cost_min=cost_min, cost_max=cost_max,
        )
        stmt = stmt.offset(skip).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def count_filtered(
        self, db: AsyncSession,
        status: str | None = None, provider_id: int | None = None,
        search: str | None = None, tag_id: int | None = None,
        stale: bool | None = None,
        ram_min: int | None = None, ram_max: int | None = None,
        cpu_min: int | None = None, cpu_max: int | None = None,
        disk_min: int | None = None, disk_max: int | None = None,
        cost_min: float | None = None, cost_max: float | None = None,
    ) -> int:
        stmt = select(func.count(Server.id))
        if status:
            stmt = stmt.where(Server.status == status)
        if provider_id:
            stmt = stmt.where(Server.provider_id == provider_id)
        if tag_id:
            stmt = stmt.join(ServerTag, ServerTag.server_id == Server.id).where(ServerTag.tag_id == tag_id)
        if search:
            escaped = _escape_like(search)
            stmt = stmt.where(
                Server.name.ilike(f"%{escaped}%", escape="\\") |
                Server.hostname.ilike(f"%{escaped}%", escape="\\") |
                Server.ip_v4.ilike(f"%{escaped}%", escape="\\")
            )
        if stale:
            cutoff = datetime.utcnow() - timedelta(days=90)
            stmt = stmt.where(
                or_(Server.last_audited_at.is_(None), Server.last_audited_at < cutoff)
            )
        stmt = self._apply_range_filters(
            stmt, ram_min=ram_min, ram_max=ram_max, cpu_min=cpu_min, cpu_max=cpu_max,
            disk_min=disk_min, disk_max=disk_max, cost_min=cost_min, cost_max=cost_max,
        )
        result = await db.execute(stmt)
        return result.scalar() or 0

    async def get_with_provider(self, db: AsyncSession, id: int) -> Server | None:
        stmt = (
            select(Server)
            .where(Server.id == id)
            .options(
                selectinload(Server.provider),
                selectinload(Server.server_tags).selectinload(ServerTag.tag),
            )
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
                selectinload(Server.server_tags).selectinload(ServerTag.tag),
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
