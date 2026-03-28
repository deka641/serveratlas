from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from pydantic import BaseModel, Field, field_serializer

if TYPE_CHECKING:
    from app.schemas.server import ServerRead


class ProviderBase(BaseModel):
    name: str = Field(..., max_length=255)
    website: str | None = Field(None, max_length=512)
    support_contact: str | None = Field(None, max_length=2000)
    notes: str | None = Field(None, max_length=2000)
    monthly_budget: float | None = Field(None, ge=0)
    budget_currency: str | None = Field("EUR", max_length=3)


class ProviderCreate(ProviderBase):
    pass


class ProviderUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    website: str | None = Field(None, max_length=512)
    support_contact: str | None = Field(None, max_length=2000)
    notes: str | None = Field(None, max_length=2000)
    monthly_budget: float | None = None
    budget_currency: str | None = Field(None, max_length=3)


class ProviderRead(ProviderBase):
    id: int
    created_at: datetime
    updated_at: datetime
    server_count: int = 0

    model_config = {"from_attributes": True}

    @field_serializer('monthly_budget')
    @classmethod
    def serialize_budget(cls, v):
        return float(v) if v is not None else None


class ProviderReadWithServers(ProviderRead):
    servers: list[ServerRead] = []
