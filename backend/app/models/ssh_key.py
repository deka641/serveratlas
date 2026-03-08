import enum
from datetime import datetime

from sqlalchemy import String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SshKeyType(str, enum.Enum):
    rsa = "rsa"
    ed25519 = "ed25519"
    ecdsa = "ecdsa"
    dsa = "dsa"


class SshKey(Base):
    __tablename__ = "ssh_keys"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    key_type: Mapped[SshKeyType | None] = mapped_column()
    fingerprint: Mapped[str | None] = mapped_column(String(512))
    public_key: Mapped[str | None] = mapped_column(Text)
    comment: Mapped[str | None] = mapped_column(String(512))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    server_ssh_keys = relationship("ServerSshKey", back_populates="ssh_key", cascade="all, delete-orphan")
