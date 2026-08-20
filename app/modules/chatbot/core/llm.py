import inspect
import typing
from groq import AsyncGroq, RateLimitError, APIError
from app.config import settings

client = AsyncGroq(api_key=settings.GROQ_API_KEY)

# Model to use — Groq's fastest, most capable model with tool support
GROQ_MODEL = "openai/gpt-oss-120b"
FALLBACK_MODEL = "openai/gpt-oss-20b"

async def _chat_completions_create_with_fallback(**kwargs):
    # Strip any None kwargs so Groq does not fail on tool_choice=None or tools=None
    clean_kwargs = {k: v for k, v in kwargs.items() if v is not None}
    try:
        return await client.chat.completions.create(**clean_kwargs)
    except RateLimitError:
        clean_kwargs["model"] = FALLBACK_MODEL
        return await client.chat.completions.create(**clean_kwargs)
    except APIError as e:
        if e.status_code == 429:
            clean_kwargs["model"] = FALLBACK_MODEL
            return await client.chat.completions.create(**clean_kwargs)
        raise e

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
        
        # Unwrap Union / Optional (e.g. list[int] | None or int | None)
        origin = getattr(annotation, '__origin__', None)
        args = getattr(annotation, '__args__', ())

        if origin is typing.Union or str(type(annotation)) == "<class 'types.UnionType'>":
            non_none_args = [a for a in args if a is not type(None)]
            if non_none_args:
                annotation = non_none_args[0]
                origin = getattr(annotation, '__origin__', None)
                args = getattr(annotation, '__args__', ())

        if origin is list or annotation is list:
            item_type = args[0] if args else str
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

def _build_messages(system_prompt: str, history: list, latest_content: str) -> list[dict]:
    """Converts our internal message format to Groq/OpenAI message format."""
    msgs = [{"role": "system", "content": system_prompt}]
    for msg in history:
        role = "user" if msg.role == "user" else "assistant"
        # BUG #2 FIX: preserve tool_calls on assistant messages so the Groq API
        # receives the full tool-use chain on subsequent turns. Without this, the
        # model loses context of what it already fetched and hallucinates answers.
        entry: dict = {"role": role, "content": msg.content or ""}
        if role == "assistant" and msg.tool_calls:
            entry["tool_calls"] = msg.tool_calls
        msgs.append(entry)
    msgs.append({"role": "user", "content": latest_content})
    return msgs
