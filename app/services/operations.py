import json
from datetime import datetime, timezone

from fastapi import HTTPException

from app.engine import process_event as engine_process_event
from app.schemas import (AuditLogRecord, DispatchRequest, EmergencyState,
                         EngineDecision, ScramRequest)
from app.services.dependencies import get_store
from app.simulator import get_event

from app.logger import logger


async def broadcast_decision(decision: EngineDecision) -> None:
    store = get_store()
    payload = json.dumps({"type": "decision", "data": decision.model_dump()})
    await store.publish("broadcast_channel", payload)


async def broadcast_state(state: EmergencyState) -> None:
    store = get_store()
    payload = json.dumps({"type": "emergency_state", "data": state.model_dump()})
    await store.publish("broadcast_channel", payload)


async def trigger_event_business_logic(index: int) -> dict:
    store = get_store()
    event = get_event(index)
    if event is None:
        raise HTTPException(status_code=404, detail="Event index not found")

    logger.info("Triggering event %d: %s", index, event.event_id)

    # Note: `process_event` currently takes `decision_history` and `emergency_state` objects.
    # To decouple, we'll fetch them from the store.
    # Wait, process_event in engine.py might need adapting if it relies on synchronous methods.
    # We will pass the lists for compatibility, then save the decision.
    decisions = await store.get_decisions()
    current_state = await store.get_emergency_state()

    # We need a mock object that mimics decision_history for the engine
    class MockDecisionHistory:
        def __init__(self, ds) -> None:
            self.decisions = ds

    decision = await engine_process_event(
        event, MockDecisionHistory(decisions), current_state
    )

    await store.add_decision(decision)
    await broadcast_decision(decision)

    return {
        "event": event.model_dump(),
        "decision": decision.model_dump(),
    }


from app.config import settings


async def activate_scram_business_logic(req: ScramRequest) -> dict:
    if req.level >= 3:
        expected_code = settings.SCRAM_OVERRIDE_CODE
        if req.override_code != expected_code:
            raise HTTPException(
                status_code=403,
                detail="Invalid manager override code for SCRAM Level 3+",
            )

    store = get_store()
    state = await store.get_emergency_state()
    prev = state.current_level

    state.current_level = req.level
    state.activated_at = datetime.now(timezone.utc).isoformat()
    state.current_commander = req.operator_id

    await store.set_emergency_state(state)

    log = AuditLogRecord(
        event_id=f"SCRAM-{int(datetime.now(timezone.utc).timestamp())}",
        operator_id=req.operator_id,
        action="SCRAM_ACTIVATED",
        previous_state=prev,
        new_state=req.level,
        reason=f"Operator {req.operator_id} initiated SCRAM level {req.level}",
    )
    await store.add_audit_log(log)
    await broadcast_state(state)
    return state.model_dump()


async def recover_scram_business_logic() -> dict:
    store = get_store()
    state = await store.get_emergency_state()

    if state.current_level == 0:
        raise HTTPException(status_code=400, detail="Not in SCRAM")

    prev = state.current_level
    state.current_level = 0
    await store.set_emergency_state(state)

    log = AuditLogRecord(
        event_id=f"REC-{int(datetime.now(timezone.utc).timestamp())}",
        operator_id="CMD-Alpha",
        action="SCRAM_RECOVERED",
        previous_state=prev,
        new_state=0,
        reason="Operator stepped down SCRAM state",
    )
    await store.add_audit_log(log)
    await broadcast_state(state)
    return state.model_dump()


async def execute_dispatch_business_logic(req: DispatchRequest) -> dict:
    store = get_store()
    state = await store.get_emergency_state()

    if req.remaining_reserve < 2:
        raise HTTPException(
            status_code=403,
            detail=f"Dispatch rejected: Minimum operational reserve (2 units) must be maintained. Only {req.remaining_reserve} would remain.",
        )

    log = AuditLogRecord(
        event_id=f"DISP-{int(datetime.now(timezone.utc).timestamp())}",
        operator_id="CMD-Alpha",
        action="MANUAL_DISPATCH",
        previous_state=state.current_level,
        new_state=state.current_level,
        reason=f"Dispatched {', '.join(req.roles)} to Zone {req.zone}",
    )
    await store.add_audit_log(log)
    return {"status": "ok", "message": "Units dispatched securely."}


async def reset_simulation_logic() -> dict:
    store = get_store()
    await store.clear_all()
    logger.info("Decision history and state cleared")
    return {"status": "cleared", "message": "Demo reset — all decisions cleared."}
