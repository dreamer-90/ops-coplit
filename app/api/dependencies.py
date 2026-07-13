import secrets

from fastapi import Header, HTTPException

from app.config import settings


async def verify_token(
    x_api_key: str = Header(..., description="Ops Copilot API Key")
) -> None:
    """Require a static API key for destructive operations."""
    expected_key = settings.API_SECRET_KEY.get_secret_value() if settings.API_SECRET_KEY else "ops-secret-2026"
    if not secrets.compare_digest(x_api_key, expected_key):
        raise HTTPException(status_code=401, detail="Invalid API Key")
