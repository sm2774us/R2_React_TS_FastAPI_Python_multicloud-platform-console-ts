"""Default no-op adapters for ports this reference app doesn't need active
by default, but that routers/services are already wired to call — so
turning on a real implementation (OTel, OIDC) is a factory-registration
change, not a call-site change.
"""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager


class NoopTelemetry:
    """Default `TelemetryPort`. Swap for `adapters/stubs.py::OtelTelemetry`
    (roadmap item 3) to export real spans/metrics to Grafana/Tempo."""

    @contextmanager
    def start_span(self, name: str) -> Iterator[None]:
        yield None

    def record_metric(self, name: str, value: float, **tags: str) -> None:
        return None


class OpenAuth:
    """Default `AuthPort`: every caller is `"anonymous"` with every role.
    Swap for `adapters/stubs.py::OidcAuth` (roadmap item 4) to enforce real
    OIDC-issued, role-scoped identities on `POST /api/workstreams/{id}/approve`."""

    async def current_user(self, token: str | None) -> str:
        return "anonymous"

    async def require_role(self, token: str | None, role: str) -> str:
        return "anonymous"
