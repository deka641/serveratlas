from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import dashboard_crud
from app.database import get_db
from app.schemas.dashboard import BackupCoverage, CostSummary, DashboardStats, OverdueBackup, RecentBackup

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

CACHE_HEADERS = {"Cache-Control": "public, max-age=30"}


@router.get("/stats", response_model=DashboardStats)
async def get_stats(db: AsyncSession = Depends(get_db)):
    stats = await dashboard_crud.get_stats(db)
    return JSONResponse(content=stats.model_dump(mode="json"), headers=CACHE_HEADERS)


@router.get("/cost-summary", response_model=CostSummary)
async def get_cost_summary(db: AsyncSession = Depends(get_db)):
    summary = await dashboard_crud.get_cost_summary(db)
    return JSONResponse(content=summary.model_dump(mode="json"), headers=CACHE_HEADERS)


@router.get("/recent-backups", response_model=list[RecentBackup])
async def get_recent_backups(db: AsyncSession = Depends(get_db)):
    backups = await dashboard_crud.get_recent_backups(db)
    return JSONResponse(
        content=[b.model_dump(mode="json") for b in backups],
        headers=CACHE_HEADERS,
    )


@router.get("/backup-coverage", response_model=BackupCoverage)
async def get_backup_coverage(db: AsyncSession = Depends(get_db)):
    coverage = await dashboard_crud.get_backup_coverage(db)
    return JSONResponse(content=coverage.model_dump(mode="json"), headers=CACHE_HEADERS)


@router.get("/overdue-backups", response_model=list[OverdueBackup])
async def get_overdue_backups(db: AsyncSession = Depends(get_db)):
    overdue = await dashboard_crud.get_overdue_backups(db)
    return JSONResponse(
        content=[o.model_dump(mode="json") for o in overdue],
        headers=CACHE_HEADERS,
    )
