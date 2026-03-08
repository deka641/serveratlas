from decimal import Decimal

from pydantic import BaseModel, field_serializer


class DashboardStats(BaseModel):
    total_servers: int = 0
    active_servers: int = 0
    total_providers: int = 0
    total_applications: int = 0
    total_ssh_keys: int = 0
    total_backups: int = 0
    failing_backups: int = 0


class CostByProvider(BaseModel):
    provider_name: str
    total_cost: Decimal
    currency: str
    server_count: int

    @field_serializer('total_cost')
    @classmethod
    def serialize_cost(cls, v):
        return float(v) if v is not None else None


class CostSummary(BaseModel):
    total_monthly_cost: Decimal = Decimal("0.00")
    by_provider: list[CostByProvider] = []

    @field_serializer('total_monthly_cost')
    @classmethod
    def serialize_cost(cls, v):
        return float(v) if v is not None else None
