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
