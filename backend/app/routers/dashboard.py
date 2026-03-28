from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import dashboard_crud
from app.database import get_db
from app.limiter import limiter
from app.schemas.dashboard import BackupCoverage, CostByTag, CostSummary, DashboardStats, DocumentationCoverage, EfficiencyMetric, HealthSummary, OverdueBackup, RecentBackup

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

CACHE_HEADERS = {"Cache-Control": "public, max-age=30"}


@router.get("/stats", response_model=DashboardStats)
@limiter.limit("30/minute")
async def get_stats(request: Request, db: AsyncSession = Depends(get_db)):
    stats = await dashboard_crud.get_stats(db)
    return JSONResponse(content=stats.model_dump(mode="json"), headers=CACHE_HEADERS)


@router.get("/cost-summary", response_model=CostSummary)
@limiter.limit("30/minute")
async def get_cost_summary(request: Request, db: AsyncSession = Depends(get_db)):
    summary = await dashboard_crud.get_cost_summary(db)
    return JSONResponse(content=summary.model_dump(mode="json"), headers=CACHE_HEADERS)


@router.get("/recent-backups", response_model=list[RecentBackup])
@limiter.limit("30/minute")
async def get_recent_backups(request: Request, db: AsyncSession = Depends(get_db)):
    backups = await dashboard_crud.get_recent_backups(db)
    return JSONResponse(
        content=[b.model_dump(mode="json") for b in backups],
        headers=CACHE_HEADERS,
    )


@router.get("/backup-coverage", response_model=BackupCoverage)
@limiter.limit("30/minute")
async def get_backup_coverage(request: Request, db: AsyncSession = Depends(get_db)):
    coverage = await dashboard_crud.get_backup_coverage(db)
    return JSONResponse(content=coverage.model_dump(mode="json"), headers=CACHE_HEADERS)


@router.get("/overdue-backups", response_model=list[OverdueBackup])
@limiter.limit("30/minute")
async def get_overdue_backups(request: Request, db: AsyncSession = Depends(get_db)):
    overdue = await dashboard_crud.get_overdue_backups(db)
    return JSONResponse(
        content=[o.model_dump(mode="json") for o in overdue],
        headers=CACHE_HEADERS,
    )


@router.get("/cost-by-tag", response_model=list[CostByTag])
@limiter.limit("30/minute")
async def get_cost_by_tag(request: Request, db: AsyncSession = Depends(get_db)):
    data = await dashboard_crud.get_cost_by_tag(db)
    return JSONResponse(
        content=[d.model_dump(mode="json") for d in data],
        headers=CACHE_HEADERS,
    )


@router.get("/health-summary", response_model=HealthSummary)
@limiter.limit("30/minute")
async def get_health_summary(request: Request, db: AsyncSession = Depends(get_db)):
    summary = await dashboard_crud.get_health_summary(db)
    return JSONResponse(content=summary.model_dump(mode="json"), headers=CACHE_HEADERS)


@router.get("/documentation-coverage", response_model=DocumentationCoverage)
@limiter.limit("30/minute")
async def get_documentation_coverage(request: Request, db: AsyncSession = Depends(get_db)):
    coverage = await dashboard_crud.get_documentation_coverage(db)
    return JSONResponse(content=coverage.model_dump(mode="json"), headers=CACHE_HEADERS)


@router.get("/efficiency-metrics", response_model=list[EfficiencyMetric])
@limiter.limit("30/minute")
async def get_efficiency_metrics(request: Request, db: AsyncSession = Depends(get_db)):
    metrics = await dashboard_crud.get_efficiency_metrics(db)
    return JSONResponse(
        content=[m.model_dump(mode="json") for m in metrics],
        headers=CACHE_HEADERS,
    )
