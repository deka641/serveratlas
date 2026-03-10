from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import application_crud
from app.database import get_db
from app.schemas.application import ApplicationCreate, ApplicationRead, ApplicationUpdate

router = APIRouter(prefix="/applications", tags=["applications"])


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
async def create_application(data: ApplicationCreate, db: AsyncSession = Depends(get_db)):
    created = await application_crud.create(db, data.model_dump())
    app = await application_crud.get_detail(db, created.id)
    return ApplicationRead.model_validate({
        **app.__dict__,
        "server_name": app.server.name if app.server else None,
    })


@router.put("/{id}", response_model=ApplicationRead)
async def update_application(id: int, data: ApplicationUpdate, db: AsyncSession = Depends(get_db)):
    updated = await application_crud.update(db, id, data.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(404, "Application not found")
    app = await application_crud.get_detail(db, updated.id)
    return ApplicationRead.model_validate({
        **app.__dict__,
        "server_name": app.server.name if app.server else None,
    })


@router.delete("/{id}", status_code=204)
async def delete_application(id: int, db: AsyncSession = Depends(get_db)):
    deleted = await application_crud.delete(db, id)
    if not deleted:
        raise HTTPException(404, "Application not found")
