from decimal import Decimal

from pydantic import BaseModel, field_serializer


class DashboardStats(BaseModel):
    total_servers: int = 0
    active_servers: int = 0
    unhealthy_servers: int = 0
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
    monthly_budget: Decimal | None = None
    budget_utilization_pct: float | None = None

    @field_serializer('total_cost')
    @classmethod
    def serialize_cost(cls, v):
        return float(v) if v is not None else None

    @field_serializer('monthly_budget')
    @classmethod
    def serialize_budget(cls, v):
        return float(v) if v is not None else None


class CurrencyTotal(BaseModel):
    currency: str
    amount: Decimal

    @field_serializer('amount')
    @classmethod
    def serialize_amount(cls, v):
        return float(v) if v is not None else None


class CostSummary(BaseModel):
    total_monthly_cost: Decimal = Decimal("0.00")
    by_provider: list[CostByProvider] = []
    totals_by_currency: list[CurrencyTotal] = []

    @field_serializer('total_monthly_cost')
    @classmethod
    def serialize_cost(cls, v):
        return float(v) if v is not None else None


class RecentBackup(BaseModel):
    id: int
    name: str
    source_server_name: str | None = None
    application_name: str | None = None
    last_run_status: str
    last_run_at: str | None = None


class BackupCoverage(BaseModel):
    total_applications: int = 0
    covered_applications: int = 0
    failed_backups_24h: int = 0
    uncovered_applications: list[str] = []


class OverdueBackup(BaseModel):
    id: int
    name: str
    frequency: str
    last_run_at: str | None = None
    source_server_name: str | None = None
    application_name: str | None = None
    hours_overdue: int = 0


class CostByTag(BaseModel):
    tag_id: int
    tag_name: str
    tag_color: str
    total_cost: Decimal
    currency: str
    server_count: int

    @field_serializer('total_cost')
    @classmethod
    def serialize_cost(cls, v):
        return float(v) if v is not None else None


class HealthSummary(BaseModel):
    total: int = 0
    healthy: int = 0
    unhealthy: int = 0
    unchecked: int = 0
    last_full_check: str | None = None


class EfficiencyMetric(BaseModel):
    provider_name: str
    cost_per_cpu: float | None = None
    cost_per_gb_ram: float | None = None
    cost_per_gb_disk: float | None = None
    avg_cost_per_server: float | None = None
    server_count: int = 0


class BatchHealthCheckResult(BaseModel):
    checked: int = 0
    healthy: int = 0
    unhealthy: int = 0
    skipped: int = 0
    errors: list[str] = []


class UndocumentedServer(BaseModel):
    id: int
    name: str


class DocumentationCoverage(BaseModel):
    total: int = 0
    documented: int = 0
    undocumented_servers: list[UndocumentedServer] = []
