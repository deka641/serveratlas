import enum
from datetime import datetime

from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AppStatus(str, enum.Enum):
    running = "running"
    stopped = "stopped"
    error = "error"
    deploying = "deploying"


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (
        UniqueConstraint("name", "server_id", name="uq_app_name_server"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    server_id: Mapped[int] = mapped_column(ForeignKey("servers.id", ondelete="CASCADE"))
    app_type: Mapped[str | None] = mapped_column(String(255))
    port: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[AppStatus] = mapped_column(default=AppStatus.running)
    config_notes: Mapped[str | None] = mapped_column(Text)
    url: Mapped[str | None] = mapped_column(String(512))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    server = relationship("Server", back_populates="applications")
    backups = relationship("Backup", back_populates="application", cascade="all, delete-orphan")
