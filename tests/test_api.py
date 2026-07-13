import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app as fastapi_app


@pytest.fixture(scope="module")
def client():
    with TestClient(fastapi_app) as c:
        yield c


def test_read_root(client):
    response = client.get("/")
    assert response.status_code == 200


def test_get_events(client):
    response = client.get("/api/events")
    assert response.status_code == 200
    data = response.json()
    assert "count" in data
    assert "events" in data
    assert isinstance(data["events"], list)


def test_scram_requires_auth(client):
    # Without API key
    response = client.post(
        "/api/emergency/scram",
        json={"level": 1, "operator_id": "test_ops", "reason": "Test"},
    )
    assert response.status_code == 422  # FastAPI missing header validation

    # With invalid API key
    response = client.post(
        "/api/emergency/scram",
        headers={"x-api-key": "invalid-key"},
        json={"level": 1, "operator_id": "test_ops", "reason": "Test"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid API Key"


def test_scram_with_valid_auth(client):
    response = client.post(
        "/api/emergency/scram",
        headers={"x-api-key": settings.api_secret_key},
        json={"level": 1, "operator_id": "test_ops", "reason": "Test scram"},
    )
    assert response.status_code == 200


def test_get_decision_history(client):
    response = client.get("/api/decisions")
    assert response.status_code == 200
    data = response.json()
    assert "count" in data
    assert "decisions" in data


def test_trigger_event(client):
    # Valid auth
    response = client.post(
        "/api/events/0/trigger", headers={"x-api-key": settings.api_secret_key}
    )
    assert response.status_code == 200
    data = response.json()
    assert "event" in data
    assert "decision" in data
