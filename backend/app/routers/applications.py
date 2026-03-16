import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import application_crud
from app.crud.activity import activity_crud
from app.limiter import limiter

logger = logging.getLogger(__name__)
from app.database import get_db
from app.schemas.application import ApplicationCreate, ApplicationRead, ApplicationUpdate

router = APIRouter(prefix="/applications", tags=["applications"])


class BulkDeleteRequest(BaseModel):
    ids: list[int]


@router.get("")
async def list_applications(
    skip: int = Query(0, ge=0), limit: int = Query(100, ge=0, le=500),
    server_id: int | None = None, status: str | None = None,
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    apps = await application_crud.get_multi_filtered(db, skip=skip, limit=limit, server_id=server_id, status=status, search=search)
    total = await application_crud.count_filtered(db, server_id=server_id, status=status, search=search)
    data = [
        ApplicationRead.model_validate({
            **a.__dict__,
            "server_name": a.server.name if a.server else None,
        }).model_dump(mode="json") for a in apps
    ]
    return JSONResponse(content=data, headers={"X-Total-Count": str(total)})


@router.post("/bulk-delete", status_code=204)
@limiter.limit("30/minute")
async def bulk_delete_applications(request: Request, body: BulkDeleteRequest, db: AsyncSession = Depends(get_db)):
    for app_id in body.ids[:100]:
        app = await application_crud.get(db, app_id)
        if app:
            app_name = app.name
            await application_crud.delete(db, app_id)
            try:
                await activity_crud.log_activity(db, "application", app_id, app_name, "deleted")
            except Exception:
                logger.warning("Failed to log activity for application bulk-delete %s", app_id, exc_info=True)


@router.get("/{id}", response_model=ApplicationRead)
async def get_application(id: int, db: AsyncSession = Depends(get_db)):
    app = await application_crud.get_detail(db, id)
    if not app:
        raise HTTPException(404, "Application not found")
    result = ApplicationRead.model_validate({
        **app.__dict__,
        "server_name": app.server.name if app.server else None,
    })
    return result


@router.post("", response_model=ApplicationRead, status_code=201)
@limiter.limit("30/minute")
async def create_application(request: Request, data: ApplicationCreate, db: AsyncSession = Depends(get_db)):
    created = await application_crud.create(db, data.model_dump())
    app = await application_crud.get_detail(db, created.id)
    try:
        await activity_crud.log_activity(db, "application", app.id, data.name, "created")
    except Exception:
        logger.warning("Failed to log activity for application create %s", app.id, exc_info=True)
    return ApplicationRead.model_validate({
        **app.__dict__,
        "server_name": app.server.name if app.server else None,
    })


@router.put("/{id}", response_model=ApplicationRead)
@limiter.limit("30/minute")
async def update_application(request: Request, id: int, data: ApplicationUpdate, db: AsyncSession = Depends(get_db)):
    old = await application_crud.get(db, id)
    if not old:
        raise HTTPException(404, "Application not found")
    update_fields = data.model_dump(exclude_unset=True)
    changes = {}
    for key, new_val in update_fields.items():
        old_val = getattr(old, key, None)
        if hasattr(old_val, 'value'):
            old_val = old_val.value
        if str(old_val) != str(new_val):
            changes[key] = {"old": str(old_val), "new": str(new_val)}
    updated = await application_crud.update(db, id, update_fields)
    app = await application_crud.get_detail(db, updated.id)
    try:
        await activity_crud.log_activity(db, "application", id, data.name or app.name, "updated", changes or update_fields)
    except Exception:
        logger.warning("Failed to log activity for application update %s", id, exc_info=True)
    return ApplicationRead.model_validate({
        **app.__dict__,
        "server_name": app.server.name if app.server else None,
    })


@router.delete("/{id}", status_code=204)
@limiter.limit("30/minute")
async def delete_application(request: Request, id: int, db: AsyncSession = Depends(get_db)):
    app = await application_crud.get(db, id)
    if not app:
        raise HTTPException(404, "Application not found")
    await application_crud.delete(db, id)
    try:
        await activity_crud.log_activity(db, "application", id, app.name, "deleted")
    except Exception:
        logger.warning("Failed to log activity for application delete %s", id, exc_info=True)
