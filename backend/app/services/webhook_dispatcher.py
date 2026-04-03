import asyncio
import hashlib
import hmac
import json
import logging
import urllib.request
import uuid
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

_MAX_RETRIES = 3
_BACKOFF_BASE = 1  # seconds: 1, 4, 16


async def dispatch_webhook(url: str, event: str, payload: dict, secret: str | None = None):
    delivery_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()
    body = json.dumps({
        "event": event,
        "data": payload,
        "timestamp": timestamp,
        "delivery_id": delivery_id,
    }).encode()
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "X-Webhook-Event": event,
            "X-Webhook-Delivery": delivery_id,
        },
    )
    if secret:
        sig = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        req.add_header("X-Webhook-Signature", f"sha256={sig}")
    loop = asyncio.get_event_loop()
    last_error = None
    for attempt in range(_MAX_RETRIES):
        try:
            await loop.run_in_executor(None, lambda: urllib.request.urlopen(req, timeout=10))
            return  # success
        except Exception as e:
            last_error = e
            if attempt < _MAX_RETRIES - 1:
                delay = _BACKOFF_BASE * (4 ** attempt)  # 1s, 4s, 16s
                logger.warning("Webhook dispatch attempt %d/%d failed for %s: %s — retrying in %ds",
                               attempt + 1, _MAX_RETRIES, url, e, delay)
                await asyncio.sleep(delay)
    logger.error("Webhook dispatch failed permanently for %s after %d attempts: %s", url, _MAX_RETRIES, last_error)


async def dispatch_event(db, event: str, payload: dict):
    from app.crud.webhook import webhook_crud

    webhooks = await webhook_crud.get_active_for_event(db, event)
    for wh in webhooks:
        asyncio.create_task(dispatch_webhook(wh.url, event, payload, wh.secret))
