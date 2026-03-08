from datetime import datetime

from pydantic import BaseModel


class ServerSshKeyBase(BaseModel):
    is_authorized: bool = True
    is_host_key: bool = False
    notes: str | None = None


class ServerSshKeyCreate(ServerSshKeyBase):
    pass


class ServerSshKeyRead(ServerSshKeyBase):
    id: int
    server_id: int
    ssh_key_id: int
    ssh_key_name: str | None = None
    server_name: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
