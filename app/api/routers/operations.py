from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid

from app.schemas import ActionRequest, BroadcastRequest, AuditLogRecord, EngineDecision
from app.services.store import StateStore
from app.services.dependencies import get_store
import json

router = APIRouter(prefix="/api/operations", tags=["operations"])

@router.post("/action")
async def execute_action(
    req: ActionRequest,
    store: StateStore = Depends(get_store)
):
    """Execute a manual quick action (e.g. OPEN_OVERFLOW_GATES) overriding the AI."""
    
    # In a real system, this would trigger IoT gates or SMS gateways.
    # Here we just log it as an AuditRecord and generate a manual EngineDecision to sync UI state.
    
    event_id = f"EVT-MANUAL-{uuid.uuid4().hex[:6].upper()}"
    
    decision = EngineDecision(
        event_id=event_id,
        risk_level="high",  # Manual overrides usually happen during high risk
        affected_zones=[req.zone_id] if req.zone_id else ["All"],
        confidence_score=100.0, # 100% confidence because it's human-directed
        decision_provenance={"based_on": ["Manual Operator Override"], "missing": []},
        recommended_action=req.action_type.replace('-', ' ').upper(),
        reasoning=f"Manual Override [Operator ID: {req.operator_id}] • Immediate manual action initiated.",
        mission_objective="Immediate manual intervention",
        expected_outcome="Pending physical confirmation",
        predicted_effects={},
        predicted_queue_reduction="N/A",
        alert_text_en=f"Manual action executed: {req.action_type}",
        alert_translations={},
        priority=1
    )
    
    # Store and broadcast to all connected clients
    await store.add_decision(decision)
    await store.publish("broadcast_channel", json.dumps({"type": "decision", "decision": decision.model_dump()}))
    
    return {"status": "executed", "decision": decision}


@router.post("/broadcast")
async def execute_broadcast(
    req: BroadcastRequest,
    store: StateStore = Depends(get_store)
):
    """Trigger a manual public address broadcast."""
    
    event_id = f"EVT-BCAST-{uuid.uuid4().hex[:6].upper()}"
    
    decision = EngineDecision(
        event_id=event_id,
        risk_level="low",
        affected_zones=req.zones if req.zones else ["All"],
        confidence_score=100.0,
        decision_provenance={"based_on": ["Manual Broadcast Override"], "missing": []},
        recommended_action=f"BROADCAST: {req.message[:30]}...",
        reasoning=f"Manual Override [Operator ID: {req.operator_id}] • Operator initiated PA broadcast.",
        mission_objective="Crowd Information",
        expected_outcome="Crowd informed",
        predicted_effects={},
        predicted_queue_reduction="N/A",
        alert_text_en=req.message,
        alert_translations={},
        priority=3
    )
    
    await store.add_decision(decision)
    await store.publish("broadcast_channel", json.dumps({"type": "decision", "decision": decision.model_dump()}))
    
    return {"status": "broadcasted", "decision": decision}
