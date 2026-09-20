"""Single wiring point: reads `ADAPTER_*` env vars and returns the concrete
adapter instance satisfying each port in `adapters/ports.py`. Routers only
ever import from here (via FastAPI `Depends`), never a concrete adapter
class directly — that indirection is what makes every roadmap-item swap a
one-line env var + registry change instead of a call-site rewrite.

To activate a stub (e.g. Postgres once implemented):
  1. Fill in the adapter class in `adapters/stubs.py`.
  2. Add it to `ADAPTER_REGISTRY` below (already present, commented where
     applicable).
  3. Set `ADAPTER_WORKSTREAM_REPOSITORY=postgres` (etc.) in the environment.
No changes to `routers/` or `main.py` are required.
"""

from __future__ import annotations

import os
from functools import lru_cache

from app.adapters.memory import InMemoryAuditLog, MemoryWorkstreamRepository
from app.adapters.noop import NoopTelemetry, OpenAuth
from app.adapters.ports import AuditLogPort, AuthPort, TelemetryPort, WorkstreamRepository

# Maps env-var value -> zero-arg factory. Postgres/OIDC/OTel/cloud entries
# are commented out because their constructors need config (a DSN, an
# issuer, cloud credentials) that isn't present in this reference
# deployment — wiring them in is the one-line change described above and
# in README.md.
ADAPTER_REGISTRY: dict[str, dict[str, str]] = {
    "workstream_repository": {"memory": "memory"},  # add "postgres" once configured
    "telemetry": {"noop": "noop"},  # add "otel" once configured
    "auth": {"open": "open"},  # add "oidc" once configured
}


@lru_cache
def get_audit_log() -> AuditLogPort:
    return InMemoryAuditLog()


@lru_cache
def get_workstream_repository() -> WorkstreamRepository:
    backend = os.getenv("ADAPTER_WORKSTREAM_REPOSITORY", "memory")
    if backend not in ADAPTER_REGISTRY["workstream_repository"]:
        raise ValueError(f"Unknown ADAPTER_WORKSTREAM_REPOSITORY={backend!r}")
    # Only "memory" is implemented in this reference build; see
    # adapters/stubs.py::PostgresWorkstreamRepository for the production shape.
    return MemoryWorkstreamRepository(audit_log=get_audit_log())


@lru_cache
def get_telemetry() -> TelemetryPort:
    backend = os.getenv("ADAPTER_TELEMETRY", "noop")
    if backend not in ADAPTER_REGISTRY["telemetry"]:
        raise ValueError(f"Unknown ADAPTER_TELEMETRY={backend!r}")
    return NoopTelemetry()


@lru_cache
def get_auth() -> AuthPort:
    backend = os.getenv("ADAPTER_AUTH", "open")
    if backend not in ADAPTER_REGISTRY["auth"]:
        raise ValueError(f"Unknown ADAPTER_AUTH={backend!r}")
    return OpenAuth()


def active_config() -> dict[str, str]:
    """Surfaced at `GET /api/config` and rendered on the Governance tab so
    the running app is honest about which adapters are live."""
    return {
        "workstream_repository": os.getenv("ADAPTER_WORKSTREAM_REPOSITORY", "memory"),
        "telemetry": os.getenv("ADAPTER_TELEMETRY", "noop"),
        "auth": os.getenv("ADAPTER_AUTH", "open"),
        "cloud_provider": os.getenv("ADAPTER_CLOUD_CREDENTIALS_PATH", "not configured"),
    }
