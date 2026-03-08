from app.schemas.application import ApplicationCreate, ApplicationRead, ApplicationUpdate
from app.schemas.backup import BackupCreate, BackupRead, BackupUpdate
from app.schemas.dashboard import CostByProvider, CostSummary, DashboardStats
from app.schemas.provider import ProviderCreate, ProviderRead, ProviderReadWithServers, ProviderUpdate
from app.schemas.server import ServerCreate, ServerRead, ServerReadDetail, ServerUpdate
from app.schemas.server_ssh_key import ServerSshKeyCreate, ServerSshKeyRead
from app.schemas.ssh_connection import (
    ConnectivityGraph, GraphEdge, GraphNode,
    SshConnectionCreate, SshConnectionRead, SshConnectionUpdate,
)
from app.schemas.ssh_key import SshKeyCreate, SshKeyRead, SshKeyReadWithServers, SshKeyUpdate

# Rebuild models with forward references
ProviderReadWithServers.model_rebuild()
ServerReadDetail.model_rebuild()
