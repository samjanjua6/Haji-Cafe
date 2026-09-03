from typing import Optional
from fastapi import APIRouter, Request, Form, Response, status
from pydantic import BaseModel

from app.modules.webhooks.schemas import WhatsAppSimulationRequest, WhatsAppOrderResponse
from app.modules.webhooks import whatsapp_service

router = APIRouter(prefix="/webhooks", tags=["WhatsApp & Twilio Webhooks"])


@router.get("/whatsapp")
async def verify_whatsapp_webhook(request: Request):
    """
    Webhook verification endpoint for Meta WhatsApp Cloud API.
    Validates hub.challenge and returns it as plain text.
    """
    hub_mode = request.query_params.get("hub.mode")
    hub_challenge = request.query_params.get("hub.challenge")
    hub_verify_token = request.query_params.get("hub.verify_token")

    if hub_mode == "subscribe" and hub_challenge:
        from fastapi.responses import PlainTextResponse
        return PlainTextResponse(content=hub_challenge)
    return {"status": "active", "message": "WhatsApp webhook endpoint ready"}


@router.get("/whatsapp/qr")
async def view_whatsapp_qr_page():
    """
    Live auto-refreshing QR Code page for linking WhatsApp.
    Auto-restarts session if expired, fetches fresh QR, and shows real-time status.
    """
    from fastapi.responses import HTMLResponse
    html_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Haji Cafe — Link WhatsApp</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
        .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; max-width: 440px; width: 100%; text-align: center; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
        h1 { font-size: 22px; margin: 0 0 8px; color: #38bdf8; }
        p { color: #94a3b8; font-size: 14px; margin: 0 0 24px; line-height: 1.5; }
        .qr-container { background: #fff; padding: 16px; border-radius: 12px; display: inline-block; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.2); }
        .qr-img { width: 260px; height: 260px; display: block; object-fit: contain; }
        .status { font-size: 14px; font-weight: 600; padding: 8px 16px; border-radius: 9999px; display: inline-block; margin-top: 8px; }
        .status.scanning { background: #0284c7; color: #fff; }
        .status.connected { background: #16a34a; color: #fff; font-size: 16px; }
        .status.restarting { background: #d97706; color: #fff; }
        .instructions { text-align: left; background: #0f172a; padding: 16px; border-radius: 8px; margin-top: 20px; font-size: 13px; color: #cbd5e1; }
        .instructions ol { margin: 0; padding-left: 20px; }
        .instructions li { margin-bottom: 6px; }
        .btn-refresh { background: #2563eb; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; margin-top: 16px; }
        .btn-refresh:hover { background: #1d4ed8; }
    </style>
</head>
<body>
    <div class="card">
        <h1>☕ Haji Cafe — Link WhatsApp</h1>
        <p>Scan this QR code with your phone's WhatsApp to activate live ordering.</p>
        
        <div class="qr-container">
            <img id="qr-image" class="qr-img" src="/webhooks/whatsapp/qr/image" alt="Loading QR code...">
        </div>

        <br>
        <div id="status-badge" class="status scanning">⏳ Generating Live QR Code...</div>

        <div class="instructions">
            <strong>📱 How to scan:</strong>
            <ol>
                <li>Open WhatsApp on your phone</li>
                <li>Tap <b>Settings</b> (or 3 dots ⋮)</li>
                <li>Tap <b>Linked Devices</b> &rarr; <b>Link a Device</b></li>
                <li>Point your camera at this QR code</li>
            </ol>
        </div>

        <button class="btn-refresh" onclick="forceRefreshQR()">🔄 Refresh QR Code</button>
    </div>

    <script>
        let isConnected = false;
        async function checkStatus() {
            if (isConnected) return;
            try {
                const res = await fetch('/webhooks/whatsapp/qr/status');
                const data = await res.json();
                const badge = document.getElementById('status-badge');
                const img = document.getElementById('qr-image');

                if (data.status === 'WORKING') {
                    isConnected = true;
                    badge.className = 'status connected';
                    badge.innerText = '🎉 WhatsApp Connected: ' + (data.phone ? '+' + data.phone : 'Active');
                    img.style.display = 'none';
                } else if (data.status === 'SCAN_QR_CODE') {
                    badge.className = 'status scanning';
                    badge.innerText = '📸 Ready to Scan! Point your camera';
                } else {
                    badge.className = 'status restarting';
                    badge.innerText = '🔄 Generating fresh QR code...';
                    forceRefreshQR();
                }
            } catch (e) {
                console.error(e);
            }
        }

        async function forceRefreshQR() {
            try {
                await fetch('/webhooks/whatsapp/qr/restart', { method: 'POST' });
                setTimeout(() => {
                    document.getElementById('qr-image').src = '/webhooks/whatsapp/qr/image?t=' + Date.now();
                }, 1200);
            } catch (e) {}
        }

        setInterval(checkStatus, 3500);
        checkStatus();
    </script>
</body>
</html>"""
    return HTMLResponse(content=html_content)


@router.get("/whatsapp/qr/image")
async def proxy_qr_image():
    """Proxy live QR code image directly from WAHA container."""
    import httpx
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get("http://localhost:3008/api/default/auth/qr")
            if resp.status_code == 200 and resp.headers.get("content-type", "").startswith("image"):
                return Response(content=resp.content, media_type="image/png")
            # If not in scan mode or failed, restart session
            await client.post("http://localhost:3008/api/sessions/default/restart")
            return Response(content=b"", status_code=204)
    except Exception:
        return Response(content=b"", status_code=503)


@router.get("/whatsapp/qr/status")
async def get_waha_session_status():
    """Check status of WAHA WhatsApp session."""
    import httpx
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get("http://localhost:3008/api/sessions/default")
            if resp.status_code == 200:
                data = resp.json()
                st = data.get("status")
                phone = data.get("me", {}).get("id", "").split("@")[0] if data.get("me") else ""
                return {"status": st, "phone": phone}
            return {"status": "UNKNOWN"}
    except Exception as e:
        return {"status": "ERROR", "detail": str(e)}


@router.post("/webhooks/whatsapp/qr/restart")
async def restart_waha_session():
    """Restart WAHA session to produce a fresh QR code."""
    import httpx
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post("http://localhost:3008/api/sessions/default/restart")
            return resp.json()
    except Exception as e:
        return {"error": str(e)}


@router.post("/whatsapp")
async def incoming_whatsapp_webhook(
    request: Request,
    From: Optional[str] = Form(None),
    Body: Optional[str] = Form(None),
    ProfileName: Optional[str] = Form(None),
):
    """
    Universal WhatsApp Webhook.
    Supports:
    1. Meta Official WhatsApp Cloud API
    2. UltraMsg / Green-API / WAHA (QR Code gateways)
    3. Twilio WhatsApp Sandbox
    4. Custom JSON webhook payloads
    """
    message_text = Body
    sender_phone = From
    sender_name = ProfileName

    # If not form-encoded, parse incoming JSON across different provider formats
    if not message_text:
        try:
            json_body = await request.json()

            # 1. Meta WhatsApp Cloud API format
            phone_number_id = None
            try:
                entry = json_body.get("entry", [])[0]
                changes = entry.get("changes", [])[0]
                value = changes.get("value", {})
                phone_number_id = value.get("metadata", {}).get("phone_number_id")
                messages = value.get("messages", [])
                if messages:
                    msg_obj = messages[0]
                    message_text = msg_obj.get("text", {}).get("body")
                    sender_phone = msg_obj.get("from")
                    contacts = value.get("contacts", [])
                    if contacts:
                        sender_name = contacts[0].get("profile", {}).get("name")
            except Exception:
                pass

            # 2. UltraMsg / WAHA / Green-API format
            if not message_text:
                data_obj = json_body.get("data") if isinstance(json_body.get("data"), dict) else json_body
                message_text = (
                    data_obj.get("body")
                    or data_obj.get("message")
                    or data_obj.get("text")
                    or json_body.get("body")
                    or json_body.get("message")
                )
                sender_phone = data_obj.get("from") or data_obj.get("phone") or json_body.get("from")
                sender_name = data_obj.get("pushname") or data_obj.get("profile_name") or json_body.get("name")

        except Exception:
            pass

    if not message_text:
        return Response(
            content="<Response><Message>Empty message received.</Message></Response>",
            media_type="application/xml",
        )

    result = await whatsapp_service.process_whatsapp_order(
        message_text=message_text,
        customer_name=sender_name or "Valued Guest",
        customer_phone=sender_phone,
        branch_id=1,
    )

    # If incoming request was from Meta Cloud API, dispatch outbound reply via Graph API
    if phone_number_id and sender_phone:
        await whatsapp_service.send_meta_whatsapp_message(
            to_phone=sender_phone,
            message_text=result.reply_message,
            phone_number_id=phone_number_id,
        )
        return {"status": "ok", "order_id": result.order_id, "reply": result.reply_message}

    # If incoming request was from WAHA / QR-Gateway (JSON payload)
    if not Body and sender_phone:
        await whatsapp_service.send_waha_whatsapp_message(
            chat_id=sender_phone,
            message_text=result.reply_message,
        )
        return {"status": "ok", "order_id": result.order_id, "reply": result.reply_message}

    # Return Twilio TwiML XML format for native WhatsApp rendering
    twiml_reply = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>{result.reply_message}</Message>
</Response>"""
    return Response(content=twiml_reply, media_type="application/xml")


@router.post("/whatsapp/simulate", response_model=WhatsAppOrderResponse)
async def simulate_whatsapp_ordering(body: WhatsAppSimulationRequest):
    """
    [INTERACTIVE SIMULATOR]
    Simulate a customer sending a WhatsApp message (e.g. 'Can I get 2 Spanish Lattes and 1 Croissant?').
    Directly returns parsed items, created order ID, and the exact WhatsApp reply receipt.
    Instantly pushes the live order to the Kitchen Display System (KDS) via WebSockets!
    """
    return await whatsapp_service.process_whatsapp_order(
        message_text=body.message,
        customer_name=body.customer_name,
        customer_phone=body.customer_phone,
        branch_id=body.branch_id or 1,
    )
