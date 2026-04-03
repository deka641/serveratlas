import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import backup_crud
from app.crud.activity import activity_crud
from app.limiter import limiter
from app.routers.utils import BulkDeleteRequest, bulk_delete_entities, compute_changes
from app.services.webhook_dispatcher import dispatch_event

logger = logging.getLogger(__name__)
from app.database import get_db
from app.schemas.backup import BackupCreate, BackupRead, BackupUpdate, BackupVerifyRequest

router = APIRouter(prefix="/backups", tags=["backups"])


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
        "last_verified_at": b.last_verified_at,
        "last_verified_by": b.last_verified_by,
        "verification_notes": b.verification_notes,
        "created_at": b.created_at,
        "updated_at": b.updated_at,
        "application_name": b.application.name if b.application else None,
        "source_server_name": b.source_server.name if b.source_server else None,
        "target_server_name": b.target_server.name if b.target_server else None,
    }


@router.get("")
async def list_backups(
    skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=500),
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
    await bulk_delete_entities(db, backup_crud, "backup", body.ids)


@router.get("/{id}", response_model=BackupRead)
async def get_backup(id: int, db: AsyncSession = Depends(get_db)):
    backup = await backup_crud.get_detail(db, id)
    if not backup:
        raise HTTPException(404, "Backup not found")
    return BackupRead.model_validate(_backup_to_read(backup))


@router.post("/{id}/verify", response_model=BackupRead, status_code=200)
@limiter.limit("30/minute")
async def verify_backup(request: Request, id: int, data: BackupVerifyRequest, db: AsyncSession = Depends(get_db)):
    backup = await backup_crud.get(db, id)
    if not backup:
        raise HTTPException(404, "Backup not found")
    update_fields = {
        "last_verified_at": datetime.utcnow(),
        "last_verified_by": data.verified_by,
        "verification_notes": data.notes,
    }
    updated = await backup_crud.update(db, id, update_fields)
    detail = await backup_crud.get_detail(db, updated.id)
    try:
        await activity_crud.log_activity(db, "backup", id, backup.name, "verified", {
            "verified_by": data.verified_by,
            "notes": data.notes,
        })
    except Exception:
        logger.warning("Failed to log activity for backup verify %s", id, exc_info=True)
    return BackupRead.model_validate(_backup_to_read(detail))


@router.post("", response_model=BackupRead, status_code=201)
@limiter.limit("30/minute")
async def create_backup(request: Request, data: BackupCreate, db: AsyncSession = Depends(get_db)):
    backup = await backup_crud.create(db, data.model_dump())
    detail = await backup_crud.get_detail(db, backup.id)
    try:
        await activity_crud.log_activity(db, "backup", backup.id, data.name, "created")
    except Exception:
        logger.warning("Failed to log activity for backup create %s", backup.id, exc_info=True)
    try:
        await dispatch_event(db, "backup.created", {"id": backup.id, "name": data.name})
    except Exception:
        logger.warning("Failed to dispatch webhook for backup create %s", backup.id, exc_info=True)
    return BackupRead.model_validate(_backup_to_read(detail))


@router.put("/{id}", response_model=BackupRead)
@limiter.limit("30/minute")
async def update_backup(request: Request, id: int, data: BackupUpdate, db: AsyncSession = Depends(get_db)):
    old = await backup_crud.get(db, id)
    if not old:
        raise HTTPException(404, "Backup not found")
    update_fields = data.model_dump(exclude_unset=True)
    changes = compute_changes(old, update_fields)
    updated = await backup_crud.update(db, id, update_fields)
    detail = await backup_crud.get_detail(db, updated.id)
    try:
        await activity_crud.log_activity(db, "backup", id, data.name or detail.name, "updated", changes or update_fields)
    except Exception:
        logger.warning("Failed to log activity for backup update %s", id, exc_info=True)
    try:
        await dispatch_event(db, "backup.updated", {"id": id, "name": detail.name, "changes": changes})
    except Exception:
        logger.warning("Failed to dispatch webhook for backup update %s", id, exc_info=True)
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
    try:
        await dispatch_event(db, "backup.deleted", {"id": id, "name": backup.name})
    except Exception:
        logger.warning("Failed to dispatch webhook for backup delete %s", id, exc_info=True)
