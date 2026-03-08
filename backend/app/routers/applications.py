from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import application_crud
from app.database import get_db
from app.schemas.application import ApplicationCreate, ApplicationRead, ApplicationUpdate

router = APIRouter(prefix="/applications", tags=["applications"])


@router.get("", response_model=list[ApplicationRead])
async def list_applications(
    skip: int = 0, limit: int = 100,
    server_id: int | None = None, status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    apps = await application_crud.get_multi_filtered(db, skip=skip, limit=limit, server_id=server_id, status=status)
    return [
        ApplicationRead.model_validate({
            **a.__dict__,
            "server_name": a.server.name if a.server else None,
        }) for a in apps
    ]


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
    return await application_crud.create(db, data.model_dump())


@router.put("/{id}", response_model=ApplicationRead)
async def update_application(id: int, data: ApplicationUpdate, db: AsyncSession = Depends(get_db)):
    updated = await application_crud.update(db, id, data.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(404, "Application not found")
    return updated


@router.delete("/{id}", status_code=204)
async def delete_application(id: int, db: AsyncSession = Depends(get_db)):
    deleted = await application_crud.delete(db, id)
    if not deleted:
        raise HTTPException(404, "Application not found")
