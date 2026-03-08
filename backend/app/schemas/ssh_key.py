from datetime import datetime

from pydantic import BaseModel


class SshKeyBase(BaseModel):
    name: str
    key_type: str | None = None
    fingerprint: str | None = None
    public_key: str | None = None
    comment: str | None = None
    notes: str | None = None


class SshKeyCreate(SshKeyBase):
    pass


class SshKeyUpdate(BaseModel):
    name: str | None = None
    key_type: str | None = None
    fingerprint: str | None = None
    public_key: str | None = None
    comment: str | None = None
    notes: str | None = None


class SshKeyRead(SshKeyBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SshKeyReadWithServers(SshKeyRead):
    servers: list[dict] = []
