from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Literal

from pydantic import BaseModel, Field, field_serializer

if TYPE_CHECKING:
    from app.schemas.application import ApplicationRead
    from app.schemas.server_ssh_key import ServerSshKeyRead


class ServerBase(BaseModel):
    name: str
    provider_id: int | None = None
    hostname: str | None = None
    ip_v4: str | None = None
    ip_v6: str | None = None
    os: str | None = None
    cpu_cores: int | None = Field(None, ge=1)
    ram_mb: int | None = Field(None, ge=1)
    disk_gb: int | None = Field(None, ge=1)
    location: str | None = None
    datacenter: str | None = None
    status: Literal["active", "inactive", "maintenance", "decommissioned"] = "active"
    monthly_cost: Decimal | None = None
    cost_currency: str | None = "EUR"

    @field_serializer('monthly_cost')
    @classmethod
    def serialize_cost(cls, v):
        return float(v) if v is not None else None
    login_user: str | None = None
    login_notes: str | None = None
    notes: str | None = None


class ServerCreate(ServerBase):
    pass


class ServerUpdate(BaseModel):
    name: str | None = None
    provider_id: int | None = None
    hostname: str | None = None
    ip_v4: str | None = None
    ip_v6: str | None = None
    os: str | None = None
    cpu_cores: int | None = Field(None, ge=1)
    ram_mb: int | None = Field(None, ge=1)
    disk_gb: int | None = Field(None, ge=1)
    location: str | None = None
    datacenter: str | None = None
    status: Literal["active", "inactive", "maintenance", "decommissioned"] | None = None
    monthly_cost: Decimal | None = None
    cost_currency: str | None = None
    login_user: str | None = None
    login_notes: str | None = None
    notes: str | None = None


class ServerRead(ServerBase):
    id: int
    provider_name: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ServerReadDetail(ServerRead):
    applications: list[ApplicationRead] = []
    ssh_keys: list[ServerSshKeyRead] = []
