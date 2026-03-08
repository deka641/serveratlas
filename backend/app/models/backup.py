import enum
from datetime import datetime

from sqlalchemy import ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class BackupFrequency(str, enum.Enum):
    hourly = "hourly"
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"
    manual = "manual"


class BackupStatus(str, enum.Enum):
    success = "success"
    failed = "failed"
    running = "running"
    never_run = "never_run"


class Backup(Base):
    __tablename__ = "backups"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    application_id: Mapped[int | None] = mapped_column(ForeignKey("applications.id", ondelete="SET NULL"))
    source_server_id: Mapped[int] = mapped_column(ForeignKey("servers.id", ondelete="CASCADE"))
    target_server_id: Mapped[int | None] = mapped_column(ForeignKey("servers.id", ondelete="SET NULL"))
    frequency: Mapped[BackupFrequency] = mapped_column(default=BackupFrequency.daily)
    retention_days: Mapped[int | None] = mapped_column(Integer)
    storage_path: Mapped[str | None] = mapped_column(String(1024))
    last_run_at: Mapped[datetime | None] = mapped_column()
    last_run_status: Mapped[BackupStatus] = mapped_column(default=BackupStatus.never_run)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    application = relationship("Application", back_populates="backups")
    source_server = relationship("Server", foreign_keys=[source_server_id], back_populates="source_backups")
    target_server = relationship("Server", foreign_keys=[target_server_id], back_populates="target_backups")
