import secrets
from fastapi import Header, HTTPException
from app.config import settings

async def verify_token(x_api_key: str = Header(..., description="Ops Copilot API Key")) -> None:
    """Require a static API key for destructive operations."""
    if not secrets.compare_digest(x_api_key, settings.api_secret_key):
        raise HTTPException(status_code=401, detail="Invalid API Key")
