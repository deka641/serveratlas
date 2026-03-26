from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class SshKeyBase(BaseModel):
    name: str = Field(..., max_length=255)
    key_type: Literal["rsa", "ed25519", "ecdsa", "dsa"] | None = None
    fingerprint: str | None = Field(None, max_length=512)
    public_key: str | None = Field(None, max_length=65535)
    comment: str | None = Field(None, max_length=255)
    notes: str | None = Field(None, max_length=2000)


class SshKeyCreate(SshKeyBase):
    pass


class SshKeyUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    key_type: Literal["rsa", "ed25519", "ecdsa", "dsa"] | None = None
    fingerprint: str | None = Field(None, max_length=512)
    public_key: str | None = Field(None, max_length=65535)
    comment: str | None = Field(None, max_length=255)
    notes: str | None = Field(None, max_length=2000)


class SshKeyRead(SshKeyBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SshKeyReadWithServers(SshKeyRead):
    servers: list[dict] = []
