"""Stub adapters — NOT wired in by default. Each shows the exact shape a
production implementation must satisfy for one roadmap item. To activate
one: (1) fill in the `NotImplementedError` bodies, (2) add any new
dependency to requirements.txt, (3) register it in
`factory.ADAPTER_REGISTRY`, (4) set the matching `ADAPTER_*` env var.
See README.md → "Adapter / Plugin Architecture" for the full walkthrough.
"""

from __future__ import annotations

from typing import Any

from app.adapters.ports import AuditLogPort, AuthPort, CloudProviderPort, TelemetryPort
from app.models import Workstream


class PostgresWorkstreamRepository:
    """Roadmap item 1 (partial): swap-in for `MemoryWorkstreamRepository`.

    Needs: `asyncpg` or `sqlalchemy[asyncio]` in requirements.txt, a
    `workstreams` table matching `Workstream`'s fields, a `workstream_history`
    table matching `HistoryPoint`, and a DSN from `ADAPTER_POSTGRES_DSN`.
    Must satisfy `adapters.ports.WorkstreamRepository` exactly (same 5 methods).
    """

    def __init__(self, dsn: str) -> None:
        self._dsn = dsn

    async def list_workstreams(self) -> list[Workstream]:
        raise NotImplementedError("Implement against a real Postgres pool.")


class PostgresAuditLog(AuditLogPort):
    """Roadmap item 1 (ADR/audit-trail half): append-only table, never
    UPDATE/DELETE. Needs: an `audit_events` table (event, actor, detail
    JSONB, at timestamptz) and the same Postgres DSN as
    `PostgresWorkstreamRepository`."""

    def __init__(self, dsn: str) -> None:
        self._dsn = dsn

    def record(self, event: str, actor: str, detail: dict[str, Any]) -> None:
        raise NotImplementedError("Implement an INSERT-only write against Postgres.")

    def all_events(self) -> list[dict[str, Any]]:
        raise NotImplementedError("Implement a read against Postgres.")


class MultiCloudCostExplorer(CloudProviderPort):
    """Roadmap item 2: real AWS Cost Explorer / Azure Cost Management / GCP
    Billing integration, replacing the seeded `monthly_cost_usd` figures.
    Needs: `boto3` (AWS), `azure-mgmt-costmanagement` (Azure), and/or
    `google-cloud-billing` (GCP) in requirements.txt, plus
    `ADAPTER_CLOUD_CREDENTIALS_PATH` pointing at the relevant credential
    bundle for whichever clouds are enabled.
    """

    def __init__(self, credentials_path: str) -> None:
        self._credentials_path = credentials_path

    async def sync_cost_and_usage(self, workstream_id: str) -> dict[str, Any]:
        raise NotImplementedError(
            "Call the relevant cloud billing API for this workstream's `cloud` "
            "field and map the response into monthly_cost_usd/deploy_latency_ms."
        )


class OtelTelemetry(TelemetryPort):
    """Roadmap item 3: real spans/metrics via OpenTelemetry, exported to
    Grafana/Tempo. Needs: `opentelemetry-sdk`,
    `opentelemetry-exporter-otlp` in requirements.txt, and
    `ADAPTER_OTEL_EXPORTER_ENDPOINT`.
    """

    def __init__(self, exporter_endpoint: str) -> None:
        self._endpoint = exporter_endpoint

    def start_span(self, name: str) -> Any:
        raise NotImplementedError("Wrap opentelemetry.trace.get_tracer(...).start_as_current_span.")

    def record_metric(self, name: str, value: float, **tags: str) -> None:
        raise NotImplementedError("Record against an OTel Meter instrument.")


class OidcAuth(AuthPort):
    """Roadmap item 4: OIDC-backed identity, scoping `approve` to an
    `approver` role and recording the real identity in the audit log
    instead of `"anonymous"`. Needs: `python-jose` or `authlib` in
    requirements.txt, and `ADAPTER_OIDC_ISSUER` / `ADAPTER_OIDC_AUDIENCE`.
    `require_role` should raise `fastapi.HTTPException(403)` on mismatch.
    """

    def __init__(self, issuer: str, audience: str) -> None:
        self._issuer = issuer
        self._audience = audience

    async def current_user(self, token: str | None) -> str:
        raise NotImplementedError("Validate the bearer JWT against the OIDC issuer's JWKS.")

    async def require_role(self, token: str | None, role: str) -> str:
        raise NotImplementedError("Validate the token, then check `role` is in its claims.")
