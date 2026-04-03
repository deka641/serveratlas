import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import provider_crud
from app.crud.activity import activity_crud
from app.limiter import limiter
from app.routers.utils import BulkDeleteRequest, bulk_delete_entities, compute_changes
from app.services.webhook_dispatcher import dispatch_event

logger = logging.getLogger(__name__)
from app.database import get_db
from app.schemas.provider import ProviderCreate, ProviderRead, ProviderReadWithServers, ProviderUpdate
from app.schemas.server import ServerRead

router = APIRouter(prefix="/providers", tags=["providers"])


@router.get("")
async def list_providers(skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=500), search: str | None = None, db: AsyncSession = Depends(get_db)):
    rows = await provider_crud.get_multi(db, skip=skip, limit=limit, search=search)
    total = await provider_crud.count_filtered(db, search=search)
    result = []
    for row in rows:
        p = row["provider"]
        data = ProviderRead.model_validate(p)
        data.server_count = row["server_count"]
        result.append(data.model_dump(mode="json"))
    return JSONResponse(content=result, headers={"X-Total-Count": str(total)})


@router.post("/bulk-delete", status_code=204)
@limiter.limit("30/minute")
async def bulk_delete_providers(request: Request, body: BulkDeleteRequest, db: AsyncSession = Depends(get_db)):
    await bulk_delete_entities(db, provider_crud, "provider", body.ids)


@router.get("/{id}", response_model=ProviderRead)
async def get_provider(id: int, db: AsyncSession = Depends(get_db)):
    provider = await provider_crud.get(db, id)
    if not provider:
        raise HTTPException(404, "Provider not found")
    return provider


@router.post("", response_model=ProviderRead, status_code=201)
@limiter.limit("30/minute")
async def create_provider(request: Request, data: ProviderCreate, db: AsyncSession = Depends(get_db)):
    created = await provider_crud.create(db, data.model_dump())
    try:
        await activity_crud.log_activity(db, "provider", created.id, data.name, "created")
    except Exception:
        logger.warning("Failed to log activity for provider create %s", created.id, exc_info=True)
    try:
        await dispatch_event(db, "provider.created", {"id": created.id, "name": data.name})
    except Exception:
        logger.warning("Failed to dispatch webhook for provider create %s", created.id, exc_info=True)
    return created


@router.put("/{id}", response_model=ProviderRead)
@limiter.limit("30/minute")
async def update_provider(request: Request, id: int, data: ProviderUpdate, db: AsyncSession = Depends(get_db)):
    old = await provider_crud.get(db, id)
    if not old:
        raise HTTPException(404, "Provider not found")
    update_fields = data.model_dump(exclude_unset=True)
    changes = compute_changes(old, update_fields)
    updated = await provider_crud.update(db, id, update_fields)
    try:
        await activity_crud.log_activity(db, "provider", id, data.name or updated.name, "updated", changes or update_fields)
    except Exception:
        logger.warning("Failed to log activity for provider update %s", id, exc_info=True)
    try:
        await dispatch_event(db, "provider.updated", {"id": id, "name": updated.name, "changes": changes})
    except Exception:
        logger.warning("Failed to dispatch webhook for provider update %s", id, exc_info=True)
    return updated


@router.delete("/{id}", status_code=204)
@limiter.limit("30/minute")
async def delete_provider(request: Request, id: int, db: AsyncSession = Depends(get_db)):
    provider = await provider_crud.get(db, id)
    if not provider:
        raise HTTPException(404, "Provider not found")
    await provider_crud.delete(db, id)
    try:
        await activity_crud.log_activity(db, "provider", id, provider.name, "deleted")
    except Exception:
        logger.warning("Failed to log activity for provider delete %s", id, exc_info=True)
    try:
        await dispatch_event(db, "provider.deleted", {"id": id, "name": provider.name})
    except Exception:
        logger.warning("Failed to dispatch webhook for provider delete %s", id, exc_info=True)


@router.get("/{id}/servers", response_model=list[ServerRead])
async def get_provider_servers(id: int, db: AsyncSession = Depends(get_db)):
    provider = await provider_crud.get_with_servers(db, id)
    if not provider:
        raise HTTPException(404, "Provider not found")
    return provider.servers
