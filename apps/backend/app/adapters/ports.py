"""Adapter ports — the swap points this platform is designed around.

Every port below is a `Protocol`: routers depend only on these shapes, never
on a concrete implementation. `factory.py` is the single place that decides,
from environment variables, which concrete adapter satisfies each port. To
swap an adapter in production you implement the Protocol and register it in
`factory.ADAPTER_REGISTRY` — nothing in `routers/` or `main.py` changes.
See README.md → "Adapter / Plugin Architecture" for the full swap-in guide
for each of the five roadmap items this was built to support.
"""

from __future__ import annotations

from typing import Any, Protocol

from app.models import ConsoleSummary, HistoryPoint, Workstream


class WorkstreamRepository(Protocol):
    """Swap point for roadmap item 1: a Postgres-backed workstream registry
    with an append-only ADR/change-log table.

    The in-memory `MemoryWorkstreamRepository` (adapters/memory.py) is the
    default. A production adapter (`PostgresWorkstreamRepository`, stubbed
    in adapters/stubs.py) implements the same shape against a real database.
    """

    async def list_workstreams(self) -> list[Workstream]: ...
    async def get(self, workstream_id: str) -> Workstream | None: ...
    async def approve(
        self, workstream_id: str, approved_by: str = "anonymous"
    ) -> Workstream | None: ...
    async def summary(self) -> ConsoleSummary: ...
    async def history(self) -> list[HistoryPoint]: ...


class CloudProviderPort(Protocol):
    """Swap point for roadmap item 2: real AWS/Azure/GCP cost & resource
    APIs (Cost Explorer, Azure Cost Management, GCP Billing) replacing the
    mock cost/latency figures seeded into the reference app.
    """

    async def sync_cost_and_usage(self, workstream_id: str) -> dict[str, Any]: ...


class TelemetryPort(Protocol):
    """Swap point for roadmap item 3: OpenTelemetry traces → Grafana/Tempo."""

    def start_span(self, name: str) -> Any: ...
    def record_metric(self, name: str, value: float, **tags: str) -> None: ...


class AuthPort(Protocol):
    """Swap point for roadmap item 4: OIDC-backed role-scoped auth."""

    async def current_user(self, token: str | None) -> str: ...
    async def require_role(self, token: str | None, role: str) -> str: ...


class AuditLogPort(Protocol):
    """Append-only audit trail — part of roadmap item 1.

    Every `approve()` call in `MemoryWorkstreamRepository` writes through
    this port so the audit trail exists (in-memory today) independent of
    which `WorkstreamRepository` backs the actual workstream state.
    """

    def record(self, event: str, actor: str, detail: dict[str, Any]) -> None: ...
    def all_events(self) -> list[dict[str, Any]]: ...
