from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import application_crud, server_crud, ssh_connection_crud
from app.database import get_db
from app.schemas.application import ApplicationRead
from app.schemas.server import ServerCreate, ServerRead, ServerReadDetail, ServerUpdate
from app.schemas.server_ssh_key import ServerSshKeyCreate, ServerSshKeyRead
from app.schemas.ssh_connection import SshConnectionRead

router = APIRouter(prefix="/servers", tags=["servers"])


def _server_to_read(server) -> dict:
    d = {
        "id": server.id, "name": server.name, "provider_id": server.provider_id,
        "hostname": server.hostname, "ip_v4": server.ip_v4, "ip_v6": server.ip_v6,
        "os": server.os, "cpu_cores": server.cpu_cores, "ram_mb": server.ram_mb,
        "disk_gb": server.disk_gb, "location": server.location, "datacenter": server.datacenter,
        "status": server.status.value if server.status else "active",
        "monthly_cost": server.monthly_cost, "cost_currency": server.cost_currency,
        "login_user": server.login_user, "login_notes": server.login_notes,
        "notes": server.notes, "created_at": server.created_at, "updated_at": server.updated_at,
        "provider_name": server.provider.name if server.provider else None,
    }
    return d


@router.get("", response_model=list[ServerRead])
async def list_servers(
    skip: int = Query(0, ge=0), limit: int = Query(100, ge=0, le=500),
    status: str | None = None, provider_id: int | None = None, search: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    servers = await server_crud.get_multi_filtered(db, skip=skip, limit=limit, status=status, provider_id=provider_id, search=search)
    return [_server_to_read(s) for s in servers]


@router.get("/{id}", response_model=ServerReadDetail)
async def get_server(id: int, db: AsyncSession = Depends(get_db)):
    server = await server_crud.get_detail(db, id)
    if not server:
        raise HTTPException(404, "Server not found")
    d = _server_to_read(server)
    d["applications"] = [
        ApplicationRead.model_validate({
            **a.__dict__, "server_name": server.name,
        }) for a in server.applications
    ]
    d["ssh_keys"] = [
        ServerSshKeyRead.model_validate({
            **sk.__dict__, "ssh_key_name": sk.ssh_key.name if sk.ssh_key else None, "server_name": server.name,
        }) for sk in server.server_ssh_keys
    ]
    return d


@router.post("", response_model=ServerRead, status_code=201)
async def create_server(data: ServerCreate, db: AsyncSession = Depends(get_db)):
    created = await server_crud.create(db, data.model_dump())
    server = await server_crud.get_with_provider(db, created.id)
    return _server_to_read(server)


@router.put("/{id}", response_model=ServerRead)
async def update_server(id: int, data: ServerUpdate, db: AsyncSession = Depends(get_db)):
    updated = await server_crud.update(db, id, data.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(404, "Server not found")
    server = await server_crud.get_with_provider(db, updated.id)
    return _server_to_read(server)


@router.delete("/{id}", status_code=204)
async def delete_server(id: int, db: AsyncSession = Depends(get_db)):
    deleted = await server_crud.delete(db, id)
    if not deleted:
        raise HTTPException(404, "Server not found")


@router.get("/{id}/applications", response_model=list[ApplicationRead])
async def get_server_applications(id: int, db: AsyncSession = Depends(get_db)):
    server = await server_crud.get(db, id)
    if not server:
        raise HTTPException(404, "Server not found")
    return await application_crud.get_by_server(db, id)


@router.get("/{id}/ssh-keys", response_model=list[ServerSshKeyRead])
async def get_server_ssh_keys(id: int, db: AsyncSession = Depends(get_db)):
    server = await server_crud.get_detail(db, id)
    if not server:
        raise HTTPException(404, "Server not found")
    return [
        ServerSshKeyRead.model_validate({
            **sk.__dict__, "ssh_key_name": sk.ssh_key.name if sk.ssh_key else None, "server_name": server.name,
        }) for sk in server.server_ssh_keys
    ]


@router.get("/{id}/connections", response_model=list[SshConnectionRead])
async def get_server_connections(id: int, db: AsyncSession = Depends(get_db)):
    server = await server_crud.get(db, id)
    if not server:
        raise HTTPException(404, "Server not found")
    connections = await ssh_connection_crud.get_by_server(db, id)
    return [
        SshConnectionRead.model_validate({
            **c.__dict__,
            "source_server_name": c.source_server.name if c.source_server else None,
            "target_server_name": c.target_server.name if c.target_server else None,
        }) for c in connections
    ]


@router.post("/{id}/ssh-keys/{key_id}", response_model=ServerSshKeyRead, status_code=201)
async def add_server_ssh_key(
    id: int, key_id: int, data: ServerSshKeyCreate = ServerSshKeyCreate(),
    db: AsyncSession = Depends(get_db),
):
    assoc = await server_crud.add_ssh_key(db, id, key_id, data.model_dump())
    return assoc


@router.delete("/{id}/ssh-keys/{key_id}", status_code=204)
async def remove_server_ssh_key(id: int, key_id: int, db: AsyncSession = Depends(get_db)):
    removed = await server_crud.remove_ssh_key(db, id, key_id)
    if not removed:
        raise HTTPException(404, "Association not found")
