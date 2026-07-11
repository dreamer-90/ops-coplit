from fastapi.testclient import TestClient
from app.main import app, emergency_state, audit_log, decision_history

client = TestClient(app)

def test_scram_and_recover():
    # Reset state
    emergency_state.current_level = 0
    audit_log.clear()
    decision_history.decisions.clear()

    # Trigger SCRAM
    response = client.post(
        "/api/emergency/scram",
        headers={"x-api-key": "OPS-COPILOT-2026"},
        json={"level": 2, "operator_id": "TEST-CMD"}
    )
    assert response.status_code == 200
    assert response.json()["state"]["current_level"] == 2

    # Verify audit log
    assert len(audit_log) == 1
    assert audit_log[0].action == "SCRAM_ACTIVATED"
    assert audit_log[0].new_state == 2

    # Trigger Engine Decision (should be governed/passive)
    response = client.post(
        "/api/events/0/trigger",
        headers={"x-api-key": "OPS-COPILOT-2026"}
    )
    assert response.status_code == 200
    decision = response.json()["decision"]
    assert decision["recommended_action"] == "PASSIVE_MONITORING_ONLY"
    assert "System is currently under SCRAM" in decision["reasoning"]

    # Trigger Recover
    response = client.post(
        "/api/emergency/recover",
        headers={"x-api-key": "OPS-COPILOT-2026"}
    )
    assert response.status_code == 200
    assert response.json()["state"]["current_level"] == 0

    # Verify audit log
    assert len(audit_log) == 2
    assert audit_log[1].action == "SCRAM_RECOVERED"
    assert audit_log[1].new_state == 0

def test_dispatch_constraint():
    # Reset state
    emergency_state.current_level = 0
    audit_log.clear()
    decision_history.decisions.clear()

    # Try dispatch with sufficient reserve
    response = client.post(
        "/api/dispatch",
        headers={"x-api-key": "OPS-COPILOT-2026"},
        json={"zone": "A", "roles": ["manager"], "remaining_reserve": 5}
    )
    assert response.status_code == 200

    # Try dispatch with insufficient reserve
    response = client.post(
        "/api/dispatch",
        headers={"x-api-key": "OPS-COPILOT-2026"},
        json={"zone": "B", "roles": ["security"], "remaining_reserve": 1}
    )
    assert response.status_code == 403
    assert "Minimum operational reserve" in response.json()["detail"]
