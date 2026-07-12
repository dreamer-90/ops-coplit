"""FastAPI application — REST endpoints, WebSocket, and static file serving.

Endpoints are decoupled into routers, and state is abstracted behind a StateStore
to allow horizontal scaling via Redis and Pub/Sub.
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from app.services.dependencies import init_store
from app.api.routers import simulation, emergency, data, websocket, operations
from app.simulator import get_event_count

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup/shutdown lifecycle hook."""
    logger.info("Stadium Ops Copilot starting — %d events loaded", get_event_count())
    
    # Initialize the state store (Redis or InMemory)
    await init_store()
    
    # Start the background Pub/Sub listener for WebSockets
    pubsub_task = asyncio.create_task(websocket.pubsub_listener())
    
    yield
    
    # Shutdown
    pubsub_task.cancel()
    try:
        await pubsub_task
    except asyncio.CancelledError:
        pass
    logger.info("Stadium Ops Copilot shutting down")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Stadium Ops Copilot",
    description=(
        "AI-powered operations assistant for venue staff during "
        "FIFA World Cup 2026 at MetLife Stadium."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost", "http://localhost:8000", "http://127.0.0.1", "http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", tags=["system"])
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy", "service": "stadium-ops-copilot"}


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(simulation.router)
app.include_router(emergency.router)
app.include_router(data.router)
app.include_router(websocket.router)
app.include_router(operations.router)


# ---------------------------------------------------------------------------
# Static file serving (frontend)
# ---------------------------------------------------------------------------

@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def serve_frontend() -> HTMLResponse:
    """Serve the main dashboard HTML."""
    index_path = FRONTEND_DIR / "index.html"
    return HTMLResponse(content=index_path.read_text(encoding="utf-8"))

# Mount static assets (CSS, JS) — placed AFTER explicit routes
app.mount(
    "/",
    StaticFiles(directory=str(FRONTEND_DIR)),
    name="static",
)
