from datetime import datetime

from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ServerSshKey(Base):
    __tablename__ = "server_ssh_keys"
    __table_args__ = (
        UniqueConstraint("server_id", "ssh_key_id", name="uq_server_ssh_key"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    server_id: Mapped[int] = mapped_column(ForeignKey("servers.id", ondelete="CASCADE"))
    ssh_key_id: Mapped[int] = mapped_column(ForeignKey("ssh_keys.id", ondelete="CASCADE"))
    is_authorized: Mapped[bool] = mapped_column(Boolean, default=True)
    is_host_key: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str | None] = mapped_column(String(512))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    server = relationship("Server", back_populates="server_ssh_keys")
    ssh_key = relationship("SshKey", back_populates="server_ssh_keys")
