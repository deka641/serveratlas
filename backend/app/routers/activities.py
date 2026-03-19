from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.activity import activity_crud
from app.database import get_db
from app.limiter import limiter
from app.schemas.activity import ActivityRead

router = APIRouter(prefix="/activities", tags=["activities"])


@router.get("/stats")
async def get_activity_stats(db: AsyncSession = Depends(get_db)):
    return await activity_crud.get_stats(db)


@router.post("/cleanup", status_code=200)
@limiter.limit("5/minute")
async def cleanup_activities(
    request: Request,
    retention_days: int = Query(90, ge=7, le=365),
    db: AsyncSession = Depends(get_db),
):
    deleted = await activity_crud.delete_older_than(db, retention_days)
    return {"deleted_count": deleted, "retention_days": retention_days}


@router.get("")
async def list_activities(
    entity_type: str | None = None,
    entity_id: int | None = None,
    action: str | None = None,
    search: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=0, le=500),
    db: AsyncSession = Depends(get_db),
):
    activities = await activity_crud.get_multi(
        db, entity_type=entity_type, entity_id=entity_id,
        action=action, search=search, date_from=date_from, date_to=date_to,
        skip=skip, limit=limit,
    )
    total = await activity_crud.count_filtered(
        db, entity_type=entity_type, entity_id=entity_id,
        action=action, search=search, date_from=date_from, date_to=date_to,
    )
    data = []
    for a in activities:
        d = ActivityRead.model_validate(a)
        data.append(d.model_dump(mode="json"))
    return JSONResponse(content=data, headers={"X-Total-Count": str(total)})
