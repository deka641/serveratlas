import logging
from typing import Any, Callable, Awaitable

from fastapi import HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.activity import activity_crud

logger = logging.getLogger(__name__)


class BulkDeleteRequest(BaseModel):
    ids: list[int] = Field(..., max_length=100)


async def bulk_delete_entities(
    db: AsyncSession,
    crud: Any,
    entity_type: str,
    ids: list[int],
    name_getter: Callable[[Any], str] | None = None,
    entity_getter: Callable[[AsyncSession, int], Awaitable[Any]] | None = None,
) -> None:
    """Generic bulk-delete with activity logging. Maximum 100 items."""
    if len(ids) > 100:
        raise HTTPException(400, "Maximum 100 items per bulk delete request")
    for entity_id in ids:
        getter = entity_getter or crud.get
        entity = await getter(db, entity_id)
        if entity:
            entity_name = name_getter(entity) if name_getter else getattr(entity, 'name', f'#{entity_id}')
            await crud.delete(db, entity_id)
            try:
                await activity_crud.log_activity(db, entity_type, entity_id, entity_name, "deleted")
            except Exception:
                logger.warning("Failed to log activity for %s bulk-delete %s", entity_type, entity_id, exc_info=True)


def compute_changes(old_obj: Any, update_fields: dict[str, Any]) -> dict[str, dict[str, str]]:
    """Compare old object attributes with new values, returning structured diffs."""
    changes: dict[str, dict[str, str]] = {}
    for key, new_val in update_fields.items():
        old_val = getattr(old_obj, key, None)
        if hasattr(old_val, 'value'):
            old_val = old_val.value
        if str(old_val) != str(new_val):
            changes[key] = {"old": str(old_val), "new": str(new_val)}
    return changes
