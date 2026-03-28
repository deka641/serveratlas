from datetime import datetime

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.health_check import health_check_crud
from app.database import get_db
from app.limiter import limiter
from app.schemas.health_check import HealthCheckRead, UptimeStats

router = APIRouter(prefix="/health-checks", tags=["health-checks"])


@router.get("/server/{server_id}", response_model=list[HealthCheckRead])
@limiter.limit("60/minute")
async def get_health_check_history(
    request: Request,
    server_id: int,
    limit: int = Query(50, ge=1, le=200),
    since: datetime | None = None,
    db: AsyncSession = Depends(get_db),
):
    records = await health_check_crud.get_by_server(db, server_id, limit=limit, since=since)
    data = []
    for r in records:
        d = HealthCheckRead.model_validate(r)
        data.append(d.model_dump(mode="json"))
    return JSONResponse(content=data)


@router.get("/server/{server_id}/stats", response_model=UptimeStats)
@limiter.limit("60/minute")
async def get_uptime_stats(
    request: Request,
    server_id: int,
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    stats = await health_check_crud.get_uptime_stats(db, server_id, days=days)
    return stats
