# auth_middleware.py
# Re-exports get_current_user from core/dependencies for backwards compatibility.
# New modules should import directly from app.core.dependencies.

from app.core.dependencies import get_current_user

__all__ = ["get_current_user"]
