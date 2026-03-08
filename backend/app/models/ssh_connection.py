from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SshConnection(Base):
    __tablename__ = "ssh_connections"
    __table_args__ = (
        CheckConstraint("source_server_id != target_server_id", name="ck_no_self_connection"),
        UniqueConstraint("source_server_id", "target_server_id", name="uq_ssh_connection"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    source_server_id: Mapped[int] = mapped_column(ForeignKey("servers.id", ondelete="CASCADE"))
    target_server_id: Mapped[int] = mapped_column(ForeignKey("servers.id", ondelete="CASCADE"))
    ssh_key_id: Mapped[int | None] = mapped_column(ForeignKey("ssh_keys.id", ondelete="SET NULL"))
    ssh_user: Mapped[str | None] = mapped_column(String(255))
    ssh_port: Mapped[int] = mapped_column(Integer, default=22)
    purpose: Mapped[str | None] = mapped_column(String(512))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    source_server = relationship("Server", foreign_keys=[source_server_id], back_populates="source_connections")
    target_server = relationship("Server", foreign_keys=[target_server_id], back_populates="target_connections")
    ssh_key = relationship("SshKey")
