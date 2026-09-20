from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import meta, workstreams, ws

app = FastAPI(
    title="Multi-Cloud Platform Console API",
    description=(
        "Reference multi-cloud platform/integration engineering console: "
        "tracks migration and integration workstreams across AWS/Azure/GCP, "
        "exposes risk/cost/latency signals, gates changes behind ADR-style "
        "review, and streams live updates over WebSocket."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(workstreams.router, prefix="/api")
app.include_router(meta.router, prefix="/api")
app.include_router(ws.router, prefix="/api")


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}
