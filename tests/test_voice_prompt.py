import sys
from pathlib import Path
from types import SimpleNamespace

# Ensure root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.modules.chatbot.agent import _build_voice_system_prompt

def test_voice_prompt():
    role = SimpleNamespace(name="CAFE_OWNER")
    user_scope = SimpleNamespace(cafeId=1, branchId=1, cafe=None, branch=None)
    owned_cafe = SimpleNamespace(id=1, name="Sunrise Coffee", isArchived=False)
    user = SimpleNamespace(
        id=2,
        email="samjanjua6@gmail.com",
        role=role,
        userScopes=[user_scope],
        ownedCafes=[owned_cafe],
        timezone="Asia/Karachi"
    )
    prompt = _build_voice_system_prompt(user)
    print("--- GENERATED VOICE SYSTEM PROMPT ---")
    print(prompt)
    assert "Asia/Karachi" in prompt
    assert "CURRENT LIVE TIME & DATE" in prompt
    assert "Sunrise Coffee" in prompt or "single Cafe (ID: 1)" in prompt
    assert "schedule_meeting" in prompt
    print("\n[OK] Voice prompt successfully generated and validated!")

if __name__ == "__main__":
    test_voice_prompt()
