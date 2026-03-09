from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import ssh_connection_crud
from app.database import get_db
from app.schemas.ssh_connection import (
    ConnectivityGraph, SshConnectionCreate, SshConnectionRead, SshConnectionUpdate,
)

router = APIRouter(prefix="/ssh-connections", tags=["ssh-connections"])


def _conn_to_read(c) -> dict:
    return {
        **{k: v for k, v in c.__dict__.items() if not k.startswith("_")},
        "source_server_name": c.source_server.name if c.source_server else None,
        "target_server_name": c.target_server.name if c.target_server else None,
        "ssh_key_name": c.ssh_key.name if c.ssh_key else None,
    }


@router.get("", response_model=list[SshConnectionRead])
async def list_ssh_connections(skip: int = Query(0, ge=0), limit: int = Query(100, ge=0, le=500), search: str | None = None, db: AsyncSession = Depends(get_db)):
    connections = await ssh_connection_crud.get_multi(db, skip=skip, limit=limit, search=search)
    return [SshConnectionRead.model_validate(_conn_to_read(c)) for c in connections]


@router.get("/graph", response_model=ConnectivityGraph)
async def get_graph(db: AsyncSession = Depends(get_db)):
    return await ssh_connection_crud.get_graph_data(db)


@router.get("/{id}", response_model=SshConnectionRead)
async def get_ssh_connection(id: int, db: AsyncSession = Depends(get_db)):
    conn = await ssh_connection_crud.get_detail(db, id)
    if not conn:
        raise HTTPException(404, "SSH Connection not found")
    return SshConnectionRead.model_validate(_conn_to_read(conn))


@router.post("", response_model=SshConnectionRead, status_code=201)
async def create_ssh_connection(data: SshConnectionCreate, db: AsyncSession = Depends(get_db)):
    conn = await ssh_connection_crud.create(db, data.model_dump())
    conn_detail = await ssh_connection_crud.get_detail(db, conn.id)
    return SshConnectionRead.model_validate(_conn_to_read(conn_detail))


@router.put("/{id}", response_model=SshConnectionRead)
async def update_ssh_connection(id: int, data: SshConnectionUpdate, db: AsyncSession = Depends(get_db)):
    updated = await ssh_connection_crud.update(db, id, data.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(404, "SSH Connection not found")
    conn_detail = await ssh_connection_crud.get_detail(db, updated.id)
    return SshConnectionRead.model_validate(_conn_to_read(conn_detail))


@router.delete("/{id}", status_code=204)
async def delete_ssh_connection(id: int, db: AsyncSession = Depends(get_db)):
    deleted = await ssh_connection_crud.delete(db, id)
    if not deleted:
        raise HTTPException(404, "SSH Connection not found")
