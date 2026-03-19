import logging
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.tag import tag_crud
from app.crud.activity import activity_crud
from app.database import get_db
from app.limiter import limiter
from app.routers.utils import BulkDeleteRequest, bulk_delete_entities, compute_changes
from app.schemas.tag import TagCreate, TagRead, TagUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("")
async def list_tags(
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=0, le=500),
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    tags = await tag_crud.get_multi_filtered(db, skip=skip, limit=limit, search=search)
    total = await tag_crud.count_filtered(db, search=search)
    data = [TagRead.model_validate(t).model_dump(mode="json") for t in tags]
    return JSONResponse(content=data, headers={"X-Total-Count": str(total)})


@router.post("/bulk-delete", status_code=204)
@limiter.limit("30/minute")
async def bulk_delete_tags(request: Request, body: BulkDeleteRequest, db: AsyncSession = Depends(get_db)):
    await bulk_delete_entities(db, tag_crud, "tag", body.ids)


class BatchTagRequest(BaseModel):
    server_ids: list[int]
    tag_ids: list[int]
    action: Literal["assign", "unassign"]


@router.post("/batch-assign", status_code=200)
@limiter.limit("30/minute")
async def batch_assign_tags(request: Request, body: BatchTagRequest, db: AsyncSession = Depends(get_db)):
    if len(body.server_ids) > 100:
        raise HTTPException(400, "Maximum 100 servers per request")
    if len(body.tag_ids) > 50:
        raise HTTPException(400, "Maximum 50 tags per request")

    count = 0
    for server_id in body.server_ids:
        for tag_id in body.tag_ids:
            try:
                if body.action == "assign":
                    await tag_crud.add_tag_to_server(db, server_id, tag_id)
                else:
                    await tag_crud.remove_tag_from_server(db, server_id, tag_id)
                count += 1
                tag = await tag_crud.get(db, tag_id)
                tag_name = tag.name if tag else f"Tag #{tag_id}"
                try:
                    await activity_crud.log_activity(
                        db, "tag", tag_id, tag_name,
                        "assigned" if body.action == "assign" else "unassigned",
                        {"server_id": str(server_id)}
                    )
                except Exception:
                    logger.warning("Failed to log activity for batch tag %s", tag_id, exc_info=True)
            except Exception:
                continue
    return {"status": "ok", "count": count}


@router.get("/{id}", response_model=TagRead)
async def get_tag(id: int, db: AsyncSession = Depends(get_db)):
    tag = await tag_crud.get(db, id)
    if not tag:
        raise HTTPException(404, "Tag not found")
    return tag


@router.post("", response_model=TagRead, status_code=201)
@limiter.limit("30/minute")
async def create_tag(request: Request, data: TagCreate, db: AsyncSession = Depends(get_db)):
    created = await tag_crud.create(db, data.model_dump())
    try:
        await activity_crud.log_activity(db, "tag", created.id, data.name, "created")
    except Exception:
        logger.warning("Failed to log activity for tag create %s", created.id, exc_info=True)
    return created


@router.put("/{id}", response_model=TagRead)
@limiter.limit("30/minute")
async def update_tag(request: Request, id: int, data: TagUpdate, db: AsyncSession = Depends(get_db)):
    old = await tag_crud.get(db, id)
    if not old:
        raise HTTPException(404, "Tag not found")
    update_fields = data.model_dump(exclude_unset=True)
    changes = compute_changes(old, update_fields)
    updated = await tag_crud.update(db, id, update_fields)
    try:
        await activity_crud.log_activity(db, "tag", id, updated.name, "updated", changes or update_fields)
    except Exception:
        logger.warning("Failed to log activity for tag update %s", id, exc_info=True)
    return updated


@router.delete("/{id}", status_code=204)
@limiter.limit("30/minute")
async def delete_tag(request: Request, id: int, db: AsyncSession = Depends(get_db)):
    tag = await tag_crud.get(db, id)
    if not tag:
        raise HTTPException(404, "Tag not found")
    await tag_crud.delete(db, id)
    try:
        await activity_crud.log_activity(db, "tag", id, tag.name, "deleted")
    except Exception:
        logger.warning("Failed to log activity for tag delete %s", id, exc_info=True)


@router.post("/servers/{server_id}/tags/{tag_id}", status_code=201)
@limiter.limit("30/minute")
async def add_tag_to_server(request: Request, server_id: int, tag_id: int, db: AsyncSession = Depends(get_db)):
    tag = await tag_crud.get(db, tag_id)
    await tag_crud.add_tag_to_server(db, server_id, tag_id)
    try:
        tag_name = tag.name if tag else f"Tag #{tag_id}"
        await activity_crud.log_activity(db, "tag", tag_id, tag_name, "assigned", {"server_id": str(server_id)})
    except Exception:
        logger.warning("Failed to log activity for tag assign %s to server %s", tag_id, server_id, exc_info=True)
    return {"status": "ok"}


@router.delete("/servers/{server_id}/tags/{tag_id}", status_code=204)
@limiter.limit("30/minute")
async def remove_tag_from_server(request: Request, server_id: int, tag_id: int, db: AsyncSession = Depends(get_db)):
    tag = await tag_crud.get(db, tag_id)
    removed = await tag_crud.remove_tag_from_server(db, server_id, tag_id)
    if not removed:
        raise HTTPException(404, "Tag association not found")
    try:
        tag_name = tag.name if tag else f"Tag #{tag_id}"
        await activity_crud.log_activity(db, "tag", tag_id, tag_name, "unassigned", {"server_id": str(server_id)})
    except Exception:
        logger.warning("Failed to log activity for tag unassign %s from server %s", tag_id, server_id, exc_info=True)
