from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, field_serializer


class SnapshotRead(BaseModel):
    id: int
    snapshot_date: datetime
    total_servers: int
    active_servers: int
    healthy_count: int
    unhealthy_count: int
    total_monthly_cost: Decimal | None
    backup_coverage_pct: Decimal | None
    documentation_coverage_pct: Decimal | None
    audit_compliance_pct: Decimal | None

    model_config = {"from_attributes": True}

    @field_serializer('total_monthly_cost', 'backup_coverage_pct', 'documentation_coverage_pct', 'audit_compliance_pct')
    @classmethod
    def serialize_decimal(cls, v):
        return float(v) if v is not None else None
