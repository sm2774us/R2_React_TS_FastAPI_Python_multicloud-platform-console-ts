"""Live-feed WebSocket. Broadcasts a `Workstream` payload every time
`MemoryWorkstreamRepository.approve()` mutates a workstream — the
frontend's Workstreams and Overview tabs subscribe to this instead of
polling, and the header's "● live" indicator reflects this socket's
connection state.

Swapping the workstream-repository adapter (roadmap item 1) preserves this
route unchanged as long as the new adapter also exposes
`subscribe`/`unsubscribe` (the in-memory pub/sub shown here is not part of
the `WorkstreamRepository` Protocol on purpose — a Postgres-backed adapter
would instead use `LISTEN/NOTIFY` or a message bus and adapt to the same
queue interface).
"""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.adapters.factory import get_workstream_repository
from app.adapters.memory import MemoryWorkstreamRepository

router = APIRouter(tags=["live"])


@router.websocket("/ws/workstreams")
async def workstreams_feed(websocket: WebSocket) -> None:
    await websocket.accept()
    repo = get_workstream_repository()
    if not isinstance(repo, MemoryWorkstreamRepository):
        await websocket.close(code=1011, reason="Live feed unsupported by this adapter")
        return

    queue = repo.subscribe()
    try:
        while True:
            try:
                workstream = await asyncio.wait_for(queue.get(), timeout=30)
                await websocket.send_json(workstream.model_dump(mode="json"))
            except TimeoutError:
                await websocket.send_json({"type": "keepalive"})
    except WebSocketDisconnect:
        pass
    finally:
        repo.unsubscribe(queue)
