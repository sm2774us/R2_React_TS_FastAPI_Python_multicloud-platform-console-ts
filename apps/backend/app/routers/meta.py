"""Exposes the platform's own governance metadata: which adapter backs each
port right now (`/config`), and the append-only audit trail (`/audit`).
Rendered by the frontend's Governance tab so the app is self-describing
about its own pluggability — see README.md → "Adapter / Plugin Architecture".
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from app.adapters.factory import active_config, get_audit_log
from app.adapters.ports import AuditLogPort

router = APIRouter(tags=["meta"])


@router.get("/config")
def get_config() -> dict[str, str]:
    return active_config()


@router.get("/audit")
def get_audit(audit: AuditLogPort = Depends(get_audit_log)) -> list[dict[str, Any]]:
    return audit.all_events()
