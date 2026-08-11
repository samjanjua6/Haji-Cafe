from app.modules.chatbot.schemas import ChatRequest
from .base import get_base_prompt

def get_inventory_agent_prompt(current_user, body: ChatRequest = None) -> str:
    base_prompt = get_base_prompt(current_user, body)
    role_name = current_user.role.name
    
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
            "- For stock/inventory questions, you MUST call get_branch_inventory with the branch_id.\n"
            "- If the user has NOT specified a branch, ask them which branch they mean before calling any tool.\n"
            "  Do NOT guess the branch_id. Do NOT call get_branches_for_cafe (you don't have that tool here).\n"
            "- For master menu questions (items, categories, base prices), call get_menu.\n"
            "- NEVER state menu item names, prices, or stock levels from memory. ALWAYS use tool results.\n"
            "- NEVER pass extra parameters to tools. Each tool accepts ONLY its documented parameters."
        )
        
    return f"You are the Inventory Specialist.\n{base_prompt}\nUse your tools to view menus and manage branch inventory.\n{inventory_rules}"
