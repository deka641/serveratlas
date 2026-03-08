from datetime import datetime

from pydantic import BaseModel


class BackupBase(BaseModel):
    name: str
    application_id: int | None = None
    source_server_id: int
    target_server_id: int | None = None
    frequency: str = "daily"
    retention_days: int | None = None
    storage_path: str | None = None
    last_run_at: datetime | None = None
    last_run_status: str = "never_run"
    notes: str | None = None


class BackupCreate(BackupBase):
    pass


class BackupUpdate(BaseModel):
    name: str | None = None
    application_id: int | None = None
    source_server_id: int | None = None
    target_server_id: int | None = None
    frequency: str | None = None
    retention_days: int | None = None
    storage_path: str | None = None
    last_run_at: datetime | None = None
    last_run_status: str | None = None
    notes: str | None = None


class BackupRead(BackupBase):
    id: int
    application_name: str | None = None
    source_server_name: str | None = None
    target_server_name: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
