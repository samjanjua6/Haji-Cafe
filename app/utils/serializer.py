"""
Utility for converting Prisma ORM model objects into plain dicts.

Prisma Python client returns objects with camelCase attributes (e.g. `ownerId`,
`masterItem`, `basePrice`). FastAPI's response_model expects snake_case field
names and uses `from_attributes` aliasing, which is fragile with nested
relations. The simplest and most reliable approach is to convert Prisma objects
to plain dicts before returning them from route handlers. FastAPI will then
JSON-serialize the dict directly with zero Pydantic coercion issues.
"""

from decimal import Decimal
from datetime import datetime
from enum import Enum
from typing import Any


def to_jsonable(value: Any) -> Any:
    """Convert a single value to a JSON-serialisable primitive."""
    if value is None:
        return None
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, list):
        return [to_jsonable(v) for v in value]
    if hasattr(value, "__dict__"):
        return prisma_to_dict(value)
    return value


def prisma_to_dict(obj: Any) -> Any:
    """
    Recursively convert a Prisma model object (or list thereof) to a plain
    camelCase dict. Skips private/dunder attributes and any relation that
    Prisma left as None (i.e. not included in the query).
    """
    if obj is None:
        return None
    if isinstance(obj, list):
        return [prisma_to_dict(item) for item in obj]
    if not hasattr(obj, "__dict__"):
        return to_jsonable(obj)

    result = {}
    for key, value in obj.__dict__.items():
        # Skip internal Prisma / Pydantic private fields
        if key.startswith("_"):
            continue
        result[key] = to_jsonable(value)
    return result
