from datetime import UTC, datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class WorkstreamStatus(StrEnum):
    DRAFT = "draft"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    BLOCKED = "blocked"
    DONE = "done"


class CloudProvider(StrEnum):
    AWS = "aws"
    AZURE = "azure"
    GCP = "gcp"


class Workstream(BaseModel):
    id: str
    name: str
    status: WorkstreamStatus
    cloud: CloudProvider
    risk_score: float = Field(ge=0, le=100)
    monthly_cost_usd: float = Field(ge=0)
    deploy_latency_ms: float = Field(ge=0)
    owner: str
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ConsoleSummary(BaseModel):
    total_workstreams: int
    in_review: int
    blocked: int
    avg_risk_score: float
    avg_deploy_latency_ms: float
    p95_deploy_latency_ms: float
    total_monthly_cost_usd: float


class HistoryPoint(BaseModel):
    """One sample in the workstream-activity time series, used by Analytics."""

    timestamp: datetime
    total_workstreams: int
    blocked: int
    in_review: int
    avg_risk_score: float
    total_monthly_cost_usd: float
