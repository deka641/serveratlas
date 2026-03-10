from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import backup_crud
from app.database import get_db
from app.schemas.backup import BackupCreate, BackupRead, BackupUpdate

router = APIRouter(prefix="/backups", tags=["backups"])


def _backup_to_read(b) -> dict:
    d = {k: v for k, v in b.__dict__.items() if not k.startswith("_")}
    d["application_name"] = b.application.name if b.application else None
    d["source_server_name"] = b.source_server.name if b.source_server else None
    d["target_server_name"] = b.target_server.name if b.target_server else None
    return d


@router.get("")
async def list_backups(
    skip: int = Query(0, ge=0), limit: int = Query(100, ge=0, le=500),
    source_server_id: int | None = None, application_id: int | None = None,
    status: str | None = None, search: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    backups = await backup_crud.get_multi_filtered(
        db, skip=skip, limit=limit, source_server_id=source_server_id,
        application_id=application_id, status=status, search=search,
    )
    total = await backup_crud.count_filtered(db, source_server_id=source_server_id, application_id=application_id, status=status, search=search)
    data = [BackupRead.model_validate(_backup_to_read(b)).model_dump(mode="json") for b in backups]
    return JSONResponse(content=data, headers={"X-Total-Count": str(total)})


@router.get("/{id}", response_model=BackupRead)
async def get_backup(id: int, db: AsyncSession = Depends(get_db)):
    backup = await backup_crud.get_detail(db, id)
    if not backup:
        raise HTTPException(404, "Backup not found")
    return BackupRead.model_validate(_backup_to_read(backup))


@router.post("", response_model=BackupRead, status_code=201)
async def create_backup(data: BackupCreate, db: AsyncSession = Depends(get_db)):
    backup = await backup_crud.create(db, data.model_dump())
    detail = await backup_crud.get_detail(db, backup.id)
    return BackupRead.model_validate(_backup_to_read(detail))


@router.put("/{id}", response_model=BackupRead)
async def update_backup(id: int, data: BackupUpdate, db: AsyncSession = Depends(get_db)):
    updated = await backup_crud.update(db, id, data.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(404, "Backup not found")
    detail = await backup_crud.get_detail(db, updated.id)
    return BackupRead.model_validate(_backup_to_read(detail))


@router.delete("/{id}", status_code=204)
async def delete_backup(id: int, db: AsyncSession = Depends(get_db)):
    deleted = await backup_crud.delete(db, id)
    if not deleted:
        raise HTTPException(404, "Backup not found")
