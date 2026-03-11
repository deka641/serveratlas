from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.activity import activity_crud
from app.database import get_db
from app.schemas.activity import ActivityRead

router = APIRouter(prefix="/activities", tags=["activities"])


@router.get("")
async def list_activities(
    entity_type: str | None = None,
    entity_id: int | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=0, le=500),
    db: AsyncSession = Depends(get_db),
):
    activities = await activity_crud.get_multi(db, entity_type=entity_type, entity_id=entity_id, skip=skip, limit=limit)
    total = await activity_crud.count_filtered(db, entity_type=entity_type, entity_id=entity_id)
    data = []
    for a in activities:
        d = ActivityRead.model_validate(a)
        data.append(d.model_dump(mode="json"))
    return JSONResponse(content=data, headers={"X-Total-Count": str(total)})
