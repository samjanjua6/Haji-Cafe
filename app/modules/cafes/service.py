from typing import Optional
from app.core.exceptions import NotFoundException, BadRequestException
from prisma.errors import ForeignKeyViolationError
from app.modules.cafes import repository


# --- Cafe Service ---

async def create_cafe(name: str, owner_id: Optional[int]):
    return await repository.create_cafe(name, owner_id)


async def get_all_cafes():
    return await repository.get_all_cafes()


async def get_cafe(cafe_id: int):
    cafe = await repository.get_cafe_by_id(cafe_id)
    if not cafe:
        raise NotFoundException("Café not found.")
    return cafe


async def update_cafe(cafe_id: int, name: Optional[str]):
    await get_cafe(cafe_id)  # Ensure it exists
    if name is not None:
        return await repository.update_cafe(cafe_id, name)
    return await repository.get_cafe_by_id(cafe_id)


async def delete_cafe(cafe_id: int):
    await get_cafe(cafe_id)
    try:
        return await repository.delete_cafe(cafe_id)
    except ForeignKeyViolationError:
        raise BadRequestException("Cannot delete café because it has existing branches or orders.")


# --- Branch Service ---

async def create_branch(cafe_id: int, name: str, location: Optional[str]):
    await get_cafe(cafe_id)  # Ensure parent cafe exists
    return await repository.create_branch(cafe_id, name, location)


async def get_branches(cafe_id: int):
    await get_cafe(cafe_id)
    return await repository.get_branches_by_cafe(cafe_id)


async def update_branch(cafe_id: int, branch_id: int, data: dict):
    branch = await repository.get_branch_by_id(branch_id)
    if not branch or branch.cafeId != cafe_id:
        raise NotFoundException("Branch not found in this café.")
    clean_data = {k: v for k, v in data.items() if v is not None}
    return await repository.update_branch(branch_id, clean_data)


async def delete_branch(cafe_id: int, branch_id: int):
    branch = await repository.get_branch_by_id(branch_id)
    if not branch or branch.cafeId != cafe_id:
        raise NotFoundException("Branch not found in this café.")
    try:
        return await repository.delete_branch(branch_id)
    except ForeignKeyViolationError:
        raise BadRequestException("Cannot delete branch because it has existing orders.")


# --- Staff Service ---

async def get_cafe_staff(cafe_id: int):
    await get_cafe(cafe_id)
    return await repository.get_staff_by_cafe(cafe_id)


# --- Meeting Service ---

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_CALENDAR_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events"


async def _refresh_google_access_token(refresh_token: str) -> str:
    """Use the refresh token to get a new Google access token."""
    import httpx
    from app.config import settings
    async with httpx.AsyncClient() as client:
        resp = await client.post(GOOGLE_TOKEN_URL, data={
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        })
        data = resp.json()
        if "error" in data:
            raise BadRequestException("Google token refresh failed. Please re-authenticate with Google.")
        return data["access_token"]


async def schedule_staff_meeting(cafe_id: int, owner_user_id: int, summary: str, description: Optional[str], start_time, end_time, attendee_user_ids: list):
    import httpx
    from app.database import db

    # 1. Verify cafe exists
    await get_cafe(cafe_id)

    # 2. Load the cafe owner's Google tokens
    owner = await db.user.find_unique(where={"id": owner_user_id})
    if not owner or not owner.googleAccessToken:
        raise BadRequestException(
            "You have not connected your Google account with Calendar permissions. "
            "Please sign in via Google OAuth to grant calendar access."
        )

    # 3. Fetch attendee emails from the database
    attendees = await repository.get_users_by_ids(attendee_user_ids)
    if not attendees:
        raise NotFoundException("None of the specified attendee user IDs were found.")
    attendee_emails = [{"email": u.email} for u in attendees]

    # 4. Build the Google Calendar event payload
    event_body = {
        "summary": summary,
        "description": description or "",
        "start": {"dateTime": start_time.isoformat(), "timeZone": "UTC"},
        "end": {"dateTime": end_time.isoformat(), "timeZone": "UTC"},
        "attendees": attendee_emails,
        "sendUpdates": "all",  # Sends email invites to all attendees
    }

    # 5. Attempt to create the event using the stored access token
    access_token = owner.googleAccessToken
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            GOOGLE_CALENDAR_URL,
            json=event_body,
            headers={"Authorization": f"Bearer {access_token}"},
        )

        # 6. If the token is expired (401), refresh it and retry once
        if resp.status_code == 401 and owner.googleRefreshToken:
            access_token = await _refresh_google_access_token(owner.googleRefreshToken)
            # Persist the new access token
            from app.modules.auth.repository import update_google_tokens
            await update_google_tokens(owner_user_id, access_token, None)
            resp = await client.post(
                GOOGLE_CALENDAR_URL,
                json=event_body,
                headers={"Authorization": f"Bearer {access_token}"},
            )

        if resp.status_code not in (200, 201):
            raise BadRequestException(f"Google Calendar API error: {resp.json().get('error', {}).get('message', 'Unknown error')}")

        event = resp.json()

    return {
        "message": "Meeting scheduled successfully.",
        "event_id": event.get("id"),
        "event_link": event.get("htmlLink"),
        "summary": event.get("summary"),
        "start": event.get("start"),
        "end": event.get("end"),
        "attendees": [a.get("email") for a in event.get("attendees", [])],
    }
