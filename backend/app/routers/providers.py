from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import provider_crud
from app.database import get_db
from app.schemas.provider import ProviderCreate, ProviderRead, ProviderReadWithServers, ProviderUpdate
from app.schemas.server import ServerRead

router = APIRouter(prefix="/providers", tags=["providers"])


@router.get("", response_model=list[ProviderRead])
async def list_providers(skip: int = Query(0, ge=0), limit: int = Query(100, ge=0, le=500), search: str | None = None, db: AsyncSession = Depends(get_db)):
    rows = await provider_crud.get_multi(db, skip=skip, limit=limit, search=search)
    result = []
    for row in rows:
        p = row["provider"]
        data = ProviderRead.model_validate(p)
        data.server_count = row["server_count"]
        result.append(data)
    return result


@router.get("/{id}", response_model=ProviderRead)
async def get_provider(id: int, db: AsyncSession = Depends(get_db)):
    provider = await provider_crud.get(db, id)
    if not provider:
        raise HTTPException(404, "Provider not found")
    return provider


@router.post("", response_model=ProviderRead, status_code=201)
async def create_provider(data: ProviderCreate, db: AsyncSession = Depends(get_db)):
    return await provider_crud.create(db, data.model_dump())


@router.put("/{id}", response_model=ProviderRead)
async def update_provider(id: int, data: ProviderUpdate, db: AsyncSession = Depends(get_db)):
    updated = await provider_crud.update(db, id, data.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(404, "Provider not found")
    return updated


@router.delete("/{id}", status_code=204)
async def delete_provider(id: int, db: AsyncSession = Depends(get_db)):
    deleted = await provider_crud.delete(db, id)
    if not deleted:
        raise HTTPException(404, "Provider not found")


@router.get("/{id}/servers", response_model=list[ServerRead])
async def get_provider_servers(id: int, db: AsyncSession = Depends(get_db)):
    provider = await provider_crud.get_with_servers(db, id)
    if not provider:
        raise HTTPException(404, "Provider not found")
    return provider.servers
