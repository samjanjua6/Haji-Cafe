import os
from google import genai
from google.genai import types
from .schemas import ChatRequest, ChatResponse, ChatMessage
from .tools import build_tools
from app.config import settings

client = genai.Client(
    api_key=settings.GEMINI_API_KEY,
    http_options={'base_url': settings.GEMINI_BASE_URL} if settings.GEMINI_BASE_URL else None
)

async def handle_chat(body: ChatRequest, current_user) -> ChatResponse:
    tools = build_tools(current_user)
    
    # Build System Prompt
    system_prompt = (
        f"You are a helpful assistant for Haji Cafe Platform.\n"
        f"The current user is logged in as {current_user.role.name} with User ID {current_user.id}.\n"
        "You have been provided with specific tools to fetch data and perform actions on their behalf.\n"
        "Always use the tools available to you to answer questions. If a tool returns an error or Access Denied, "
        "explain to the user that they don't have permission for that action.\n"
        "Format your responses cleanly in Markdown."
    )
    
    # Separate the latest message from the history
    if not body.messages:
        return ChatResponse(messages=[])
        
    history_msgs = body.messages[:-1]
    latest_msg = body.messages[-1]
    
    # Convert history to Gemini types.Content
    history_contents = []
    for msg in history_msgs:
        role = "user" if msg.role == "user" else "model"
        # We only support text history from frontend for simplicity in this version
        part = types.Part.from_text(text=msg.content)
        history_contents.append(types.Content(role=role, parts=[part]))
        
    chat = client.aio.chats.create(
        model="gemini-3.5-flash",
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            tools=tools,
            temperature=0.7,
        ),
        history=history_contents
    )
    
    response = await chat.send_message(latest_msg.content)
    
    # Construct the response to send back to the frontend
    # The frontend expects the full updated history (or just the new messages)
    # We will return the new messages (the user's latest + model's response)
    # The frontend will append it to its own state.
    
    new_messages = body.messages.copy()
    new_messages.append(ChatMessage(role="model", content=response.text))
    
    return ChatResponse(messages=new_messages)
