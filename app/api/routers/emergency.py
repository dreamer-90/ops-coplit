from fastapi import APIRouter, Depends

from app.api.dependencies import verify_token
from app.schemas import DispatchRequest, ScramRequest
from app.services.operations import (activate_scram_business_logic,
                                     execute_dispatch_business_logic,
                                     recover_scram_business_logic)

router = APIRouter(prefix="/api/emergency", tags=["emergency"])

import time

from fastapi import HTTPException

_scram_last_called = 0.0
SCRAM_RATE_LIMIT_SECONDS = 3.0


@router.post("/scram", dependencies=[Depends(verify_token)])
async def activate_scram(req: ScramRequest) -> dict:
    """Activate SCRAM override."""
    global _scram_last_called
    now = time.time()
    if now - _scram_last_called < SCRAM_RATE_LIMIT_SECONDS:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please wait before triggering SCRAM again.",
        )
    _scram_last_called = now

    return {"status": "ok", "state": await activate_scram_business_logic(req)}


@router.post("/recover", dependencies=[Depends(verify_token)])
async def recover_scram() -> dict:
    """Step down from SCRAM."""
    return {"status": "ok", "state": await recover_scram_business_logic()}


import time

from fastapi import HTTPException

# In-memory rate limiter state
_dispatch_last_called = 0.0
DISPATCH_RATE_LIMIT_SECONDS = 3.0


@router.post("/dispatch", tags=["dispatch"], dependencies=[Depends(verify_token)])
async def request_dispatch(req: DispatchRequest) -> dict:
    """Validate and execute a manual dispatch against reserve limits."""
    global _dispatch_last_called
    now = time.time()
    if now - _dispatch_last_called < DISPATCH_RATE_LIMIT_SECONDS:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please wait before dispatching again.",
        )
    _dispatch_last_called = now

    return await execute_dispatch_business_logic(req)
