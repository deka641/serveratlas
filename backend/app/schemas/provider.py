from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from app.schemas.server import ServerRead


class ProviderBase(BaseModel):
    name: str = Field(..., max_length=255)
    website: str | None = Field(None, max_length=512)
    support_contact: str | None = Field(None, max_length=2000)
    notes: str | None = Field(None, max_length=2000)


class ProviderCreate(ProviderBase):
    pass


class ProviderUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    website: str | None = Field(None, max_length=512)
    support_contact: str | None = Field(None, max_length=2000)
    notes: str | None = Field(None, max_length=2000)


class ProviderRead(ProviderBase):
    id: int
    created_at: datetime
    updated_at: datetime
    server_count: int = 0

    model_config = {"from_attributes": True}


class ProviderReadWithServers(ProviderRead):
    servers: list[ServerRead] = []
