import os

import pytest
from fastapi.testclient import TestClient

import app.api.routers.emergency
import app.services.dependencies
from app.main import app as fastapi_app
from app.services.dependencies import get_store
from app.services.store import InMemoryStateStore


@pytest.fixture(scope="module")
def client():
    with TestClient(fastapi_app) as c:
        yield c


@pytest.fixture
def override_store():
    store = InMemoryStateStore()
    fastapi_app.dependency_overrides[get_store] = lambda: store
    original_store = app.services.dependencies._store_instance
    app.services.dependencies._store_instance = store

    # Reset rate limit states to avoid test pollution
    app.api.routers.emergency._dispatch_last_called = 0.0
    app.api.routers.emergency._scram_last_called = 0.0

    yield store

    fastapi_app.dependency_overrides.clear()
    app.services.dependencies._store_instance = original_store


def test_scram_and_recover(client, override_store):
    store = override_store

    # Needs valid SCRAM override code for level 3
    os.environ["SCRAM_OVERRIDE_CODE"] = "TEST-CODE"

    # Trigger SCRAM Level 3
    response = client.post(
        "/api/emergency/scram",
        headers={"x-api-key": "OPS-COPILOT-2026"},
        json={"level": 3, "operator_id": "TEST-CMD", "override_code": "TEST-CODE"},
    )
    assert response.status_code == 200
    assert response.json()["state"]["current_level"] == 3

    # Trigger Engine Decision (should be governed/passive)
    response = client.post(
        "/api/events/0/trigger", headers={"x-api-key": "OPS-COPILOT-2026"}
    )
    assert response.status_code == 200
    decision = response.json()["decision"]
    assert decision["recommended_action"] == "PASSIVE_MONITORING_ONLY"
    assert "System is currently under SCRAM" in decision["reasoning"]

    # Trigger Recover
    response = client.post(
        "/api/emergency/recover", headers={"x-api-key": "OPS-COPILOT-2026"}
    )
    assert response.status_code == 200
    assert response.json()["state"]["current_level"] == 0


def test_dispatch_constraint(client, override_store):
    # Try dispatch with sufficient reserve
    response = client.post(
        "/api/emergency/dispatch",
        headers={"x-api-key": "OPS-COPILOT-2026"},
        json={"zone": "A", "roles": ["manager"], "remaining_reserve": 5},
    )
    assert response.status_code == 200

    # Wait for rate limit to pass
    app.api.routers.emergency._dispatch_last_called = 0.0

    # Try dispatch with insufficient reserve
    response = client.post(
        "/api/emergency/dispatch",
        headers={"x-api-key": "OPS-COPILOT-2026"},
        json={"zone": "B", "roles": ["security"], "remaining_reserve": 1},
    )
    assert response.status_code == 403
    assert "Minimum operational reserve" in response.json()["detail"]
