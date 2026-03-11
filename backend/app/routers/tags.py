from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.tag import tag_crud
from app.database import get_db
from app.schemas.tag import TagCreate, TagRead

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("")
async def list_tags(db: AsyncSession = Depends(get_db)):
    tags = await tag_crud.get_multi(db, skip=0, limit=500)
    data = [TagRead.model_validate(t).model_dump(mode="json") for t in tags]
    return JSONResponse(content=data)


@router.post("", response_model=TagRead, status_code=201)
@limiter.limit("30/minute")
async def create_tag(request: Request, data: TagCreate, db: AsyncSession = Depends(get_db)):
    return await tag_crud.create(db, data.model_dump())


@router.delete("/{id}", status_code=204)
@limiter.limit("30/minute")
async def delete_tag(request: Request, id: int, db: AsyncSession = Depends(get_db)):
    deleted = await tag_crud.delete(db, id)
    if not deleted:
        raise HTTPException(404, "Tag not found")


@router.post("/servers/{server_id}/tags/{tag_id}", status_code=201)
@limiter.limit("30/minute")
async def add_tag_to_server(request: Request, server_id: int, tag_id: int, db: AsyncSession = Depends(get_db)):
    await tag_crud.add_tag_to_server(db, server_id, tag_id)
    return {"status": "ok"}


@router.delete("/servers/{server_id}/tags/{tag_id}", status_code=204)
@limiter.limit("30/minute")
async def remove_tag_from_server(request: Request, server_id: int, tag_id: int, db: AsyncSession = Depends(get_db)):
    removed = await tag_crud.remove_tag_from_server(db, server_id, tag_id)
    if not removed:
        raise HTTPException(404, "Tag association not found")
