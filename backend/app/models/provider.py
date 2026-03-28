from datetime import datetime

from decimal import Decimal

from sqlalchemy import Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Provider(Base):
    __tablename__ = "providers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    website: Mapped[str | None] = mapped_column(String(512))
    support_contact: Mapped[str | None] = mapped_column(String(512))
    notes: Mapped[str | None] = mapped_column(Text)
    monthly_budget: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    budget_currency: Mapped[str | None] = mapped_column(String(3), default="EUR")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    servers = relationship("Server", back_populates="provider")
