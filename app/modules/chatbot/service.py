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
    role_name = current_user.role.name
    base = f"The current user is logged in as {role_name} with User ID {current_user.id}.\n"

    # --- Cafe-level scope (for SUPER_ADMIN and CAFE_OWNER) ---
    authorized_cafes = list({scope.cafeId for scope in current_user.userScopes if scope.cafeId is not None})
    if len(authorized_cafes) == 1:
        base += f"The user manages a single Cafe (ID: {authorized_cafes[0]}). Use this cafe ID automatically when scheduling meetings, viewing staff, or searching menus.\n"
    elif len(authorized_cafes) > 1:
        base += f"The user manages multiple cafes (IDs: {authorized_cafes}). Always ask which cafe they want to interact with if they don't specify.\n"

    # --- Branch-level scope (for BRANCH_MANAGER and STAFF) ---
    authorized_branches = list({scope.branchId for scope in current_user.userScopes if scope.branchId is not None})
    if len(authorized_branches) == 1:
        base += f"The user manages a single Branch (ID: {authorized_branches[0]}). Use this branch ID automatically when querying inventory or orders — do NOT ask the user for it.\n"
    elif len(authorized_branches) > 1:
        base += f"The user manages multiple branches (IDs: {authorized_branches}). Always ask which branch they want to interact with if they don't specify.\n"

    if body and body.client_time:
        base += f"The user's current local device time is {body.client_time} (Timezone: {body.timezone}). Use this exact time to accurately calculate relative dates/times like 'tomorrow', 'next week', '10 AM', etc.\n"

    rules = (
        "CRITICAL INSTRUCTIONS — READ CAREFULLY:\n"
        "1. ONLY use the exact tools provided. DO NOT guess or invent tool names.\n"
        "2. If you don't have a tool to answer the user's request, politely inform them.\n"
        "3. DO NOT expose internal tool names, function signatures, or JSON to the user. Seamlessly present results.\n"
        "4. If a tool requires arguments the user has not provided, ask for that information before calling the tool.\n"
        "5. *** ABSOLUTE RULE — NO HALLUCINATION ***: You MUST NEVER answer questions about cafe names, counts, staff, menus, orders, inventory, or ANY business data from memory or assumptions. You MUST ALWAYS call the appropriate tool and use ONLY the data returned by that tool. If you answer without calling a tool, you are FABRICATING data. This is a critical violation.\n"
        "6. Format your responses cleanly in Markdown.\n"
        "7. If a tool returns an error, report the error to the user honestly. Do NOT retry with made-up arguments.\n"
        "8. *** ABSOLUTE RULE — NO FUNCTION SYNTAX ***: NEVER output raw function call syntax, XML tags, JSON blocks, or <function=...> patterns in your response text. Tool calls are invisible system operations — they NEVER appear in your text output under any circumstances."
    )

    if agent_type == "supervisor":
        # Build routing options based on what this role is actually allowed to do
        if role_name == "STAFF":
            routing_rules = (
                "\nROUTING RULES — You MUST route to a specialist for the following requests:\n"
                "- Anything about orders or order status → route_to_order_specialist\n"
                "You MUST NOT answer order questions directly. ALWAYS route them.\n"
                "You are not authorised to manage cafes, menus, or inventory. Politely decline those requests.\n"
                "Only answer greetings and general platform questions directly."
            )
        elif role_name == "BRANCH_MANAGER":
            routing_rules = (
                "\nROUTING RULES — You MUST route to a specialist for the following requests:\n"
                "- Anything about branch menu items, stock, or inventory → route_to_inventory_specialist\n"
                "- Anything about orders or order status → route_to_order_specialist\n"
                "You MUST NOT answer these requests directly. ALWAYS route them.\n"
                "You are not authorised to manage cafes or the master menu. Politely decline those requests.\n"
                "Only answer greetings and general platform questions directly."
            )
        else:  # CAFE_OWNER, SUPER_ADMIN
            routing_rules = (
                "\nROUTING RULES — You MUST route to a specialist for ANY of the following requests:\n"
                "- Anything about cafes, branches, staff, or meetings → route_to_cafe_specialist\n"
                "- Anything about menus, items, stock, or inventory → route_to_inventory_specialist\n"
                "- Anything about orders or order status → route_to_order_specialist\n"
                "You MUST NOT answer these requests directly. ALWAYS route them. Only answer greetings and general platform questions directly."
            )

        scheduling_note = ""
        if role_name == "SUPER_ADMIN":
            scheduling_note = "\nSUPER_ADMIN RESTRICTION: You are a Super Admin. You oversee the entire platform and are NOT linked to any specific cafe. You CANNOT schedule meetings, view staff lists, or perform any cafe-specific tasks. If asked, politely explain this and suggest they log in as a Cafe Owner."
        return f"You are the Supervisor Assistant for Haji Cafe Platform.\n{base}\n{rules}{routing_rules}{scheduling_note}"

    elif agent_type == "cafe":
        cafe_rules = (
            "\nCAFE SPECIALIST RULES:\n"
            "- ALWAYS call get_my_cafes before answering ANY question about how many cafes the user manages or their names.\n"
            "- ALWAYS call get_staff_list before answering ANY question about staff members.\n"
            "- NEVER state cafe names, counts, or staff details from memory. ALWAYS use tool results.\n"
            "- For scheduling: call get_staff_list first to get exact User IDs. NEVER guess IDs or pass empty lists."
        )
        return f"You are the Cafe Specialist.\n{base}\nUse your tools to view and manage cafes, branches, and schedule staff meetings.\n{rules}{cafe_rules}"

    elif agent_type == "inventory":
        if role_name in ["BRANCH_MANAGER", "STAFF"]:
            inventory_rules = (
                "\nINVENTORY SPECIALIST RULES:\n"
                "- ALWAYS call get_branch_inventory before answering ANY question about stock or branch menu items.\n"
                "- You manage the BRANCH menu (overrides and stock levels). You do NOT manage the master cafe menu.\n"
                "- NEVER state item names, prices, or stock levels from memory. ALWAYS use tool results."
            )
        else:  # CAFE_OWNER, SUPER_ADMIN
            inventory_rules = (
                "\nINVENTORY SPECIALIST RULES:\n"
                "- To answer questions about stock levels or branch inventory, you MUST know the branch_id.\n"
                "  If the user has not provided a branch name or ID, call get_branches_for_cafe first to list\n"
                "  available branches, then call get_branch_inventory with the correct branch_id.\n"
                "- For master menu questions (items, categories, base prices), call get_menu.\n"
                "- NEVER state menu item names, prices, or stock levels from memory. ALWAYS use tool results.\n"
                "- NEVER pass extra parameters to tools. Each tool accepts ONLY its documented parameters."
            )
        return f"You are the Inventory Specialist.\n{base}\nUse your tools to view menus and manage branch inventory.\n{rules}{inventory_rules}"

    elif agent_type == "order":
        order_rules = (
            "\nORDER SPECIALIST RULES:\n"
            "- ALWAYS call get_recent_orders before answering ANY question about orders.\n"
            "- NEVER state order details, statuses, or totals from memory. ALWAYS use tool results."
        )
        return f"You are the Order Specialist.\n{base}\nUse your tools to view and update customer orders.\n{rules}{order_rules}"

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
        
        if getattr(annotation, '__origin__', None) is list:
            item_type = getattr(annotation, '__args__', (str,))[0]
            item_json_type = type_map.get(item_type, "string")
            properties[name] = {
                "type": "array",
                "items": {"type": item_json_type}
            }
        else:
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


# Friendly progress messages shown in the UI while a tool is running
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
    "update_order_status":           "✅ Updating order status...",
}

async def _execute_tool_calls(tool_calls, tool_fn_map: dict, websocket=None) -> list[dict]:
    """Executes all tool calls returned by the model and returns result messages."""
    result_messages = []
    for tc in tool_calls:
        fn_name = tc.function.name
        fn_args = json.loads(tc.function.arguments or "{}")
        fn = tool_fn_map.get(fn_name)

        # Stream a friendly progress message to the UI before executing the tool
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
    sys_prompt = _build_system_prompt(current_user, agent_name, body)
    if agent_name == "supervisor":
        role_name = current_user.role.name
        # Only expose routing functions that lead to specialists with real tools for this role
        if role_name == "STAFF":
            tool_fns = [route_to_order_specialist]
        elif role_name == "BRANCH_MANAGER":
            tool_fns = [route_to_inventory_specialist, route_to_order_specialist]
        else:  # CAFE_OWNER, SUPER_ADMIN
            tool_fns = [route_to_cafe_specialist, route_to_inventory_specialist, route_to_order_specialist]
    else:
        tool_fns = build_tools(current_user, agent_name)
        # Sub-agents do NOT get routing tools — they only do their specialized work
    
    # We must also ensure any tool called in 'messages' history is included in groq_tools
    # to satisfy API validation (Groq/OpenAI error 400).
    history_tool_names = set()
    if messages:
        for m in messages:
            if m.get("role") == "assistant" and m.get("tool_calls"):
                for tc in m["tool_calls"]:
                    if "function" in tc and "name" in tc["function"]:
                        history_tool_names.add(tc["function"]["name"])
                        
    # Get all possible tools so we can lookup the history ones
    all_possible_tools = build_tools(current_user, "all")
    all_possible_tools.extend([route_to_cafe_specialist, route_to_inventory_specialist, route_to_order_specialist])
    all_tool_fn_map = {fn.__name__: fn for fn in all_possible_tools}

    # Add history tools if they are missing
    current_tool_names = {fn.__name__ for fn in tool_fns}
    for t_name in history_tool_names:
        if t_name not in current_tool_names and t_name in all_tool_fn_map:
            tool_fns.append(all_tool_fn_map[t_name])
            current_tool_names.add(t_name)
            
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
            sys_prompt, tool_fn_map, groq_tools = _get_agent_context(current_user, active_agent, body, messages)
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

    # Stream the final answer — tools must be passed to avoid the model regenerating raw function call text
    stream = await _chat_completions_create_with_fallback(
        model=GROQ_MODEL,
        messages=messages,
        tools=groq_tools if groq_tools else None,
        tool_choice="none",   # Force text-only response, no more tool calls
        stream=True,
        temperature=0.1,
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            await websocket.send_json({"chunk": delta})

    await websocket.send_json({"done": True})
