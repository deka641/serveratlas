from datetime import datetime

from sqlalchemy import ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    color: Mapped[str] = mapped_column(String(7), default="#6b7280")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    server_tags = relationship("ServerTag", back_populates="tag", cascade="all, delete-orphan")


class ServerTag(Base):
    __tablename__ = "server_tags"

    server_id: Mapped[int] = mapped_column(ForeignKey("servers.id", ondelete="CASCADE"), primary_key=True)
    tag_id: Mapped[int] = mapped_column(ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)

    server = relationship("Server", back_populates="server_tags")
    tag = relationship("Tag", back_populates="server_tags")
