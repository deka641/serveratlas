from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from pydantic import BaseModel

if TYPE_CHECKING:
    from app.schemas.server import ServerRead


class ProviderBase(BaseModel):
    name: str
    website: str | None = None
    support_contact: str | None = None
    notes: str | None = None


class ProviderCreate(ProviderBase):
    pass


class ProviderUpdate(BaseModel):
    name: str | None = None
    website: str | None = None
    support_contact: str | None = None
    notes: str | None = None


class ProviderRead(ProviderBase):
    id: int
    created_at: datetime
    updated_at: datetime
    server_count: int = 0

    model_config = {"from_attributes": True}


class ProviderReadWithServers(ProviderRead):
    servers: list[ServerRead] = []
