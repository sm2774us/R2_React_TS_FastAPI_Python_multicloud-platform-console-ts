from fastapi import APIRouter, Depends, HTTPException

from app.adapters.factory import get_workstream_repository
from app.adapters.ports import WorkstreamRepository
from app.models import ConsoleSummary, HistoryPoint, Workstream

router = APIRouter(tags=["workstreams"])


@router.get("/workstreams", response_model=list[Workstream])
async def list_workstreams(
    repo: WorkstreamRepository = Depends(get_workstream_repository),
) -> list[Workstream]:
    return await repo.list_workstreams()


@router.get("/summary", response_model=ConsoleSummary)
async def get_summary(
    repo: WorkstreamRepository = Depends(get_workstream_repository),
) -> ConsoleSummary:
    return await repo.summary()


@router.get("/history", response_model=list[HistoryPoint])
async def get_history(
    repo: WorkstreamRepository = Depends(get_workstream_repository),
) -> list[HistoryPoint]:
    return await repo.history()


@router.post("/workstreams/{workstream_id}/approve", response_model=Workstream)
async def approve_workstream(
    workstream_id: str, repo: WorkstreamRepository = Depends(get_workstream_repository)
) -> Workstream:
    updated = await repo.approve(workstream_id)
    if updated is None:
        raise HTTPException(status_code=404, detail=f"Workstream '{workstream_id}' not found")
    return updated
