from datetime import datetime, timezone

import pytest

from app.engine import process_event
from app.schemas import CrowdEvent, DecisionHistory, EmergencyState


@pytest.fixture
def sample_event():
    return CrowdEvent(
        event_id="EVT-TEST",
        timestamp=datetime.now(timezone.utc).isoformat(),
        event_type="density_spike",
        severity="medium",
        zone_id="A",
        details="Test density spike",
        density_percent=80.0,
        trend="rising",
    )


@pytest.fixture
def emergency_state():
    return EmergencyState()


@pytest.fixture
def decision_history():
    return DecisionHistory()


@pytest.mark.asyncio
async def test_engine_fallback_during_scram(
    sample_event, decision_history, emergency_state
):
    # Set SCRAM level to 1
    emergency_state.current_level = 1

    decision = await process_event(sample_event, decision_history, emergency_state)

    assert decision.recommended_action == "PASSIVE_MONITORING_ONLY"
    assert "SCRAM" in decision.reasoning
    assert decision.priority == 5


@pytest.mark.asyncio
async def test_engine_fallback_when_no_api_key_or_failure(
    sample_event, decision_history, emergency_state
):
    # This will either hit the actual API if configured, or hit the fallback if no API key
    # By default, without mocking, if GEMINI_API_KEY is invalid, it catches Exception and falls back.
    # To reliably test the fallback mechanism, we'll patch the client

    import app.engine

    original_client = app.engine.client

    try:
        # Force a failure
        app.engine.client = None
        decision = await process_event(sample_event, decision_history, emergency_state)

        assert decision.risk_level == "moderate"
        assert decision.priority == 4  # medium severity mapped to 4
        assert "Zone A" in decision.recommended_action
    finally:
        app.engine.client = original_client
