from typing import Any, Generic, Optional, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """
    Standard API response envelope used across all modules.

    Example success:
        { "success": true, "message": "Created.", "data": { ... } }

    Example error (handled by FastAPI's exception handler):
        { "success": false, "message": "Not found.", "data": null }
    """
    success: bool = True
    message: Optional[str] = None
    data: Optional[T] = None


def success(data: Any = None, message: str = "Success.") -> dict:
    """Helper to return a standardised success response dict."""
    return {"success": True, "message": message, "data": data}


def error(message: str = "An error occurred.") -> dict:
    """Helper to return a standardised error response dict."""
    return {"success": False, "message": message, "data": None}
