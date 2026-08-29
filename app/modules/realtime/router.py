import logging
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from app.modules.realtime.manager import order_ws_manager

logger = logging.getLogger("realtime.router")

router = APIRouter(tags=["Real-Time"])


@router.websocket("/ws/orders/{branch_id}")
async def orders_websocket_endpoint(
    websocket: WebSocket,
    branch_id: int,
    token: Optional[str] = None,
):
    """
    WebSocket endpoint for live order updates scoped to a specific branch.
    Kitchen Display Systems (KDS), Cashiers, and Managers connect here
    to receive instant ORDER_CREATED and ORDER_STATUS_UPDATED event streams.
    """
    await order_ws_manager.connect(websocket, branch_id)

    # Send initial welcome / handshake frame
    try:
        await websocket.send_json({
            "event": "CONNECTED",
            "branch_id": branch_id,
            "message": f"Successfully subscribed to live orders for branch #{branch_id}",
        })

        while True:
            # Keep-alive heartbeat & client-to-server ping
            message = await websocket.receive_text()
            if message.strip().lower() == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await order_ws_manager.disconnect(websocket, branch_id)
        logger.info(f"[RealTime] Client disconnected cleanly from branch #{branch_id}")
    except Exception as exc:
        await order_ws_manager.disconnect(websocket, branch_id)
        logger.warning(f"[RealTime] Client connection dropped for branch #{branch_id}: {exc}")
