from datetime import datetime
from decimal import Decimal

from sqlalchemy import Integer, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class InfrastructureSnapshot(Base):
    __tablename__ = "infrastructure_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True)
    snapshot_date: Mapped[datetime] = mapped_column(server_default=func.now())
    total_servers: Mapped[int] = mapped_column(Integer, default=0)
    active_servers: Mapped[int] = mapped_column(Integer, default=0)
    healthy_count: Mapped[int] = mapped_column(Integer, default=0)
    unhealthy_count: Mapped[int] = mapped_column(Integer, default=0)
    total_monthly_cost: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    backup_coverage_pct: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    documentation_coverage_pct: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    audit_compliance_pct: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
