from fastapi import APIRouter

from app.context import get_context_for_api
from app.services.dependencies import get_store

router = APIRouter(prefix="/api", tags=["data"])


@router.get("/context")
async def get_stadium_context() -> dict:
    """Return the full stadium knowledge base."""
    return get_context_for_api()


@router.get("/decisions")
async def list_decisions() -> dict:
    """Return all decisions made so far."""
    store = get_store()
    decisions = await store.get_decisions()
    return {
        "count": len(decisions),
        "decisions": [d.model_dump() for d in decisions],
    }


@router.get("/audit")
async def list_audit_log() -> dict:
    """Return the operational audit log."""
    store = get_store()
    logs = await store.get_audit_logs()
    return {
        "count": len(logs),
        "logs": [l.model_dump() for l in logs],
    }
