from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.snapshot import snapshot_crud
from app.database import get_db
from app.limiter import limiter
from app.schemas.snapshot import SnapshotRead

router = APIRouter(prefix="/snapshots", tags=["snapshots"])


@router.post("", response_model=SnapshotRead, status_code=201)
@limiter.limit("1/hour")
async def create_snapshot(request: Request, db: AsyncSession = Depends(get_db)):
    """Capture current infrastructure metrics as a snapshot. Rate-limited to 1/hour."""
    # Check if a snapshot was already taken recently (within 30 min) to prevent spam
    latest = await snapshot_crud.get_latest(db)
    if latest and latest.snapshot_date:
        delta = datetime.utcnow() - latest.snapshot_date
        if delta < timedelta(minutes=30):
            raise HTTPException(
                429,
                f"Snapshot already taken {int(delta.total_seconds() / 60)} minutes ago. Try again later.",
            )
    snapshot = await snapshot_crud.create_snapshot(db)
    return snapshot


@router.get("")
@limiter.limit("60/minute")
async def list_snapshots(
    request: Request,
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    """Get infrastructure snapshots for the given time period."""
    snapshots = await snapshot_crud.get_recent(db, days=days)
    data = [SnapshotRead.model_validate(s).model_dump(mode="json") for s in snapshots]
    return JSONResponse(content=data, headers={"X-Total-Count": str(len(data))})
