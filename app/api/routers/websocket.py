import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.dependencies import get_store

from app.logger import logger

router = APIRouter()

connected_clients: list[WebSocket] = []


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """Real-time decision push via WebSocket."""
    await websocket.accept()
    connected_clients.append(websocket)
    logger.info(
        "WebSocket client connected (%d total in this worker)", len(connected_clients)
    )
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        connected_clients.remove(websocket)
        logger.info(
            "WebSocket client disconnected (%d remaining in this worker)",
            len(connected_clients),
        )


async def pubsub_listener():
    """Background task to listen to Redis PubSub and fan-out to local websockets."""
    try:
        store = get_store()
        logger.info("Starting Pub/Sub listener for WebSockets...")
        async for message in store.subscribe("broadcast_channel"):
            disconnected: list[WebSocket] = []
            for ws in connected_clients:
                try:
                    await ws.send_text(message)
                except Exception:
                    disconnected.append(ws)
            for ws in disconnected:
                if ws in connected_clients:
                    connected_clients.remove(ws)
    except asyncio.CancelledError:
        logger.info("Pub/Sub listener stopped.")
    except Exception as e:
        logger.error(f"Error in pubsub listener: {e}")
