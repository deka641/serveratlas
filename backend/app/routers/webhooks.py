import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.webhook import webhook_crud
from app.crud.activity import activity_crud
from app.database import get_db
from app.limiter import limiter
from app.routers.utils import BulkDeleteRequest, bulk_delete_entities, compute_changes
from app.schemas.webhook import WebhookCreate, WebhookRead, WebhookUpdate
from app.services.webhook_dispatcher import dispatch_webhook

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.get("")
async def list_webhooks(
    db: AsyncSession = Depends(get_db),
):
    webhooks = await webhook_crud.get_multi(db, skip=0, limit=500)
    total = await webhook_crud.count(db)
    data = [WebhookRead.model_validate(w).model_dump(mode="json") for w in webhooks]
    return JSONResponse(content=data, headers={"X-Total-Count": str(total)})


@router.get("/{id}", response_model=WebhookRead)
async def get_webhook(id: int, db: AsyncSession = Depends(get_db)):
    webhook = await webhook_crud.get(db, id)
    if not webhook:
        raise HTTPException(404, "Webhook not found")
    return webhook


@router.post("", response_model=WebhookRead, status_code=201)
@limiter.limit("30/minute")
async def create_webhook(request: Request, data: WebhookCreate, db: AsyncSession = Depends(get_db)):
    created = await webhook_crud.create(db, data.model_dump())
    try:
        await activity_crud.log_activity(db, "webhook", created.id, data.name, "created")
    except Exception:
        logger.warning("Failed to log activity for webhook create %s", created.id, exc_info=True)
    return created


@router.put("/{id}", response_model=WebhookRead)
@limiter.limit("30/minute")
async def update_webhook(request: Request, id: int, data: WebhookUpdate, db: AsyncSession = Depends(get_db)):
    old = await webhook_crud.get(db, id)
    if not old:
        raise HTTPException(404, "Webhook not found")
    update_fields = data.model_dump(exclude_unset=True)
    changes = compute_changes(old, update_fields)
    updated = await webhook_crud.update(db, id, update_fields)
    try:
        await activity_crud.log_activity(db, "webhook", id, updated.name, "updated", changes or update_fields)
    except Exception:
        logger.warning("Failed to log activity for webhook update %s", id, exc_info=True)
    return updated


@router.delete("/{id}", status_code=204)
@limiter.limit("30/minute")
async def delete_webhook(request: Request, id: int, db: AsyncSession = Depends(get_db)):
    webhook = await webhook_crud.get(db, id)
    if not webhook:
        raise HTTPException(404, "Webhook not found")
    await webhook_crud.delete(db, id)
    try:
        await activity_crud.log_activity(db, "webhook", id, webhook.name, "deleted")
    except Exception:
        logger.warning("Failed to log activity for webhook delete %s", id, exc_info=True)


@router.post("/bulk-delete", status_code=204)
@limiter.limit("30/minute")
async def bulk_delete_webhooks(request: Request, body: BulkDeleteRequest, db: AsyncSession = Depends(get_db)):
    await bulk_delete_entities(db, webhook_crud, "webhook", body.ids)


@router.post("/{id}/test", status_code=200)
@limiter.limit("10/minute")
async def test_webhook(request: Request, id: int, db: AsyncSession = Depends(get_db)):
    webhook = await webhook_crud.get(db, id)
    if not webhook:
        raise HTTPException(404, "Webhook not found")
    try:
        await dispatch_webhook(
            webhook.url,
            "test",
            {"message": "This is a test webhook from ServerAtlas."},
            webhook.secret,
        )
        return {"status": "sent"}
    except Exception as e:
        logger.warning("Webhook test failed for %s: %s", webhook.url, e, exc_info=True)
        return {"status": "failed", "error": str(e)}
