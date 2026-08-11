import json
import inspect
from fastapi import WebSocket
from app.modules.chatbot.schemas import ChatRequest, ChatResponse, ChatMessage
from .llm import _chat_completions_create_with_fallback, _fn_to_groq_tool, _build_messages, GROQ_MODEL, FALLBACK_MODEL

from app.modules.chatbot.agents.supervisor import get_supervisor_prompt
from app.modules.chatbot.agents.cafe_agent import get_cafe_agent_prompt
from app.modules.chatbot.agents.inventory_agent import get_inventory_agent_prompt
from app.modules.chatbot.agents.order_agent import get_order_agent_prompt
from app.modules.chatbot.tools.registry import build_tools

# Routing tools (used by supervisor to transition state)
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
    Use this to answer ANY questions about customer orders, order status, or specific order details (e.g. 'order #4', 'order id 4').
    CRITICAL: You MUST ONLY use the 'request_summary' parameter. DO NOT create or add any other parameters.
    """
    return "Transferred to Order Specialist."

_TOOL_PROGRESS_MESSAGES = {
    "route_to_cafe_specialist":      "🔀 Routing to Cafe Specialist...",
    "route_to_inventory_specialist": "🔀 Routing to Inventory Specialist...",
    "route_to_order_specialist":     "🔀 Routing to Order Specialist...",
    "get_my_cafes":                  "🏪 Fetching your cafes...",
    "get_cafe":                      "🏪 Looking up cafe details...",
    "get_branches_for_cafe":         "🌿 Fetching branches...",
    "search_cafes":                  "🔍 Searching cafes...",
    "get_staff_list":                "👥 Fetching staff list...",
    "schedule_meeting":              "📅 Scheduling meeting on Google Calendar...",
    "get_menu":                      "🍽️ Fetching menu...",
    "search_menu":                   "🔍 Searching menu...",
    "get_branch_inventory":          "📦 Fetching inventory...",
    "upsert_inventory_quantity":     "✏️ Updating stock...",
    "get_recent_orders":             "🧾 Fetching recent orders...",
    "get_order_by_id":               "🧾 Looking up order details...",
    "update_order_status":           "✅ Updating order status...",
}

async def _execute_tool_calls(tool_calls, tool_fn_map: dict, websocket=None) -> list[dict]:
    result_messages = []
    for tc in tool_calls:
        fn_name = tc.function.name
        fn_args = json.loads(tc.function.arguments or "{}")
        fn = tool_fn_map.get(fn_name)

        if websocket:
            progress_msg = _TOOL_PROGRESS_MESSAGES.get(fn_name, f"⚙️ Running {fn_name}...")
            await websocket.send_json({"progress": progress_msg})

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

def _get_agent_context(current_user, agent_name: str, body: ChatRequest = None, messages: list = None):
    if agent_name == "supervisor":
        sys_prompt = get_supervisor_prompt(current_user, body)
        role_name = current_user.role.name
        if role_name == "STAFF":
            tool_fns = [route_to_order_specialist]
        elif role_name == "BRANCH_MANAGER":
            tool_fns = [route_to_inventory_specialist, route_to_order_specialist]
        else:
            tool_fns = [route_to_cafe_specialist, route_to_inventory_specialist, route_to_order_specialist]
    elif agent_name == "cafe":
        sys_prompt = get_cafe_agent_prompt(current_user, body)
        tool_fns = build_tools(current_user, agent_name)
    elif agent_name == "inventory":
        sys_prompt = get_inventory_agent_prompt(current_user, body)
        tool_fns = build_tools(current_user, agent_name)
    elif agent_name == "order":
        sys_prompt = get_order_agent_prompt(current_user, body)
        tool_fns = build_tools(current_user, agent_name)
    else:
        from app.modules.chatbot.agents.base import get_base_prompt
        sys_prompt = get_base_prompt(current_user, body)
        tool_fns = []
    
    history_tool_names = set()
    if messages:
        for m in messages:
            if m.get("role") == "assistant" and m.get("tool_calls"):
                for tc in m["tool_calls"]:
                    if "function" in tc and "name" in tc["function"]:
                        history_tool_names.add(tc["function"]["name"])
                        
    all_possible_tools = build_tools(current_user, "all")
    all_possible_tools.extend([route_to_cafe_specialist, route_to_inventory_specialist, route_to_order_specialist])
    all_tool_fn_map = {fn.__name__: fn for fn in all_possible_tools}

    current_tool_names = {fn.__name__ for fn in tool_fns}
    for t_name in history_tool_names:
        if t_name not in current_tool_names and t_name in all_tool_fn_map:
            tool_fns.append(all_tool_fn_map[t_name])
            current_tool_names.add(t_name)
            
    tool_fn_map = {fn.__name__: fn for fn in tool_fns}
    groq_tools = [_fn_to_groq_tool(fn) for fn in tool_fns]
    return sys_prompt, tool_fn_map, groq_tools


async def handle_chat(body: ChatRequest, current_user) -> ChatResponse:
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
            sys_prompt, tool_fn_map, groq_tools = _get_agent_context(current_user, active_agent, body, messages)
            messages[0]["content"] = sys_prompt

    final_text = msg.content or ""
    new_messages = body.messages.copy()
    new_messages.append(ChatMessage(role="model", content=final_text))
    return ChatResponse(messages=new_messages)


async def stream_chat(websocket: WebSocket, body: ChatRequest, current_user):
    if not body.messages:
        await websocket.send_json({"done": True})
        return

    await websocket.send_json({"progress": "⏳ Thinking..."})

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

        if not msg.tool_calls:
            break

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
        tool_results = await _execute_tool_calls(msg.tool_calls, tool_fn_map, websocket)
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
            sys_prompt, tool_fn_map, groq_tools = _get_agent_context(current_user, active_agent, body, messages)
            messages[0]["content"] = sys_prompt

    stream = await _chat_completions_create_with_fallback(
        model=GROQ_MODEL,
        messages=messages,
        tools=groq_tools if groq_tools else None,
        tool_choice="none",
        stream=True,
        temperature=0.1,
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            await websocket.send_json({"chunk": delta})

    await websocket.send_json({"done": True})
