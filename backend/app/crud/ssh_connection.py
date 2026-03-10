from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crud.base import CRUDBase
from app.crud.utils import escape_like as _escape_like
from app.models.server import Server
from app.models.ssh_connection import SshConnection
from app.schemas.ssh_connection import ConnectivityGraph, GraphEdge, GraphNode


class SshConnectionCRUD(CRUDBase[SshConnection]):
    async def get_multi(self, db: AsyncSession, skip: int = 0, limit: int = 100, search: str | None = None) -> list[SshConnection]:
        stmt = (
            select(SshConnection)
            .options(
                selectinload(SshConnection.source_server),
                selectinload(SshConnection.target_server),
                selectinload(SshConnection.ssh_key),
            )
        )
        if search:
            escaped = _escape_like(search)
            stmt = stmt.where(
                SshConnection.purpose.ilike(f"%{escaped}%", escape="\\") |
                SshConnection.ssh_user.ilike(f"%{escaped}%", escape="\\")
            )
        stmt = stmt.offset(skip).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def count_filtered(
        self, db: AsyncSession, search: str | None = None,
    ) -> int:
        stmt = select(func.count(SshConnection.id))
        if search:
            escaped = _escape_like(search)
            stmt = stmt.where(
                SshConnection.purpose.ilike(f"%{escaped}%", escape="\\") |
                SshConnection.ssh_user.ilike(f"%{escaped}%", escape="\\")
            )
        result = await db.execute(stmt)
        return result.scalar() or 0

    async def get_detail(self, db: AsyncSession, id: int) -> SshConnection | None:
        stmt = (
            select(SshConnection)
            .where(SshConnection.id == id)
            .options(
                selectinload(SshConnection.source_server),
                selectinload(SshConnection.target_server),
                selectinload(SshConnection.ssh_key),
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_server(self, db: AsyncSession, server_id: int) -> list[SshConnection]:
        stmt = (
            select(SshConnection)
            .where(
                (SshConnection.source_server_id == server_id) |
                (SshConnection.target_server_id == server_id)
            )
            .options(
                selectinload(SshConnection.source_server),
                selectinload(SshConnection.target_server),
            )
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_graph_data(self, db: AsyncSession) -> ConnectivityGraph:
        conn_result = await db.execute(select(SshConnection))
        connections = list(conn_result.scalars().all())

        server_ids = set()
        for c in connections:
            server_ids.add(c.source_server_id)
            server_ids.add(c.target_server_id)

        nodes = []
        if server_ids:
            server_result = await db.execute(
                select(Server).where(Server.id.in_(server_ids))
            )
            servers = server_result.scalars().all()
            nodes = [
                GraphNode(id=s.id, name=s.name, status=s.status.value, ip_v4=s.ip_v4)
                for s in servers
            ]

        edges = [
            GraphEdge(
                source=c.source_server_id,
                target=c.target_server_id,
                ssh_user=c.ssh_user,
                purpose=c.purpose,
            )
            for c in connections
        ]

        return ConnectivityGraph(nodes=nodes, edges=edges)


ssh_connection_crud = SshConnectionCRUD(SshConnection)
