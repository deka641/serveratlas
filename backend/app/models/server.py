import enum
from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ServerStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    maintenance = "maintenance"
    decommissioned = "decommissioned"


class Server(Base):
    __tablename__ = "servers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    provider_id: Mapped[int | None] = mapped_column(ForeignKey("providers.id", ondelete="SET NULL"))
    hostname: Mapped[str | None] = mapped_column(String(512))
    ip_v4: Mapped[str | None] = mapped_column(String(45))
    ip_v6: Mapped[str | None] = mapped_column(String(45))
    os: Mapped[str | None] = mapped_column(String(255))
    cpu_cores: Mapped[int | None] = mapped_column(Integer)
    ram_mb: Mapped[int | None] = mapped_column(Integer)
    disk_gb: Mapped[int | None] = mapped_column(Integer)
    location: Mapped[str | None] = mapped_column(String(255))
    datacenter: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[ServerStatus] = mapped_column(default=ServerStatus.active)
    monthly_cost: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    cost_currency: Mapped[str | None] = mapped_column(String(3), default="EUR")
    login_user: Mapped[str | None] = mapped_column(String(255))
    login_notes: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    documentation: Mapped[str | None] = mapped_column(Text)
    last_checked_at: Mapped[datetime | None] = mapped_column(nullable=True)
    last_check_status: Mapped[str | None] = mapped_column(String(20), default="unknown")
    response_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_audited_at: Mapped[datetime | None] = mapped_column(nullable=True)
    last_audited_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    provider = relationship("Provider", back_populates="servers")
    server_ssh_keys = relationship("ServerSshKey", back_populates="server", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="server", cascade="all, delete-orphan")
    source_connections = relationship(
        "SshConnection", foreign_keys="SshConnection.source_server_id",
        back_populates="source_server", cascade="all, delete-orphan"
    )
    target_connections = relationship(
        "SshConnection", foreign_keys="SshConnection.target_server_id",
        back_populates="target_server", cascade="all, delete-orphan"
    )
    source_backups = relationship(
        "Backup", foreign_keys="Backup.source_server_id",
        back_populates="source_server", cascade="all, delete-orphan"
    )
    target_backups = relationship(
        "Backup", foreign_keys="Backup.target_server_id",
        back_populates="target_server"
    )
    server_tags = relationship("ServerTag", back_populates="server", cascade="all, delete-orphan")
