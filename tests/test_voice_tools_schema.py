import sys
from pathlib import Path
from types import SimpleNamespace

# Ensure root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from livekit.agents import llm as agents_llm
from livekit.agents.llm._provider_format.openai import to_fnc_ctx
from app.modules.chatbot.tools.registry import build_tools

def mock_user(role_name: str, cafe_id: int = 1, branch_id: int = 1):
    role = SimpleNamespace(name=role_name)
    user_scope = SimpleNamespace(cafeId=cafe_id, branchId=branch_id, cafe=None, branch=None)
    owned_cafe = SimpleNamespace(id=cafe_id, name="Test Cafe", isArchived=False)
    user = SimpleNamespace(
        id=2,
        email="test@haji.cafe",
        role=role,
        userScopes=[user_scope],
        ownedCafes=[owned_cafe],
        timezone="Asia/Karachi"
    )
    return user

def test_tool_schemas():
    roles = ["SUPER_ADMIN", "CAFE_OWNER", "BRANCH_MANAGER", "STAFF"]
    for role in roles:
        user = mock_user(role)
        raw_tools = build_tools(user, "all")
        print(f"\n--- Testing role: {role} ({len(raw_tools)} tools) ---")
        
        # 1. Wrap with LiveKit function_tool
        wrapped_tools = [agents_llm.function_tool(fn) for fn in raw_tools]
        assert len(wrapped_tools) == len(raw_tools), f"Mismatch in wrapped tools count for {role}"
        
        # 2. Build ToolContext and generate schemas
        tool_ctx = agents_llm.ToolContext(wrapped_tools)
        schemas = to_fnc_ctx(tool_ctx, strict=True)
        print(f"Successfully generated {len(schemas)} strict OpenAI schemas:")
        for s in schemas:
            fn = s["function"]
            props = list(fn["parameters"].get("properties", {}).keys())
            print(f"  [OK] {fn['name']} - params: {props}")
            
    print("\nALL TOOL SCHEMAS VALIDATED SUCCESSFULLY!")

if __name__ == "__main__":
    test_tool_schemas()
