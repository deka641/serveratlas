from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import dashboard_crud
from app.database import get_db
from app.schemas.dashboard import CostSummary, DashboardStats, RecentBackup

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_stats(db: AsyncSession = Depends(get_db)):
    return await dashboard_crud.get_stats(db)


@router.get("/cost-summary", response_model=CostSummary)
async def get_cost_summary(db: AsyncSession = Depends(get_db)):
    return await dashboard_crud.get_cost_summary(db)


@router.get("/recent-backups", response_model=list[RecentBackup])
async def get_recent_backups(db: AsyncSession = Depends(get_db)):
    return await dashboard_crud.get_recent_backups(db)
