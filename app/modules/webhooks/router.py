from typing import Optional
from fastapi import APIRouter, Request, Form, Response, status
from pydantic import BaseModel

from app.modules.webhooks.schemas import WhatsAppSimulationRequest, WhatsAppOrderResponse
from app.modules.webhooks import whatsapp_service

router = APIRouter(prefix="/webhooks", tags=["WhatsApp & Twilio Webhooks"])


@router.post("/whatsapp")
async def incoming_whatsapp_webhook(
    request: Request,
    From: Optional[str] = Form(None),
    Body: Optional[str] = Form(None),
    ProfileName: Optional[str] = Form(None),
):
    """
    Standard Twilio WhatsApp Webhook.
    Receives incoming customer WhatsApp messages, parses order with Groq GPT-OSS-120B,
    creates order in database, broadcasts to Kitchen KDS, and returns TwiML response.
    """
    # Support both url-encoded form (Twilio) and direct JSON payloads
    message_text = Body
    sender_phone = From
    sender_name = ProfileName

    if not message_text:
        try:
            json_body = await request.json()
            message_text = json_body.get("body") or json_body.get("message")
            sender_phone = json_body.get("from") or json_body.get("phone")
            sender_name = json_body.get("profile_name") or json_body.get("name")
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
