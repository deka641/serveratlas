import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import backup_crud
from app.crud.activity import activity_crud
from app.limiter import limiter

logger = logging.getLogger(__name__)
from app.database import get_db
from app.schemas.backup import BackupCreate, BackupRead, BackupUpdate

router = APIRouter(prefix="/backups", tags=["backups"])


class BulkDeleteRequest(BaseModel):
    ids: list[int]


def _backup_to_read(b) -> dict:
    return {
        "id": b.id,
        "name": b.name,
        "application_id": b.application_id,
        "source_server_id": b.source_server_id,
        "target_server_id": b.target_server_id,
        "frequency": b.frequency.value if b.frequency else None,
        "retention_days": b.retention_days,
        "storage_path": b.storage_path,
        "last_run_at": b.last_run_at,
        "last_run_status": b.last_run_status.value if b.last_run_status else "never_run",
        "notes": b.notes,
        "created_at": b.created_at,
        "updated_at": b.updated_at,
        "application_name": b.application.name if b.application else None,
        "source_server_name": b.source_server.name if b.source_server else None,
        "target_server_name": b.target_server.name if b.target_server else None,
    }


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


@router.post("/bulk-delete", status_code=204)
@limiter.limit("30/minute")
async def bulk_delete_backups(request: Request, body: BulkDeleteRequest, db: AsyncSession = Depends(get_db)):
    for backup_id in body.ids[:100]:
        await backup_crud.delete(db, backup_id)


@router.get("/{id}", response_model=BackupRead)
async def get_backup(id: int, db: AsyncSession = Depends(get_db)):
    backup = await backup_crud.get_detail(db, id)
    if not backup:
        raise HTTPException(404, "Backup not found")
    return BackupRead.model_validate(_backup_to_read(backup))


@router.post("", response_model=BackupRead, status_code=201)
@limiter.limit("30/minute")
async def create_backup(request: Request, data: BackupCreate, db: AsyncSession = Depends(get_db)):
    backup = await backup_crud.create(db, data.model_dump())
    detail = await backup_crud.get_detail(db, backup.id)
    try:
        await activity_crud.log_activity(db, "backup", backup.id, data.name, "created")
    except Exception:
        logger.warning("Failed to log activity for backup create %s", backup.id, exc_info=True)
    return BackupRead.model_validate(_backup_to_read(detail))


@router.put("/{id}", response_model=BackupRead)
@limiter.limit("30/minute")
async def update_backup(request: Request, id: int, data: BackupUpdate, db: AsyncSession = Depends(get_db)):
    old = await backup_crud.get(db, id)
    if not old:
        raise HTTPException(404, "Backup not found")
    update_fields = data.model_dump(exclude_unset=True)
    changes = {}
    for key, new_val in update_fields.items():
        old_val = getattr(old, key, None)
        if hasattr(old_val, 'value'):
            old_val = old_val.value
        if str(old_val) != str(new_val):
            changes[key] = {"old": str(old_val), "new": str(new_val)}
    updated = await backup_crud.update(db, id, update_fields)
    detail = await backup_crud.get_detail(db, updated.id)
    try:
        await activity_crud.log_activity(db, "backup", id, data.name or detail.name, "updated", changes or update_fields)
    except Exception:
        logger.warning("Failed to log activity for backup update %s", id, exc_info=True)
    return BackupRead.model_validate(_backup_to_read(detail))


@router.delete("/{id}", status_code=204)
@limiter.limit("30/minute")
async def delete_backup(request: Request, id: int, db: AsyncSession = Depends(get_db)):
    backup = await backup_crud.get(db, id)
    if not backup:
        raise HTTPException(404, "Backup not found")
    await backup_crud.delete(db, id)
    try:
        await activity_crud.log_activity(db, "backup", id, backup.name, "deleted")
    except Exception:
        logger.warning("Failed to log activity for backup delete %s", id, exc_info=True)
