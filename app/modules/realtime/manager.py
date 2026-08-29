import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Set
from fastapi import WebSocket

logger = logging.getLogger("realtime.orders")


class ConnectionManager:
    """
    Manages active WebSocket connections grouped by branch room.
    Enables zero-latency broadcasting of order and kitchen state updates.
    """

    def __init__(self):
        # Maps branch_id -> set of active WebSockets
        self.rooms: Dict[int, Set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, branch_id: int):
        """Accepts an incoming WebSocket connection and registers it to a branch room."""
        await websocket.accept()
        async with self._lock:
            if branch_id not in self.rooms:
                self.rooms[branch_id] = set()
            self.rooms[branch_id].add(websocket)
        logger.info(f"[RealTime] Client connected to branch {branch_id}. Total connections: {len(self.rooms[branch_id])}")

    async def disconnect(self, websocket: WebSocket, branch_id: int):
        """Removes a WebSocket connection from the branch room."""
        async with self._lock:
            if branch_id in self.rooms:
                self.rooms[branch_id].discard(websocket)
                if not self.rooms[branch_id]:
                    del self.rooms[branch_id]
        logger.info(f"[RealTime] Client disconnected from branch {branch_id}.")

    async def broadcast_to_branch(self, branch_id: int, event: str, payload: Any):
        """
        Broadcast a structured JSON payload to all connected clients in a branch.
        Gracefully handles and prunes broken/stale sockets.
        """
        message = {
            "event": event,
            "branch_id": branch_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": payload,
        }
        message_json = json.dumps(message, default=str)

        async with self._lock:
            sockets = list(self.rooms.get(branch_id, set()))

        if not sockets:
            logger.debug(f"[RealTime] No active subscribers for branch {branch_id}. Event '{event}' skipped.")
            return

        dead_sockets = []
        for ws in sockets:
            try:
                await ws.send_text(message_json)
            except Exception as exc:
                logger.warning(f"[RealTime] Failed to send to socket in branch {branch_id}: {exc}")
                dead_sockets.append(ws)

        if dead_sockets:
            async with self._lock:
                for dead in dead_sockets:
                    if branch_id in self.rooms:
                        self.rooms[branch_id].discard(dead)


# Global singleton instance
order_ws_manager = ConnectionManager()
