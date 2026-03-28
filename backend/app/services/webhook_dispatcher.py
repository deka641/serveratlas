import asyncio
import hashlib
import hmac
import json
import logging
import urllib.request

logger = logging.getLogger(__name__)


async def dispatch_webhook(url: str, event: str, payload: dict, secret: str | None = None):
    body = json.dumps({"event": event, "data": payload}).encode()
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "X-Webhook-Event": event,
        },
    )
    if secret:
        sig = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        req.add_header("X-Webhook-Signature", f"sha256={sig}")
    loop = asyncio.get_event_loop()
    try:
        await loop.run_in_executor(None, lambda: urllib.request.urlopen(req, timeout=10))
    except Exception as e:
        logger.warning("Webhook dispatch failed for %s: %s", url, e)


async def dispatch_event(db, event: str, payload: dict):
    from app.crud.webhook import webhook_crud

    webhooks = await webhook_crud.get_active_for_event(db, event)
    for wh in webhooks:
        asyncio.create_task(dispatch_webhook(wh.url, event, payload, wh.secret))
