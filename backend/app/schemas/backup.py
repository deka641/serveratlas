from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class BackupBase(BaseModel):
    name: str
    application_id: int | None = None
    source_server_id: int
    target_server_id: int | None = None
    frequency: Literal["hourly", "daily", "weekly", "monthly", "manual"] = "daily"
    retention_days: int | None = Field(None, ge=1, le=3650)
    storage_path: str | None = None
    last_run_at: datetime | None = None
    last_run_status: Literal["success", "failed", "running", "never_run"] = "never_run"
    notes: str | None = None


class BackupCreate(BackupBase):
    pass


class BackupUpdate(BaseModel):
    name: str | None = None
    application_id: int | None = None
    source_server_id: int | None = None
    target_server_id: int | None = None
    frequency: Literal["hourly", "daily", "weekly", "monthly", "manual"] | None = None
    retention_days: int | None = Field(None, ge=1, le=3650)
    storage_path: str | None = None
    last_run_at: datetime | None = None
    last_run_status: Literal["success", "failed", "running", "never_run"] | None = None
    notes: str | None = None


class BackupRead(BackupBase):
    id: int
    application_name: str | None = None
    source_server_name: str | None = None
    target_server_name: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
