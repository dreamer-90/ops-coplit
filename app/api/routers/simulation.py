from fastapi import APIRouter, Depends
from app.api.dependencies import verify_token
from app.simulator import get_event_count, get_event_summaries
from app.services.operations import trigger_event_business_logic, reset_simulation_logic

router = APIRouter(prefix="/api/events", tags=["simulation"])

@router.get("")
async def list_events() -> dict:
    """Return metadata for all scripted events."""
    return {"count": get_event_count(), "events": get_event_summaries()}

@router.post("/{index}/trigger", dependencies=[Depends(verify_token)])
async def trigger_event(index: int) -> dict:
    """Trigger a scripted event, run it through the engine, return the decision."""
    return await trigger_event_business_logic(index)

@router.delete("/reset", dependencies=[Depends(verify_token)])
async def reset_decisions() -> dict:
    """Clear decision history — restart the demo."""
    return await reset_simulation_logic()
