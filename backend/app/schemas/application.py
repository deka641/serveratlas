from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class ApplicationBase(BaseModel):
    name: str
    server_id: int
    app_type: str | None = None
    port: int | None = Field(None, ge=1, le=65535)
    status: Literal["running", "stopped", "error", "deploying"] = "running"
    config_notes: str | None = None
    url: str | None = None
    notes: str | None = None

    @field_validator('url')
    @classmethod
    def validate_url(cls, v):
        if v is None or v == "":
            return None
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
        return v


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationUpdate(BaseModel):
    name: str | None = None
    server_id: int | None = None
    app_type: str | None = None
    port: int | None = Field(None, ge=1, le=65535)
    status: Literal["running", "stopped", "error", "deploying"] | None = None
    config_notes: str | None = None
    url: str | None = None
    notes: str | None = None

    @field_validator('url')
    @classmethod
    def validate_url(cls, v):
        if v is None or v == "":
            return None
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
        return v


class ApplicationRead(ApplicationBase):
    id: int
    server_name: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
