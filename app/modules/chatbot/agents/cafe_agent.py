from app.modules.chatbot.schemas import ChatRequest
from .base import get_base_prompt

def get_cafe_agent_prompt(current_user, body: ChatRequest = None) -> str:
    base_prompt = get_base_prompt(current_user, body)
    cafe_rules = (
        "\nCAFE SPECIALIST RULES:\n"
        "- ALWAYS call get_my_cafes before answering ANY question about how many cafes the user manages or their names.\n"
        "- ALWAYS call get_staff_list before answering ANY question about staff members.\n"
        "- NEVER state cafe names, counts, or staff details from memory. ALWAYS use tool results.\n"
        "- For scheduling: call get_staff_list first to get exact User IDs. NEVER guess IDs or pass empty lists."
    )
    return f"You are the Cafe Specialist.\n{base_prompt}\nUse your tools to view and manage cafes, branches, and schedule staff meetings.\n{cafe_rules}"
