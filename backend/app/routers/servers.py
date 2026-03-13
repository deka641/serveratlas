import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import application_crud, server_crud, ssh_connection_crud, ssh_key_crud
from app.crud.activity import activity_crud
from app.limiter import limiter

logger = logging.getLogger(__name__)
from app.database import get_db
from app.schemas.application import ApplicationRead
from app.schemas.server import HealthCheckUpdate, ServerCreate, ServerRead, ServerReadDetail, ServerUpdate
from app.schemas.server_ssh_key import ServerSshKeyCreate, ServerSshKeyRead
from app.schemas.ssh_connection import SshConnectionRead

router = APIRouter(prefix="/servers", tags=["servers"])


class BulkDeleteRequest(BaseModel):
    ids: list[int]


def _server_to_read(server) -> dict:
    d = {
        "id": server.id, "name": server.name, "provider_id": server.provider_id,
        "hostname": server.hostname, "ip_v4": server.ip_v4, "ip_v6": server.ip_v6,
        "os": server.os, "cpu_cores": server.cpu_cores, "ram_mb": server.ram_mb,
        "disk_gb": server.disk_gb, "location": server.location, "datacenter": server.datacenter,
        "status": server.status.value if server.status else "active",
        "monthly_cost": server.monthly_cost, "cost_currency": server.cost_currency,
        "login_user": server.login_user, "login_notes": server.login_notes,
        "notes": server.notes,
        "last_checked_at": server.last_checked_at, "last_check_status": server.last_check_status,
        "response_time_ms": server.response_time_ms,
        "created_at": server.created_at, "updated_at": server.updated_at,
        "provider_name": server.provider.name if server.provider else None,
        "tags": [
            {"id": st.tag.id, "name": st.tag.name, "color": st.tag.color}
            for st in (server.server_tags if hasattr(server, 'server_tags') and server.server_tags else [])
        ],
    }
    return d


@router.get("")
async def list_servers(
    skip: int = Query(0, ge=0), limit: int = Query(100, ge=0, le=500),
    status: str | None = None, provider_id: int | None = None, search: str | None = None,
    tag_id: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    servers = await server_crud.get_multi_filtered(db, skip=skip, limit=limit, status=status, provider_id=provider_id, search=search, tag_id=tag_id)
    total = await server_crud.count_filtered(db, status=status, provider_id=provider_id, search=search, tag_id=tag_id)
    data = [ServerRead.model_validate(_server_to_read(s)).model_dump(mode="json") for s in servers]
    return JSONResponse(content=data, headers={"X-Total-Count": str(total)})


@router.post("/bulk-delete", status_code=204)
@limiter.limit("30/minute")
async def bulk_delete_servers(request: Request, body: BulkDeleteRequest, db: AsyncSession = Depends(get_db)):
    for server_id in body.ids[:100]:
        await server_crud.delete(db, server_id)


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
@limiter.limit("30/minute")
async def create_server(request: Request, data: ServerCreate, db: AsyncSession = Depends(get_db)):
    created = await server_crud.create(db, data.model_dump())
    server = await server_crud.get_with_provider(db, created.id)
    try:
        await activity_crud.log_activity(db, "server", server.id, data.name, "created")
    except Exception:
        logger.warning("Failed to log activity for server create %s", server.id, exc_info=True)
    return _server_to_read(server)


@router.put("/{id}", response_model=ServerRead)
@limiter.limit("30/minute")
async def update_server(request: Request, id: int, data: ServerUpdate, db: AsyncSession = Depends(get_db)):
    old = await server_crud.get(db, id)
    if not old:
        raise HTTPException(404, "Server not found")
    update_fields = data.model_dump(exclude_unset=True)
    changes = {}
    for key, new_val in update_fields.items():
        old_val = getattr(old, key, None)
        if hasattr(old_val, 'value'):
            old_val = old_val.value
        if str(old_val) != str(new_val):
            changes[key] = {"old": str(old_val), "new": str(new_val)}
    updated = await server_crud.update(db, id, update_fields)
    server = await server_crud.get_with_provider(db, updated.id)
    try:
        await activity_crud.log_activity(db, "server", id, data.name or server.name, "updated", changes or update_fields)
    except Exception:
        logger.warning("Failed to log activity for server update %s", id, exc_info=True)
    return _server_to_read(server)


@router.delete("/{id}", status_code=204)
@limiter.limit("30/minute")
async def delete_server(request: Request, id: int, db: AsyncSession = Depends(get_db)):
    server = await server_crud.get(db, id)
    if not server:
        raise HTTPException(404, "Server not found")
    await server_crud.delete(db, id)
    try:
        await activity_crud.log_activity(db, "server", id, server.name, "deleted")
    except Exception:
        logger.warning("Failed to log activity for server delete %s", id, exc_info=True)


@router.get("/{id}/applications", response_model=list[ApplicationRead])
async def get_server_applications(id: int, db: AsyncSession = Depends(get_db)):
    server = await server_crud.get(db, id)
    if not server:
        raise HTTPException(404, "Server not found")
    apps = await application_crud.get_by_server(db, id)
    return [
        ApplicationRead.model_validate({**a.__dict__, "server_name": server.name})
        for a in apps
    ]


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
    ssh_key = await ssh_key_crud.get(db, key_id)
    server_obj = await server_crud.get(db, id)
    return ServerSshKeyRead.model_validate({
        **assoc.__dict__,
        "ssh_key_name": ssh_key.name if ssh_key else None,
        "server_name": server_obj.name if server_obj else None,
    })


@router.delete("/{id}/ssh-keys/{key_id}", status_code=204)
async def remove_server_ssh_key(id: int, key_id: int, db: AsyncSession = Depends(get_db)):
    removed = await server_crud.remove_ssh_key(db, id, key_id)
    if not removed:
        raise HTTPException(404, "Association not found")


@router.post("/{id}/health-check", response_model=ServerRead)
@limiter.limit("30/minute")
async def update_health_check(request: Request, id: int, data: HealthCheckUpdate, db: AsyncSession = Depends(get_db)):
    from datetime import datetime
    server = await server_crud.get(db, id)
    if not server:
        raise HTTPException(404, "Server not found")
    update_data = {
        "last_checked_at": datetime.utcnow(),
        "last_check_status": data.status,
        "response_time_ms": data.response_time_ms,
    }
    await server_crud.update(db, id, update_data)
    server = await server_crud.get_with_provider(db, id)
    return _server_to_read(server)


@router.post("/{id}/run-health-check", response_model=ServerRead)
@limiter.limit("30/minute")
async def run_health_check(request: Request, id: int, db: AsyncSession = Depends(get_db)):
    import asyncio
    import socket
    import time
    from datetime import datetime

    server = await server_crud.get(db, id)
    if not server:
        raise HTTPException(404, "Server not found")

    host = server.ip_v4 or server.hostname
    if not host:
        raise HTTPException(400, "Server has no IP address or hostname configured")

    port = 22
    status = "unhealthy"
    response_time_ms = None

    try:
        start = time.monotonic()
        loop = asyncio.get_event_loop()
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        await loop.run_in_executor(None, sock.connect, (host, port))
        elapsed = time.monotonic() - start
        response_time_ms = int(elapsed * 1000)
        status = "healthy"
        sock.close()
    except (OSError, socket.timeout, ConnectionRefusedError):
        status = "unhealthy"

    update_data = {
        "last_checked_at": datetime.utcnow(),
        "last_check_status": status,
        "response_time_ms": response_time_ms,
    }
    await server_crud.update(db, id, update_data)
    server = await server_crud.get_with_provider(db, id)
    return _server_to_read(server)
