from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import ssh_key_crud
from app.crud.activity import activity_crud

limiter = Limiter(key_func=get_remote_address)
from app.database import get_db
from app.schemas.ssh_key import SshKeyCreate, SshKeyRead, SshKeyReadWithServers, SshKeyUpdate

router = APIRouter(prefix="/ssh-keys", tags=["ssh-keys"])


class BulkDeleteRequest(BaseModel):
    ids: list[int]


@router.get("")
async def list_ssh_keys(skip: int = Query(0, ge=0), limit: int = Query(100, ge=0, le=500), search: str | None = None, db: AsyncSession = Depends(get_db)):
    keys = await ssh_key_crud.get_multi_filtered(db, skip=skip, limit=limit, search=search)
    total = await ssh_key_crud.count_filtered(db, search=search)
    data = [SshKeyRead.model_validate(k).model_dump(mode="json") for k in keys]
    return JSONResponse(content=data, headers={"X-Total-Count": str(total)})


@router.post("/bulk-delete", status_code=204)
@limiter.limit("30/minute")
async def bulk_delete_ssh_keys(request: Request, body: BulkDeleteRequest, db: AsyncSession = Depends(get_db)):
    for key_id in body.ids[:100]:
        await ssh_key_crud.delete(db, key_id)


@router.get("/{id}", response_model=SshKeyReadWithServers)
async def get_ssh_key(id: int, db: AsyncSession = Depends(get_db)):
    key = await ssh_key_crud.get_with_servers(db, id)
    if not key:
        raise HTTPException(404, "SSH Key not found")
    servers = [
        {"server_id": ssk.server_id, "server_name": ssk.server.name if ssk.server else None,
         "is_authorized": ssk.is_authorized, "is_host_key": ssk.is_host_key}
        for ssk in key.server_ssh_keys
    ]
    data = SshKeyReadWithServers.model_validate(key)
    data.servers = servers
    return data


@router.post("", response_model=SshKeyRead, status_code=201)
@limiter.limit("30/minute")
async def create_ssh_key(request: Request, data: SshKeyCreate, db: AsyncSession = Depends(get_db)):
    created = await ssh_key_crud.create(db, data.model_dump())
    await activity_crud.log_activity(db, "ssh_key", created.id, data.name, "created")
    return created


@router.put("/{id}", response_model=SshKeyRead)
@limiter.limit("30/minute")
async def update_ssh_key(request: Request, id: int, data: SshKeyUpdate, db: AsyncSession = Depends(get_db)):
    updated = await ssh_key_crud.update(db, id, data.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(404, "SSH Key not found")
    await activity_crud.log_activity(db, "ssh_key", id, data.name or updated.name, "updated", data.model_dump(exclude_unset=True))
    return updated


@router.delete("/{id}", status_code=204)
@limiter.limit("30/minute")
async def delete_ssh_key(request: Request, id: int, db: AsyncSession = Depends(get_db)):
    key = await ssh_key_crud.get(db, id)
    if not key:
        raise HTTPException(404, "SSH Key not found")
    await ssh_key_crud.delete(db, id)
    await activity_crud.log_activity(db, "ssh_key", id, key.name, "deleted")
