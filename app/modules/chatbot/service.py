import json
import inspect
import asyncio
from fastapi import WebSocket
from groq import AsyncGroq, RateLimitError, APIError
from .schemas import ChatRequest, ChatResponse, ChatMessage
from .tools import build_tools
from app.config import settings

client = AsyncGroq(api_key=settings.GROQ_API_KEY)

# Model to use — Groq's fastest, most capable model with tool support
GROQ_MODEL = "llama-3.3-70b-versatile"
FALLBACK_MODEL = "llama-3.1-8b-instant"

async def _chat_completions_create_with_fallback(**kwargs):
    try:
        return await client.chat.completions.create(**kwargs)
    except RateLimitError:
        kwargs["model"] = FALLBACK_MODEL
        return await client.chat.completions.create(**kwargs)
    except APIError as e:
        if e.status_code == 429:
            kwargs["model"] = FALLBACK_MODEL
            return await client.chat.completions.create(**kwargs)
        raise e


async def route_to_cafe_specialist(request_summary: str = "") -> str:
    """
    Use this to answer questions about cafes, branches, and scheduling staff meetings. 
    CRITICAL: You MUST ONLY use the 'request_summary' parameter. DO NOT create or add any other parameters (like cafe_id, start_time, attendees). Dump all extracted information into the single request_summary string.
    """
    return "Transferred to Cafe Specialist."

async def route_to_inventory_specialist(request_summary: str = "") -> str:
    """
    Use this to answer questions about menus, items, and stock inventory. 
    CRITICAL: You MUST ONLY use the 'request_summary' parameter. DO NOT create or add any other parameters.
    """
    return "Transferred to Inventory Specialist."

async def route_to_order_specialist(request_summary: str = "") -> str:
    """
    Use this to answer questions about customer orders and status updates. 
    CRITICAL: You MUST ONLY use the 'request_summary' parameter. DO NOT create or add any other parameters.
    """
    return "Transferred to Order Specialist."

def _build_system_prompt(current_user, agent_type: str = "supervisor", body: ChatRequest = None) -> str:
    base = f"The current user is logged in as {current_user.role.name} with User ID {current_user.id}.\n"
    
    authorized_cafes = list({scope.cafeId for scope in current_user.userScopes if scope.cafeId is not None})
    if len(authorized_cafes) == 1:
        base += f"The user manages a single Cafe (ID: {authorized_cafes[0]}). Use this cafe ID automatically when scheduling meetings, viewing staff, or searching menus.\n"
    elif len(authorized_cafes) > 1:
        base += f"The user manages multiple cafes (IDs: {authorized_cafes}). Always ask which cafe they want to interact with if they don't specify.\n"
        
    if body and body.client_time:
        base += f"The user's current local device time is {body.client_time} (Timezone: {body.timezone}). Use this exact time to accurately calculate relative dates/times like 'tomorrow', 'next week', '10 AM', etc.\n"
    
    rules = (
        "CRITICAL INSTRUCTIONS:\n"
        "1. ONLY use the exact tools provided. DO NOT guess or invent tool names.\n"
        "2. If you don't have a tool to answer the user's request, politely inform them.\n"
        "3. DO NOT expose internal tool names, function signatures, or JSON to the user. Just seamlessly present the results.\n"
        "4. If a tool requires arguments that the user has not provided (like dates, times, names, or attendee IDs), explicitly ask the user for that missing information before calling the tool.\n"
        "5. NEVER ROLEPLAY OR FABRICATE DATA. DO NOT pretend a tool succeeded if you haven't successfully executed it and received a success response.\n"
        "6. Format your responses cleanly in Markdown."
    )
    
    if agent_type == "supervisor":
        return f"You are the Supervisor Assistant for Haji Cafe Platform.\n{base}\nYour ONLY job is to chat directly with the user for general greetings, OR route their request to the correct specialist using the handoff tools provided. Do NOT guess answers for specific data if you can route it.\n{rules}"
    elif agent_type == "cafe":
        cafe_rules = "\n6. For scheduling meetings: You MUST know the exact cafe_id, the meeting time/date, and the exact User IDs of the attendees. If you don't know the attendee User IDs, ALWAYS call get_staff_list first. Do not try to guess IDs."
        return f"You are the Cafe Specialist.\n{base}\nUse your tools to view and manage cafes, branches, and schedule staff meetings.\n{rules}{cafe_rules}"
    elif agent_type == "inventory":
        return f"You are the Inventory Specialist.\n{base}\nUse your tools to view menus and manage branch inventory.\n{rules}"
    elif agent_type == "order":
        return f"You are the Order Specialist.\n{base}\nUse your tools to view and update customer orders.\n{rules}"
    
    return f"You are a helpful assistant.\n{base}\n{rules}"


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

def _get_agent_context(current_user, agent_name: str, body: ChatRequest = None):
    sys_prompt = _build_system_prompt(current_user, agent_name, body)
    if agent_name == "supervisor":
        tool_fns = [route_to_cafe_specialist, route_to_inventory_specialist, route_to_order_specialist]
    else:
        tool_fns = build_tools(current_user, agent_name)
    
    tool_fn_map = {fn.__name__: fn for fn in tool_fns}
    groq_tools = [_fn_to_groq_tool(fn) for fn in tool_fns]
    return sys_prompt, tool_fn_map, groq_tools


async def handle_chat(body: ChatRequest, current_user) -> ChatResponse:
    """REST endpoint handler (kept for backward compatibility)."""
    if not body.messages:
        return ChatResponse(messages=[])

    active_agent = "supervisor"
    sys_prompt, tool_fn_map, groq_tools = _get_agent_context(current_user, active_agent, body)
    messages = _build_messages(sys_prompt, body.messages[:-1], body.messages[-1].content)

    for _ in range(7):
        response = await _chat_completions_create_with_fallback(
            model=GROQ_MODEL,
            messages=messages,
            tools=groq_tools if groq_tools else None,
            tool_choice="auto" if groq_tools else None,
            temperature=0.1,
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
        
        routed = False
        for tc in msg.tool_calls:
            if tc.function.name == "route_to_cafe_specialist":
                active_agent = "cafe"
                routed = True
            elif tc.function.name == "route_to_inventory_specialist":
                active_agent = "inventory"
                routed = True
            elif tc.function.name == "route_to_order_specialist":
                active_agent = "order"
                routed = True
                
        if routed:
            sys_prompt, tool_fn_map, groq_tools = _get_agent_context(current_user, active_agent, body)
            messages[0]["content"] = sys_prompt

    final_text = msg.content or ""
    new_messages = body.messages.copy()
    new_messages.append(ChatMessage(role="model", content=final_text))
    return ChatResponse(messages=new_messages)


async def stream_chat(websocket: WebSocket, body: ChatRequest, current_user):
    """WebSocket handler with real-time streaming."""
    if not body.messages:
        await websocket.send_json({"done": True})
        return

    active_agent = "supervisor"
    sys_prompt, tool_fn_map, groq_tools = _get_agent_context(current_user, active_agent, body)
    messages = _build_messages(sys_prompt, body.messages[:-1], body.messages[-1].content)

    # Agentic tool-call loop (non-streaming): execute tools until model stops calling them
    for _ in range(7):
        response = await _chat_completions_create_with_fallback(
            model=GROQ_MODEL,
            messages=messages,
            tools=groq_tools if groq_tools else None,
            tool_choice="auto" if groq_tools else None,
            temperature=0.1,
        )
        msg = response.choices[0].message

        # No tool calls → model is ready to give final answer, break loop
        if not msg.tool_calls:
            break

        # Tool calls requested → execute them and add results to history
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
        
        routed = False
        for tc in msg.tool_calls:
            if tc.function.name == "route_to_cafe_specialist":
                active_agent = "cafe"
                routed = True
            elif tc.function.name == "route_to_inventory_specialist":
                active_agent = "inventory"
                routed = True
            elif tc.function.name == "route_to_order_specialist":
                active_agent = "order"
                routed = True
                
        if routed:
            sys_prompt, tool_fn_map, groq_tools = _get_agent_context(current_user, active_agent, body)
            messages[0]["content"] = sys_prompt

    # Stream the final answer — add the tool results to context and stream fresh
    stream = await _chat_completions_create_with_fallback(
        model=GROQ_MODEL,
        messages=messages,
        stream=True,
        temperature=0.4,
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            await websocket.send_json({"chunk": delta})

    await websocket.send_json({"done": True})
