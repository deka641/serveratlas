from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import application_crud
from app.crud.activity import activity_crud

limiter = Limiter(key_func=get_remote_address)
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
        await application_crud.delete(db, app_id)


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
    await activity_crud.log_activity(db, "application", app.id, data.name, "created")
    return ApplicationRead.model_validate({
        **app.__dict__,
        "server_name": app.server.name if app.server else None,
    })


@router.put("/{id}", response_model=ApplicationRead)
@limiter.limit("30/minute")
async def update_application(request: Request, id: int, data: ApplicationUpdate, db: AsyncSession = Depends(get_db)):
    updated = await application_crud.update(db, id, data.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(404, "Application not found")
    app = await application_crud.get_detail(db, updated.id)
    await activity_crud.log_activity(db, "application", id, data.name or app.name, "updated", data.model_dump(exclude_unset=True))
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
    await activity_crud.log_activity(db, "application", id, app.name, "deleted")
