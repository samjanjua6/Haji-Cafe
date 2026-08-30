import uvicorn
import random
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from app.modules.realtime.router import router as realtime_router
from app.modules.realtime.manager import order_ws_manager

app = FastAPI(title="Haji Cafe Real-Time Live Demo")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register our production Real-Time WebSocket router
app.include_router(realtime_router)


# Mock Trigger Endpoints for Interactive Demo
@app.post("/demo/trigger-order")
async def trigger_order(branch_id: int = 1):
    """Simulates a cashier or customer placing an order."""
    order_id = random.randint(100, 999)
    items_pool = [
        {"name": "Caramel Macchiato", "price": 4.50},
        {"name": "Butter Croissant", "price": 3.50},
        {"name": "Hazelnut Cold Brew", "price": 5.00},
        {"name": "Americano", "price": 3.25},
        {"name": "Chicken Cheese Panini", "price": 6.50},
    ]
    selected_items = random.sample(items_pool, k=random.randint(1, 3))
    for item in selected_items:
        item["quantity"] = random.randint(1, 2)

    total = sum(i["price"] * i["quantity"] for i in selected_items)

    order_payload = {
        "id": order_id,
        "branchId": branch_id,
        "tableNumber": f"Table #{random.randint(1, 12)}",
        "status": "PENDING",
        "totalAmount": round(total, 2),
        "orderItems": selected_items,
    }

    # Broadcast to live connected kitchen display screens
    await order_ws_manager.broadcast_to_branch(branch_id, "ORDER_CREATED", order_payload)
    return {"status": "broadcasted", "event": "ORDER_CREATED", "order": order_payload}


@app.post("/demo/trigger-status")
async def trigger_status(order_id: int, status: str = "IN_PREPARATION", branch_id: int = 1):
    """Simulates the order transitioning state (e.g. IN_PREPARATION -> COMPLETED)."""
    status_payload = {
        "id": order_id,
        "branchId": branch_id,
        "status": status,
    }
    await order_ws_manager.broadcast_to_branch(branch_id, "ORDER_STATUS_UPDATED", status_payload)
    return {"status": "broadcasted", "event": "ORDER_STATUS_UPDATED", "order": status_payload}


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print(" 🚀 HAJI CAFE REAL-TIME WEBSOCKET DEMO SERVER")
    print(" -> Server running at: http://127.0.0.1:8000")
    print(" -> WebSocket endpoint: ws://127.0.0.1:8000/ws/orders/1")
    print(" -> Open 'demo_kds.html' in your browser to see live orders!")
    print("=" * 60 + "\n")
    uvicorn.run(app, host="127.0.0.1", port=8000)
