from datetime import datetime

from pydantic import BaseModel


class SshConnectionBase(BaseModel):
    source_server_id: int
    target_server_id: int
    ssh_key_id: int | None = None
    ssh_user: str | None = None
    ssh_port: int = 22
    purpose: str | None = None
    notes: str | None = None


class SshConnectionCreate(SshConnectionBase):
    pass


class SshConnectionUpdate(BaseModel):
    source_server_id: int | None = None
    target_server_id: int | None = None
    ssh_key_id: int | None = None
    ssh_user: str | None = None
    ssh_port: int | None = None
    purpose: str | None = None
    notes: str | None = None


class SshConnectionRead(SshConnectionBase):
    id: int
    source_server_name: str | None = None
    target_server_name: str | None = None
    ssh_key_name: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class GraphNode(BaseModel):
    id: int
    name: str
    status: str
    ip_v4: str | None = None


class GraphEdge(BaseModel):
    source: int
    target: int
    ssh_user: str | None = None
    purpose: str | None = None


class ConnectivityGraph(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]
