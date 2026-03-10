from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import ssh_key_crud
from app.database import get_db
from app.schemas.ssh_key import SshKeyCreate, SshKeyRead, SshKeyReadWithServers, SshKeyUpdate

router = APIRouter(prefix="/ssh-keys", tags=["ssh-keys"])


@router.get("")
async def list_ssh_keys(skip: int = Query(0, ge=0), limit: int = Query(100, ge=0, le=500), search: str | None = None, db: AsyncSession = Depends(get_db)):
    keys = await ssh_key_crud.get_multi_filtered(db, skip=skip, limit=limit, search=search)
    total = await ssh_key_crud.count_filtered(db, search=search)
    data = [SshKeyRead.model_validate(k).model_dump(mode="json") for k in keys]
    return JSONResponse(content=data, headers={"X-Total-Count": str(total)})


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
async def create_ssh_key(data: SshKeyCreate, db: AsyncSession = Depends(get_db)):
    return await ssh_key_crud.create(db, data.model_dump())


@router.put("/{id}", response_model=SshKeyRead)
async def update_ssh_key(id: int, data: SshKeyUpdate, db: AsyncSession = Depends(get_db)):
    updated = await ssh_key_crud.update(db, id, data.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(404, "SSH Key not found")
    return updated


@router.delete("/{id}", status_code=204)
async def delete_ssh_key(id: int, db: AsyncSession = Depends(get_db)):
    deleted = await ssh_key_crud.delete(db, id)
    if not deleted:
        raise HTTPException(404, "SSH Key not found")
