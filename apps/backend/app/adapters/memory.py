"""Default `WorkstreamRepository` + `AuditLogPort` adapters: in-memory, zero
external dependencies, so the reference app runs with no database. Also owns
the pub/sub broadcast used by the WebSocket live-feed (`routers/ws.py`) and
the `history()` time series consumed by the Analytics tab.

Swap point: implement `WorkstreamRepository` against Postgres (see
`adapters/stubs.py::PostgresWorkstreamRepository` for the shape) and
register it in `factory.ADAPTER_REGISTRY["workstream_repository"]["postgres"]`
— nothing else in this file, or in `routers/`, needs to change.
"""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from typing import Any

from app.adapters.ports import AuditLogPort
from app.models import CloudProvider, ConsoleSummary, HistoryPoint, Workstream, WorkstreamStatus

_SEED_WORKSTREAMS: list[Workstream] = [
    Workstream(
        id="ws-001",
        name="Migrate EKS to AKS",
        status=WorkstreamStatus.BLOCKED,
        cloud=CloudProvider.AZURE,
        risk_score=78.5,
        monthly_cost_usd=14200.0,
        deploy_latency_ms=4100,
        owner="platform-infra",
    ),
    Workstream(
        id="ws-002",
        name="Consolidate observability",
        status=WorkstreamStatus.IN_REVIEW,
        cloud=CloudProvider.AWS,
        risk_score=34.0,
        monthly_cost_usd=3800.0,
        deploy_latency_ms=1600,
        owner="sre",
    ),
    Workstream(
        id="ws-003",
        name="RAG index Hermes docs",
        status=WorkstreamStatus.APPROVED,
        cloud=CloudProvider.GCP,
        risk_score=22.0,
        monthly_cost_usd=950.0,
        deploy_latency_ms=780,
        owner="platform-ai",
    ),
    Workstream(
        id="ws-004",
        name="Kafka topic partition redesign",
        status=WorkstreamStatus.DRAFT,
        cloud=CloudProvider.AWS,
        risk_score=41.5,
        monthly_cost_usd=2100.0,
        deploy_latency_ms=2200,
        owner="data-platform",
    ),
    Workstream(
        id="ws-005",
        name="Retire legacy Redis cache layer",
        status=WorkstreamStatus.DONE,
        cloud=CloudProvider.AZURE,
        risk_score=12.0,
        monthly_cost_usd=600.0,
        deploy_latency_ms=340,
        owner="platform-infra",
    ),
]


def _percentile(values: list[float], pct: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    idx = min(len(ordered) - 1, max(0, round(pct / 100 * (len(ordered) - 1))))
    return ordered[idx]


class InMemoryAuditLog:
    """Default `AuditLogPort` adapter. Swap for a Postgres append-only table
    (see `adapters/stubs.py::PostgresAuditLog`) without touching callers."""

    def __init__(self) -> None:
        self._events: list[dict[str, Any]] = []

    def record(self, event: str, actor: str, detail: dict[str, Any]) -> None:
        self._events.append(
            {"event": event, "actor": actor, "detail": detail, "at": datetime.now(UTC).isoformat()}
        )

    def all_events(self) -> list[dict[str, Any]]:
        return list(self._events)


class MemoryWorkstreamRepository:
    """Default `WorkstreamRepository` adapter (in-memory, async-safe via a lock)."""

    def __init__(self, audit_log: AuditLogPort) -> None:
        self._workstreams: dict[str, Workstream] = {w.id: w for w in _SEED_WORKSTREAMS}
        self._lock = asyncio.Lock()
        self._audit = audit_log
        self._subscribers: set[asyncio.Queue[Workstream]] = set()
        self._history: list[HistoryPoint] = [self._snapshot()]

    def _snapshot(self) -> HistoryPoint:
        items = list(self._workstreams.values())
        total = len(items) or 1
        return HistoryPoint(
            timestamp=datetime.now(UTC),
            total_workstreams=len(items),
            blocked=sum(1 for w in items if w.status == WorkstreamStatus.BLOCKED),
            in_review=sum(1 for w in items if w.status == WorkstreamStatus.IN_REVIEW),
            avg_risk_score=sum(w.risk_score for w in items) / total,
            total_monthly_cost_usd=sum(w.monthly_cost_usd for w in items),
        )

    def subscribe(self) -> asyncio.Queue[Workstream]:
        """Used by the WebSocket route to receive live updates."""
        queue: asyncio.Queue[Workstream] = asyncio.Queue()
        self._subscribers.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue[Workstream]) -> None:
        self._subscribers.discard(queue)

    def _broadcast(self, workstream: Workstream) -> None:
        for queue in self._subscribers:
            queue.put_nowait(workstream)

    async def list_workstreams(self) -> list[Workstream]:
        async with self._lock:
            return sorted(self._workstreams.values(), key=lambda w: w.id)

    async def get(self, workstream_id: str) -> Workstream | None:
        async with self._lock:
            return self._workstreams.get(workstream_id)

    async def approve(
        self, workstream_id: str, approved_by: str = "anonymous"
    ) -> Workstream | None:
        async with self._lock:
            ws = self._workstreams.get(workstream_id)
            if ws is None:
                return None
            updated = ws.model_copy(update={"status": WorkstreamStatus.APPROVED})
            self._workstreams[workstream_id] = updated
            self._history.append(self._snapshot())
        self._audit.record("workstream.approved", approved_by, {"workstream_id": workstream_id})
        self._broadcast(updated)
        return updated

    async def summary(self) -> ConsoleSummary:
        async with self._lock:
            items = list(self._workstreams.values())
        total = len(items)
        if total == 0:
            return ConsoleSummary(
                total_workstreams=0,
                in_review=0,
                blocked=0,
                avg_risk_score=0,
                avg_deploy_latency_ms=0,
                p95_deploy_latency_ms=0,
                total_monthly_cost_usd=0,
            )
        latencies = [w.deploy_latency_ms for w in items]
        return ConsoleSummary(
            total_workstreams=total,
            in_review=sum(1 for w in items if w.status == WorkstreamStatus.IN_REVIEW),
            blocked=sum(1 for w in items if w.status == WorkstreamStatus.BLOCKED),
            avg_risk_score=sum(w.risk_score for w in items) / total,
            avg_deploy_latency_ms=sum(latencies) / total,
            p95_deploy_latency_ms=_percentile(latencies, 95),
            total_monthly_cost_usd=sum(w.monthly_cost_usd for w in items),
        )

    async def history(self) -> list[HistoryPoint]:
        async with self._lock:
            return list(self._history)
