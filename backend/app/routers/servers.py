import asyncio
import logging
import socket
import time
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import select as sa_select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import application_crud, server_crud, ssh_connection_crud, ssh_key_crud
from app.crud.activity import activity_crud
from app.crud.health_check import health_check_crud
from app.database import get_db
from app.limiter import limiter
from app.models.server import Server as ServerModel, ServerStatus
from app.routers.utils import BulkDeleteRequest, bulk_delete_entities, compute_changes
from app.services.webhook_dispatcher import dispatch_event

logger = logging.getLogger(__name__)
from app.schemas.application import ApplicationRead
from app.schemas.dashboard import BatchHealthCheckResult
from app.schemas.server import HealthCheckUpdate, ServerCreate, ServerRead, ServerReadDetail, ServerUpdate
from app.schemas.server_ssh_key import ServerSshKeyCreate, ServerSshKeyRead
from app.schemas.ssh_connection import SshConnectionRead

router = APIRouter(prefix="/servers", tags=["servers"])


class AuditRequest(BaseModel):
    audited_by: str | None = None


def _server_to_read(server) -> dict:
    d = {
        "id": server.id, "name": server.name, "provider_id": server.provider_id,
        "hostname": server.hostname, "ip_v4": server.ip_v4, "ip_v6": server.ip_v6,
        "os": server.os, "cpu_cores": server.cpu_cores, "ram_mb": server.ram_mb,
        "disk_gb": server.disk_gb, "location": server.location, "datacenter": server.datacenter,
        "status": server.status.value if server.status else "active",
        "monthly_cost": server.monthly_cost, "cost_currency": server.cost_currency,
        "login_user": server.login_user, "login_notes": server.login_notes,
        "notes": server.notes, "documentation": server.documentation,
        "last_checked_at": server.last_checked_at, "last_check_status": server.last_check_status,
        "response_time_ms": server.response_time_ms,
        "last_audited_at": server.last_audited_at, "last_audited_by": server.last_audited_by,
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
    skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=500),
    status: str | None = None, provider_id: int | None = None, search: str | None = None,
    tag_id: int | None = None, stale: bool | None = None,
    ram_min: int | None = None, ram_max: int | None = None,
    cpu_min: int | None = None, cpu_max: int | None = None,
    disk_min: int | None = None, disk_max: int | None = None,
    cost_min: float | None = None, cost_max: float | None = None,
    db: AsyncSession = Depends(get_db),
):
    range_kwargs = dict(ram_min=ram_min, ram_max=ram_max, cpu_min=cpu_min, cpu_max=cpu_max,
                        disk_min=disk_min, disk_max=disk_max, cost_min=cost_min, cost_max=cost_max)
    servers = await server_crud.get_multi_filtered(db, skip=skip, limit=limit, status=status, provider_id=provider_id, search=search, tag_id=tag_id, stale=stale, **range_kwargs)
    total = await server_crud.count_filtered(db, status=status, provider_id=provider_id, search=search, tag_id=tag_id, stale=stale, **range_kwargs)
    data = [ServerRead.model_validate(_server_to_read(s)).model_dump(mode="json") for s in servers]
    return JSONResponse(content=data, headers={"X-Total-Count": str(total)})


@router.post("/bulk-delete", status_code=204)
@limiter.limit("30/minute")
async def bulk_delete_servers(request: Request, body: BulkDeleteRequest, db: AsyncSession = Depends(get_db)):
    await bulk_delete_entities(db, server_crud, "server", body.ids)


class ServerImportItem(BaseModel):
    name: str
    hostname: str | None = None
    ip_v4: str | None = None
    ip_v6: str | None = None
    os: str | None = None
    cpu_cores: int | None = None
    ram_mb: int | None = None
    disk_gb: int | None = None
    location: str | None = None
    datacenter: str | None = None
    status: str = "active"
    monthly_cost: float | None = None
    cost_currency: str | None = "EUR"
    provider_name: str | None = None
    login_user: str | None = None
    notes: str | None = None


class ServerImportRequest(BaseModel):
    servers: list[ServerImportItem]
    skip_duplicates: bool = True


class ImportResult(BaseModel):
    created: int = 0
    skipped: int = 0
    errors: list[str] = []
    warnings: list[str] = []


BULK_UPDATE_ALLOWED_FIELDS = {"status", "provider_id", "location", "datacenter"}


class BulkUpdateRequest(BaseModel):
    ids: list[int] = Field(..., max_length=100)
    updates: dict[str, str | int | None]


class BulkUpdateResult(BaseModel):
    updated: int = 0
    errors: list[str] = []


@router.post("/bulk-update", response_model=BulkUpdateResult, status_code=200)
@limiter.limit("30/minute")
async def bulk_update_servers(request: Request, body: BulkUpdateRequest, db: AsyncSession = Depends(get_db)):
    invalid_fields = set(body.updates.keys()) - BULK_UPDATE_ALLOWED_FIELDS
    if invalid_fields:
        raise HTTPException(400, f"Fields not allowed for bulk update: {', '.join(invalid_fields)}")
    if not body.updates:
        raise HTTPException(400, "No update fields provided")

    result = BulkUpdateResult()
    for sid in body.ids:
        try:
            async with db.begin_nested():
                server = await server_crud.get(db, sid)
                if not server:
                    result.errors.append(f"Server #{sid} not found")
                    continue
                changes = compute_changes(server, body.updates)
                await server_crud.update(db, sid, body.updates)
                result.updated += 1
                try:
                    await activity_crud.log_activity(db, "server", sid, server.name, "updated", changes or body.updates)
                except Exception:
                    logger.warning("Failed to log activity for bulk-update server %s", sid, exc_info=True)
        except Exception as e:
            result.errors.append(f"Server #{sid}: {type(e).__name__}")
    return result


@router.post("/import", response_model=ImportResult, status_code=200)
@limiter.limit("10/minute")
async def import_servers(request: Request, body: ServerImportRequest, db: AsyncSession = Depends(get_db)):
    if len(body.servers) > 200:
        raise HTTPException(400, "Maximum 200 servers per import")

    # Pre-load provider name→id map to avoid N+1 lookups
    from app.models.provider import Provider
    provider_result = await db.execute(sa_select(Provider.id, Provider.name))
    provider_map = {row.name: row.id for row in provider_result.all()}

    result = ImportResult()
    for item in body.servers:
        try:
            async with db.begin_nested():
                # Check for duplicates
                existing_stmt = sa_select(ServerModel).where(ServerModel.name == item.name)
                existing = (await db.execute(existing_stmt)).scalar_one_or_none()
                if existing:
                    if body.skip_duplicates:
                        result.skipped += 1
                        continue
                    else:
                        result.errors.append(f"Server '{item.name}' already exists")
                        continue

                # Resolve provider by name from pre-loaded map
                provider_id = None
                if item.provider_name:
                    provider_id = provider_map.get(item.provider_name)
                    if provider_id is None:
                        result.warnings.append(f"Provider '{item.provider_name}' not found for server '{item.name}' — imported without provider")

                server_data = {
                    "name": item.name,
                    "hostname": item.hostname,
                    "ip_v4": item.ip_v4,
                    "ip_v6": item.ip_v6,
                    "os": item.os,
                    "cpu_cores": item.cpu_cores,
                    "ram_mb": item.ram_mb,
                    "disk_gb": item.disk_gb,
                    "location": item.location,
                    "datacenter": item.datacenter,
                    "status": item.status,
                    "monthly_cost": item.monthly_cost,
                    "cost_currency": item.cost_currency,
                    "provider_id": provider_id,
                    "login_user": item.login_user,
                    "notes": item.notes,
                }
                created = await server_crud.create(db, server_data)
                try:
                    await activity_crud.log_activity(db, "server", created.id, item.name, "created")
                except Exception:
                    logger.warning("Failed to log activity for imported server %s", item.name, exc_info=True)
                result.created += 1
        except Exception as e:
            logger.warning("Error importing server '%s': %s", item.name, e, exc_info=True)
            result.errors.append(f"Error importing '{item.name}': {type(e).__name__}")
    return result


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
    try:
        await dispatch_event(db, "server.created", {"id": server.id, "name": server.name})
    except Exception:
        logger.warning("Failed to dispatch webhook for server create %s", server.id, exc_info=True)
    return _server_to_read(server)


@router.put("/{id}", response_model=ServerRead)
@limiter.limit("30/minute")
async def update_server(request: Request, id: int, data: ServerUpdate, db: AsyncSession = Depends(get_db)):
    old = await server_crud.get(db, id)
    if not old:
        raise HTTPException(404, "Server not found")
    update_fields = data.model_dump(exclude_unset=True)
    changes = compute_changes(old, update_fields)
    updated = await server_crud.update(db, id, update_fields)
    server = await server_crud.get_with_provider(db, updated.id)
    try:
        await activity_crud.log_activity(db, "server", id, data.name or server.name, "updated", changes or update_fields)
    except Exception:
        logger.warning("Failed to log activity for server update %s", id, exc_info=True)
    try:
        await dispatch_event(db, "server.updated", {"id": id, "name": server.name, "changes": changes})
    except Exception:
        logger.warning("Failed to dispatch webhook for server update %s", id, exc_info=True)
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
    try:
        await dispatch_event(db, "server.deleted", {"id": id, "name": server.name})
    except Exception:
        logger.warning("Failed to dispatch webhook for server delete %s", id, exc_info=True)


@router.post("/{id}/mark-audited", status_code=200)
@limiter.limit("30/minute")
async def mark_server_audited(request: Request, id: int, body: AuditRequest = AuditRequest(), db: AsyncSession = Depends(get_db)):
    server = await server_crud.get(db, id)
    if not server:
        raise HTTPException(404, "Server not found")
    update_data = {
        "last_audited_at": datetime.utcnow(),
        "last_audited_by": body.audited_by,
    }
    await server_crud.update(db, id, update_data)
    try:
        await activity_crud.log_activity(db, "server", id, server.name, "audited", {"audited_by": body.audited_by} if body.audited_by else None)
    except Exception:
        logger.warning("Failed to log activity for server audit %s", id, exc_info=True)
    server = await server_crud.get_with_provider(db, id)
    return _server_to_read(server)


class BulkAuditRequest(BaseModel):
    ids: list[int] = Field(..., max_length=100)
    audited_by: str | None = None


@router.post("/bulk-mark-audited", status_code=200)
@limiter.limit("30/minute")
async def bulk_mark_audited(request: Request, body: BulkAuditRequest, db: AsyncSession = Depends(get_db)):
    if len(body.ids) > 100:
        raise HTTPException(400, "Maximum 100 servers per bulk audit")
    updated = 0
    errors: list[str] = []
    now = datetime.utcnow()
    for sid in body.ids:
        try:
            async with db.begin_nested():
                server = await server_crud.get(db, sid)
                if not server:
                    errors.append(f"Server #{sid} not found")
                    continue
                await server_crud.update(db, sid, {
                    "last_audited_at": now,
                    "last_audited_by": body.audited_by,
                })
                updated += 1
                try:
                    await activity_crud.log_activity(db, "server", sid, server.name, "audited",
                                                     {"audited_by": body.audited_by} if body.audited_by else None)
                except Exception:
                    logger.warning("Failed to log activity for bulk audit server %s", sid, exc_info=True)
        except Exception as e:
            errors.append(f"Server #{sid}: {type(e).__name__}")
    return {"updated": updated, "errors": errors}


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
    server = await server_crud.get(db, id)
    if not server:
        raise HTTPException(404, "Server not found")
    old_status = server.last_check_status
    update_data = {
        "last_checked_at": datetime.utcnow(),
        "last_check_status": data.status,
        "response_time_ms": data.response_time_ms,
    }
    await server_crud.update(db, id, update_data)
    try:
        await health_check_crud.create(db, id, data.status, data.response_time_ms)
    except Exception:
        logger.warning("Failed to log health check history for server %s", id, exc_info=True)
    # Dispatch webhook on health status transitions
    try:
        if data.status == "unhealthy" and old_status != "unhealthy":
            await dispatch_event(db, "health_check.failed", {"id": id, "name": server.name, "status": data.status})
        elif data.status == "healthy" and old_status == "unhealthy":
            await dispatch_event(db, "health_check.recovered", {"id": id, "name": server.name, "status": data.status})
    except Exception:
        logger.warning("Failed to dispatch webhook for health check %s", id, exc_info=True)
    server = await server_crud.get_with_provider(db, id)
    return _server_to_read(server)


@router.post("/{id}/run-health-check", response_model=ServerRead)
@limiter.limit("30/minute")
async def run_health_check(request: Request, id: int, db: AsyncSession = Depends(get_db)):
    server = await server_crud.get(db, id)
    if not server:
        raise HTTPException(404, "Server not found")

    host = server.ip_v4 or server.ip_v6 or server.hostname
    if not host:
        raise HTTPException(400, "Server has no IP address or hostname configured")

    port = 22
    status = "unhealthy"
    response_time_ms = None

    try:
        # Use getaddrinfo to resolve address family (IPv4/IPv6) automatically
        loop = asyncio.get_event_loop()
        addrinfo = await loop.run_in_executor(
            None, lambda: socket.getaddrinfo(host, port, socket.AF_UNSPEC, socket.SOCK_STREAM)
        )
        if not addrinfo:
            raise OSError("Could not resolve host")

        af, socktype, proto, canonname, sockaddr = addrinfo[0]
        sock = socket.socket(af, socktype, proto)
        try:
            start = time.monotonic()
            sock.settimeout(5)
            await loop.run_in_executor(None, sock.connect, sockaddr)
            elapsed = time.monotonic() - start
            response_time_ms = int(elapsed * 1000)
            status = "healthy"
        except (OSError, socket.timeout, ConnectionRefusedError):
            status = "unhealthy"
        finally:
            sock.close()
    except (OSError, socket.gaierror):
        status = "unhealthy"

    update_data = {
        "last_checked_at": datetime.utcnow(),
        "last_check_status": status,
        "response_time_ms": response_time_ms,
    }
    await server_crud.update(db, id, update_data)
    try:
        await health_check_crud.create(db, id, status, response_time_ms)
    except Exception:
        logger.warning("Failed to log health check history for server %s", id, exc_info=True)
    # Dispatch webhook on health status transitions
    old_status = server.last_check_status
    try:
        if status == "unhealthy" and old_status != "unhealthy":
            await dispatch_event(db, "health_check.failed", {"id": id, "name": server.name, "status": status})
        elif status == "healthy" and old_status == "unhealthy":
            await dispatch_event(db, "health_check.recovered", {"id": id, "name": server.name, "status": status})
    except Exception:
        logger.warning("Failed to dispatch webhook for health check %s", id, exc_info=True)
    server = await server_crud.get_with_provider(db, id)
    return _server_to_read(server)


async def _check_single_server(host: str) -> tuple[str, int | None]:
    """Run a TCP probe on port 22 for a single server. Returns (status, response_time_ms)."""
    port = 22
    try:
        loop = asyncio.get_event_loop()
        addrinfo = await loop.run_in_executor(
            None, lambda: socket.getaddrinfo(host, port, socket.AF_UNSPEC, socket.SOCK_STREAM)
        )
        if not addrinfo:
            return "unhealthy", None

        af, socktype, proto, canonname, sockaddr = addrinfo[0]
        sock = socket.socket(af, socktype, proto)
        try:
            start = time.monotonic()
            sock.settimeout(5)
            await loop.run_in_executor(None, sock.connect, sockaddr)
            elapsed = time.monotonic() - start
            return "healthy", int(elapsed * 1000)
        except (OSError, socket.timeout, ConnectionRefusedError):
            return "unhealthy", None
        finally:
            sock.close()
    except (OSError, socket.gaierror):
        return "unhealthy", None


@router.post("/batch-health-check")
@limiter.limit("10/minute")
async def batch_health_check(request: Request, db: AsyncSession = Depends(get_db)):
    """Run health checks on all active servers with IP/hostname configured."""
    stmt = sa_select(ServerModel).where(ServerModel.status != ServerStatus.decommissioned)
    all_servers = (await db.execute(stmt)).scalars().all()

    checked = 0
    healthy = 0
    unhealthy = 0
    skipped = 0
    errors: list[str] = []
    semaphore = asyncio.Semaphore(20)

    async def check_one(srv):
        nonlocal checked, healthy, unhealthy, skipped
        host = srv.ip_v4 or srv.ip_v6 or srv.hostname
        if not host:
            skipped += 1
            return
        async with semaphore:
            try:
                s, rt = await _check_single_server(host)
                # Re-fetch current status atomically before update to avoid stale reads
                fresh = await server_crud.get(db, srv.id)
                old_status = fresh.last_check_status if fresh else srv.last_check_status
                await server_crud.update(db, srv.id, {
                    "last_checked_at": datetime.utcnow(),
                    "last_check_status": s,
                    "response_time_ms": rt,
                })
                try:
                    await health_check_crud.create(db, srv.id, s, rt)
                except Exception:
                    logger.warning("Failed to log health check history for server %s", srv.id, exc_info=True)
                # Dispatch webhook on health status transitions
                try:
                    if s == "unhealthy" and old_status != "unhealthy":
                        await dispatch_event(db, "health_check.failed", {"id": srv.id, "name": srv.name, "status": s})
                    elif s == "healthy" and old_status == "unhealthy":
                        await dispatch_event(db, "health_check.recovered", {"id": srv.id, "name": srv.name, "status": s})
                except Exception:
                    logger.warning("Failed to dispatch webhook for batch health check %s", srv.id, exc_info=True)
                checked += 1
                if s == "healthy":
                    healthy += 1
                else:
                    unhealthy += 1
            except Exception as e:
                errors.append(f"{srv.name}: {type(e).__name__}")

    await asyncio.gather(*[check_one(s) for s in all_servers])
    return {"checked": checked, "healthy": healthy, "unhealthy": unhealthy, "skipped": skipped, "errors": errors}
