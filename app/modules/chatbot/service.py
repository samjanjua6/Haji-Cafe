import json
import inspect
import asyncio
from fastapi import WebSocket
from groq import AsyncGroq
from .schemas import ChatRequest, ChatResponse, ChatMessage
from .tools import build_tools
from app.config import settings

client = AsyncGroq(api_key=settings.GROQ_API_KEY)

# Model to use — Groq's fastest, most capable model with tool support
GROQ_MODEL = "llama-3.3-70b-versatile"


def _build_system_prompt(current_user) -> str:
    return (
        f"You are a helpful assistant for Haji Cafe Platform.\n"
        f"The current user is logged in as {current_user.role.name} with User ID {current_user.id}.\n"
        "You have been provided with specific tools to fetch data and perform actions on their behalf.\n"
        "Always use the tools available to you to answer questions. If a tool returns an error or Access Denied, "
        "explain to the user that they don't have permission for that action.\n"
        "Format your responses cleanly in Markdown."
    )


def _fn_to_groq_tool(fn) -> dict:
    """
    Converts a Python async function into a Groq/OpenAI-compatible tool schema.
    Reads the type annotations and docstring automatically.
    """
    sig = inspect.signature(fn)
    doc = inspect.getdoc(fn) or ""
    properties = {}
    required = []

    type_map = {int: "integer", str: "string", float: "number", bool: "boolean"}

    for name, param in sig.parameters.items():
        annotation = param.annotation
        json_type = type_map.get(annotation, "string")
        properties[name] = {"type": json_type}
        if param.default is inspect.Parameter.empty:
            required.append(name)

    return {
        "type": "function",
        "function": {
            "name": fn.__name__,
            "description": doc,
            "parameters": {
                "type": "object",
                "properties": properties,
                "required": required,
            },
        },
    }


def _build_messages(system_prompt: str, history: list[ChatMessage], latest_content: str) -> list[dict]:
    """Converts our internal message format to Groq/OpenAI message format."""
    msgs = [{"role": "system", "content": system_prompt}]
    for msg in history:
        role = "user" if msg.role == "user" else "assistant"
        msgs.append({"role": role, "content": msg.content})
    msgs.append({"role": "user", "content": latest_content})
    return msgs


async def _execute_tool_calls(tool_calls, tool_fn_map: dict) -> list[dict]:
    """Executes all tool calls returned by the model and returns result messages."""
    result_messages = []
    for tc in tool_calls:
        fn_name = tc.function.name
        fn_args = json.loads(tc.function.arguments or "{}")
        fn = tool_fn_map.get(fn_name)
        if fn is None:
            result = f"Error: Tool '{fn_name}' not found."
        else:
            try:
                if inspect.iscoroutinefunction(fn):
                    result = await fn(**fn_args)
                else:
                    result = fn(**fn_args)
            except Exception as e:
                result = f"Error executing {fn_name}: {str(e)}"

        result_messages.append({
            "role": "tool",
            "tool_call_id": tc.id,
            "content": str(result),
        })
    return result_messages


async def handle_chat(body: ChatRequest, current_user) -> ChatResponse:
    """REST endpoint handler (kept for backward compatibility)."""
    tool_fns = build_tools(current_user)
    tool_fn_map = {fn.__name__: fn for fn in tool_fns}
    groq_tools = [_fn_to_groq_tool(fn) for fn in tool_fns]
    system_prompt = _build_system_prompt(current_user)

    if not body.messages:
        return ChatResponse(messages=[])

    messages = _build_messages(system_prompt, body.messages[:-1], body.messages[-1].content)

    # Agentic loop: keep calling until model stops using tools
    for _ in range(5):
        response = await client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            tools=groq_tools if groq_tools else None,
            tool_choice="auto" if groq_tools else None,
            temperature=0.7,
        )
        msg = response.choices[0].message
        messages.append({"role": "assistant", "content": msg.content or "", "tool_calls": [
            {"id": tc.id, "type": "function", "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
            for tc in (msg.tool_calls or [])
        ]})

        if not msg.tool_calls:
            break

        tool_results = await _execute_tool_calls(msg.tool_calls, tool_fn_map)
        messages.extend(tool_results)

    final_text = msg.content or ""
    new_messages = body.messages.copy()
    new_messages.append(ChatMessage(role="model", content=final_text))
    return ChatResponse(messages=new_messages)


async def stream_chat(websocket: WebSocket, body: ChatRequest, current_user):
    """WebSocket handler with real-time streaming."""
    tool_fns = build_tools(current_user)
    tool_fn_map = {fn.__name__: fn for fn in tool_fns}
    groq_tools = [_fn_to_groq_tool(fn) for fn in tool_fns]
    system_prompt = _build_system_prompt(current_user)

    if not body.messages:
        await websocket.send_json({"done": True})
        return

    messages = _build_messages(system_prompt, body.messages[:-1], body.messages[-1].content)

    # Agentic loop: if model calls tools, execute them silently, then stream final reply
    for _ in range(5):
        response = await client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            tools=groq_tools if groq_tools else None,
            tool_choice="auto" if groq_tools else None,
            temperature=0.7,
        )
        msg = response.choices[0].message

        # If no tool calls, stream the final text response
        if not msg.tool_calls:
            stream = await client.chat.completions.create(
                model=GROQ_MODEL,
                messages=messages,
                stream=True,
                temperature=0.7,
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    await websocket.send_json({"chunk": delta})
            break

        # Execute tool calls and add results to message history
        messages.append({
            "role": "assistant",
            "content": msg.content or "",
            "tool_calls": [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {"name": tc.function.name, "arguments": tc.function.arguments}
                }
                for tc in msg.tool_calls
            ]
        })
        tool_results = await _execute_tool_calls(msg.tool_calls, tool_fn_map)
        messages.extend(tool_results)

    await websocket.send_json({"done": True})
