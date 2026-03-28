from __future__ import annotations

import ipaddress
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Literal

from pydantic import BaseModel, Field, field_serializer, field_validator

from app.schemas.tag import TagRead

if TYPE_CHECKING:
    from app.schemas.application import ApplicationRead
    from app.schemas.server_ssh_key import ServerSshKeyRead


def _validate_ip(v: str | None, version: int) -> str | None:
    if v is None or v == "":
        return None
    try:
        addr = ipaddress.ip_address(v)
        if addr.version != version:
            raise ValueError(f"Expected IPv{version} address")
    except ValueError as e:
        raise ValueError(f"Invalid IPv{version} address: {e}")
    return v


class ServerBase(BaseModel):
    name: str = Field(..., max_length=255)
    provider_id: int | None = None
    hostname: str | None = Field(None, max_length=512)
    ip_v4: str | None = None
    ip_v6: str | None = None
    os: str | None = Field(None, max_length=255)
    cpu_cores: int | None = Field(None, ge=1)
    ram_mb: int | None = Field(None, ge=1)
    disk_gb: int | None = Field(None, ge=1)
    location: str | None = Field(None, max_length=255)
    datacenter: str | None = Field(None, max_length=255)
    status: Literal["active", "inactive", "maintenance", "decommissioned"] = "active"
    monthly_cost: Decimal | None = Field(None, ge=0)
    cost_currency: str | None = Field("EUR", max_length=3)

    @field_serializer('monthly_cost')
    @classmethod
    def serialize_cost(cls, v):
        return float(v) if v is not None else None

    @field_validator('ip_v4')
    @classmethod
    def validate_ipv4(cls, v):
        return _validate_ip(v, 4)

    @field_validator('ip_v6')
    @classmethod
    def validate_ipv6(cls, v):
        return _validate_ip(v, 6)

    login_user: str | None = Field(None, max_length=255)
    login_notes: str | None = Field(None, max_length=2000)
    notes: str | None = Field(None, max_length=2000)
    documentation: str | None = Field(None, max_length=65535)


class ServerCreate(ServerBase):
    pass


class ServerUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    provider_id: int | None = None
    hostname: str | None = Field(None, max_length=512)
    ip_v4: str | None = None
    ip_v6: str | None = None
    os: str | None = Field(None, max_length=255)
    cpu_cores: int | None = Field(None, ge=1)
    ram_mb: int | None = Field(None, ge=1)
    disk_gb: int | None = Field(None, ge=1)
    location: str | None = Field(None, max_length=255)
    datacenter: str | None = Field(None, max_length=255)
    status: Literal["active", "inactive", "maintenance", "decommissioned"] | None = None
    monthly_cost: Decimal | None = Field(None, ge=0)
    cost_currency: str | None = Field(None, max_length=3)
    login_user: str | None = Field(None, max_length=255)
    login_notes: str | None = Field(None, max_length=2000)
    notes: str | None = Field(None, max_length=2000)
    documentation: str | None = Field(None, max_length=65535)

    @field_validator('ip_v4')
    @classmethod
    def validate_ipv4(cls, v):
        return _validate_ip(v, 4)

    @field_validator('ip_v6')
    @classmethod
    def validate_ipv6(cls, v):
        return _validate_ip(v, 6)


class HealthCheckUpdate(BaseModel):
    status: Literal["healthy", "unhealthy"] = "healthy"
    response_time_ms: int | None = None


class ServerRead(ServerBase):
    id: int
    provider_name: str | None = None
    tags: list[TagRead] = []
    last_checked_at: datetime | None = None
    last_check_status: str | None = "unknown"
    response_time_ms: int | None = None
    last_audited_at: datetime | None = None
    last_audited_by: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ServerReadDetail(ServerRead):
    applications: list[ApplicationRead] = []
    ssh_keys: list[ServerSshKeyRead] = []
