from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import ssh_connection_crud
from app.crud.activity import activity_crud

limiter = Limiter(key_func=get_remote_address)
from app.database import get_db
from app.schemas.ssh_connection import (
    ConnectivityGraph, SshConnectionCreate, SshConnectionRead, SshConnectionUpdate,
)

router = APIRouter(prefix="/ssh-connections", tags=["ssh-connections"])


class BulkDeleteRequest(BaseModel):
    ids: list[int]


def _conn_to_read(c) -> dict:
    return {
        **{k: v for k, v in c.__dict__.items() if not k.startswith("_")},
        "source_server_name": c.source_server.name if c.source_server else None,
        "target_server_name": c.target_server.name if c.target_server else None,
        "ssh_key_name": c.ssh_key.name if c.ssh_key else None,
    }


@router.get("")
async def list_ssh_connections(skip: int = Query(0, ge=0), limit: int = Query(100, ge=0, le=500), search: str | None = None, db: AsyncSession = Depends(get_db)):
    connections = await ssh_connection_crud.get_multi(db, skip=skip, limit=limit, search=search)
    total = await ssh_connection_crud.count_filtered(db, search=search)
    data = [SshConnectionRead.model_validate(_conn_to_read(c)).model_dump(mode="json") for c in connections]
    return JSONResponse(content=data, headers={"X-Total-Count": str(total)})


@router.post("/bulk-delete", status_code=204)
@limiter.limit("30/minute")
async def bulk_delete_ssh_connections(request: Request, body: BulkDeleteRequest, db: AsyncSession = Depends(get_db)):
    for conn_id in body.ids[:100]:
        await ssh_connection_crud.delete(db, conn_id)


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
@limiter.limit("30/minute")
async def create_ssh_connection(request: Request, data: SshConnectionCreate, db: AsyncSession = Depends(get_db)):
    conn = await ssh_connection_crud.create(db, data.model_dump())
    conn_detail = await ssh_connection_crud.get_detail(db, conn.id)
    conn_name = f"{conn_detail.source_server.name} -> {conn_detail.target_server.name}" if conn_detail.source_server and conn_detail.target_server else f"Connection #{conn.id}"
    await activity_crud.log_activity(db, "ssh_connection", conn.id, conn_name, "created")
    return SshConnectionRead.model_validate(_conn_to_read(conn_detail))


@router.put("/{id}", response_model=SshConnectionRead)
@limiter.limit("30/minute")
async def update_ssh_connection(request: Request, id: int, data: SshConnectionUpdate, db: AsyncSession = Depends(get_db)):
    updated = await ssh_connection_crud.update(db, id, data.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(404, "SSH Connection not found")
    conn_detail = await ssh_connection_crud.get_detail(db, updated.id)
    conn_name = f"{conn_detail.source_server.name} -> {conn_detail.target_server.name}" if conn_detail.source_server and conn_detail.target_server else f"Connection #{id}"
    await activity_crud.log_activity(db, "ssh_connection", id, conn_name, "updated", data.model_dump(exclude_unset=True))
    return SshConnectionRead.model_validate(_conn_to_read(conn_detail))


@router.delete("/{id}", status_code=204)
@limiter.limit("30/minute")
async def delete_ssh_connection(request: Request, id: int, db: AsyncSession = Depends(get_db)):
    conn_detail = await ssh_connection_crud.get_detail(db, id)
    if not conn_detail:
        raise HTTPException(404, "SSH Connection not found")
    conn_name = f"{conn_detail.source_server.name} -> {conn_detail.target_server.name}" if conn_detail.source_server and conn_detail.target_server else f"Connection #{id}"
    await ssh_connection_crud.delete(db, id)
    await activity_crud.log_activity(db, "ssh_connection", id, conn_name, "deleted")
