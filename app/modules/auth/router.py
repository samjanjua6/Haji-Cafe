from fastapi import APIRouter, Depends, status
from fastapi.responses import RedirectResponse

from app.middleware.auth_middleware import get_current_user
from app.modules.auth import service
from app.modules.auth.schemas import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
)

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest):
    """Register a new user with email and password."""
    return await service.register(body.email, body.password)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    """Login with email and password to receive access + refresh tokens."""
    return await service.login(body.email, body.password)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest):
    """Exchange a valid refresh token for a new access + refresh token pair."""
    return await service.refresh(body.refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(body: RefreshRequest, _=Depends(get_current_user)):
    """Revoke the current refresh token (logout)."""
    await service.logout(body.refresh_token)


@router.get("/google")
async def google_login():
    """Redirect the user to Google's OAuth consent screen."""
    url = await service.get_google_auth_url()
    return RedirectResponse(url=url)


@router.get("/google/callback")
async def google_callback(code: str):
    """Handle Google OAuth callback. Exchanges code for tokens, upserts user, and redirects to frontend."""
    tokens = await service.handle_google_callback(code)
    
    # Redirect back to the frontend with tokens in the URL
    frontend_url = "https://haji-cafe.mychatbot.codes"
    redirect_url = f"{frontend_url}/?access_token={tokens['access_token']}&refresh_token={tokens['refresh_token']}"
    return RedirectResponse(url=redirect_url)


@router.get("/me")
async def me(current_user=Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role.name,
        "auth_provider": current_user.authProvider,
        "has_google_calendar": bool(getattr(current_user, "googleAccessToken", None)),
        "scopes": [
            {
                "cafeId": s.cafeId,
                "branchId": s.branchId,
                "cafeName": s.cafe.name if s.cafe else None,
                "branchName": s.branch.name if s.branch else None,
            } for s in current_user.userScopes
        ]
    }


@router.get("/google/connect")
async def google_connect(current_user=Depends(get_current_user)):
    """
    For users who are already logged in with email/password.
    Returns the Google OAuth URL they need to visit to grant Calendar permissions.
    The callback will save their Google tokens without changing their account.
    """
    url = await service.get_google_auth_url()
    return {"connect_url": url}
