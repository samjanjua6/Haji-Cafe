import asyncio
import json
import os
from decimal import Decimal

# Set dummy testing environment variables before importing app.main
os.environ.setdefault("DATABASE_URL", "postgresql://mock:mock@localhost:5432/mock")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-32-bytes-long-for-testing!!")
os.environ.setdefault("GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "test-client-secret")
os.environ.setdefault("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.modules.realtime.manager import ConnectionManager, order_ws_manager


class MockWebSocket:
    """Mock WebSocket for unit testing ConnectionManager without a live server."""
    def __init__(self):
        self.accepted = False
        self.sent_messages = []
        self.closed = False

    async def accept(self):
        self.accepted = True

    async def send_text(self, text: str):
        if self.closed:
            raise RuntimeError("Socket is closed")
        self.sent_messages.append(text)


@pytest.mark.asyncio
async def test_connection_manager_room_isolation_and_broadcast():
    """Verify that broadcasts only reach the targeted branch room."""
    manager = ConnectionManager()
    ws_branch1 = MockWebSocket()
    ws_branch2 = MockWebSocket()

    # Connect client 1 to branch 1, client 2 to branch 2
    await manager.connect(ws_branch1, branch_id=1)
    await manager.connect(ws_branch2, branch_id=2)

    assert ws_branch1.accepted is True
    assert ws_branch2.accepted is True
    assert 1 in manager.rooms
    assert 2 in manager.rooms

    # Broadcast event to branch 1 only
    test_order_data = {"order_id": 42, "status": "PENDING", "total": 12.50}
    await manager.broadcast_to_branch(branch_id=1, event="ORDER_CREATED", payload=test_order_data)

    # ws_branch1 should have received the message
    assert len(ws_branch1.sent_messages) == 1
    received_msg = json.loads(ws_branch1.sent_messages[0])
    assert received_msg["event"] == "ORDER_CREATED"
    assert received_msg["branch_id"] == 1
    assert received_msg["data"]["order_id"] == 42

    # ws_branch2 must NOT have received branch 1's order
    assert len(ws_branch2.sent_messages) == 0

    # Test clean disconnect
    await manager.disconnect(ws_branch1, branch_id=1)
    assert 1 not in manager.rooms


@pytest.mark.asyncio
async def test_connection_manager_stale_socket_pruning():
    """Verify that broken or dropped sockets are pruned automatically on broadcast."""
    manager = ConnectionManager()
    ws_broken = MockWebSocket()
    ws_broken.closed = True  # Simulates broken connection

    await manager.connect(ws_broken, branch_id=5)
    assert len(manager.rooms[5]) == 1

    # Broadcast should fail on send_text and auto-prune the broken connection
    await manager.broadcast_to_branch(branch_id=5, event="TEST_EVENT", payload={"dummy": 1})
    assert len(manager.rooms.get(5, set())) == 0


def test_fastapi_websocket_endpoint_flow():
    """Test the live FastAPI /ws/orders/{branch_id} endpoint with TestClient."""
    client = TestClient(app)

    with client.websocket_connect("/ws/orders/1") as websocket:
        # 1. Receive handshake message
        welcome = websocket.receive_json()
        assert welcome["event"] == "CONNECTED"
        assert welcome["branch_id"] == 1
        assert "Successfully subscribed" in welcome["message"]

        # 2. Test ping-pong heartbeat
        websocket.send_text("ping")
        pong = websocket.receive_text()
        assert pong == "pong"

        # 3. Simulate order broadcast into the live manager
        loop = asyncio.new_event_loop()
        order_payload = {"id": 101, "status": "IN_PREPARATION", "table": "Table 5"}
        loop.run_until_complete(
            order_ws_manager.broadcast_to_branch(
                branch_id=1,
                event="ORDER_STATUS_UPDATED",
                payload=order_payload
            )
        )
        loop.close()

        # 4. Client should receive the broadcasted event
        event_data = websocket.receive_json()
        assert event_data["event"] == "ORDER_STATUS_UPDATED"
        assert event_data["branch_id"] == 1
        assert event_data["data"]["id"] == 101
        assert event_data["data"]["status"] == "IN_PREPARATION"


@pytest.mark.asyncio
async def test_order_service_broadcast_triggers(monkeypatch):
    """Verify that place_order and transition_status trigger manager.broadcast_to_branch."""
    from unittest.mock import AsyncMock
    from app.modules.orders import service, repository
    from app.modules.orders.schemas import OrderItemCreate, OrderStatusEnum

    mock_broadcast = AsyncMock()
    monkeypatch.setattr(order_ws_manager, "broadcast_to_branch", mock_broadcast)

    # 1. Mock repository.get_branch_menu_items_by_ids and create_order for place_order
    mock_item = type("MockItem", (), {
        "id": 1,
        "priceOverride": None,
        "availableQuantity": 10,
        "isInStock": True,
        "isActive": True,
        "masterItem": type("MasterItem", (), {"name": "Espresso", "basePrice": Decimal("3.00")})()
    })()
    monkeypatch.setattr(repository, "get_branch_menu_items_by_ids", AsyncMock(return_value=[mock_item]))

    mock_created_order = type("MockOrder", (), {
        "id": 55,
        "branchId": 1,
        "status": "PENDING",
        "totalAmount": Decimal("3.00"),
        "orderItems": []
    })()
    monkeypatch.setattr(repository, "create_order", AsyncMock(return_value=mock_created_order))

    # Call place_order
    await service.place_order(branch_id=1, user_id=1, items=[OrderItemCreate(branch_menu_item_id=1, quantity=1)])
    assert mock_broadcast.called
    assert mock_broadcast.call_args[1]["event"] == "ORDER_CREATED"
    assert mock_broadcast.call_args[1]["branch_id"] == 1

    # 2. Mock transition_status
    mock_broadcast.reset_mock()
    monkeypatch.setattr(service, "get_order_detail", AsyncMock(return_value=mock_created_order))
    mock_updated_order = type("MockOrder", (), {
        "id": 55,
        "branchId": 1,
        "status": "IN_PREPARATION",
        "totalAmount": 3.0,
        "orderItems": []
    })()
    monkeypatch.setattr(repository, "update_order_status", AsyncMock(return_value=mock_updated_order))

    await service.transition_status(branch_id=1, order_id=55, new_status=OrderStatusEnum.IN_PREPARATION)
    assert mock_broadcast.called
    assert mock_broadcast.call_args[1]["event"] == "ORDER_STATUS_UPDATED"
    assert mock_broadcast.call_args[1]["branch_id"] == 1

