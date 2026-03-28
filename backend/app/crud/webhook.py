from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.models.webhook import Webhook


class WebhookCRUD(CRUDBase[Webhook]):
    async def get_active_for_event(self, db: AsyncSession, event: str) -> list[Webhook]:
        result = await db.execute(
            select(Webhook).where(
                Webhook.is_active == True,  # noqa: E712
            )
        )
        webhooks = list(result.scalars().all())
        # Filter in Python: events is comma-separated, check if event matches
        return [wh for wh in webhooks if event in [e.strip() for e in wh.events.split(",")]]


webhook_crud = WebhookCRUD(Webhook)
