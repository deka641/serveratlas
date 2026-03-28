from pydantic import BaseModel


class HealthCheckRead(BaseModel):
    id: int
    server_id: int
    status: str
    response_time_ms: int | None = None
    checked_at: str

    model_config = {"from_attributes": True}


class UptimeStats(BaseModel):
    total_checks: int = 0
    healthy_checks: int = 0
    uptime_pct: float | None = None
    avg_response_ms: int | None = None
    period_days: int = 30
