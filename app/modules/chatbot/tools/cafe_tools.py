from app.database import db
from app.core.exceptions import UnauthorizedException
import difflib

def build_cafe_tools(current_user, authorized_cafes, _check_cafe_access):
    role = current_user.role.name
    user_id = current_user.id
    tools = []

    def _resolve_cafe_id(cafe_id: int) -> int:
        if (cafe_id is None or cafe_id == 0) and len(authorized_cafes) == 1:
            return list(authorized_cafes)[0]
        return cafe_id or 0

    async def get_my_cafes() -> str:
        """
        [SUPER_ADMIN, CAFE_OWNER] Get a summary of all cafes the user has access to.
        Returns cafe IDs and names.
        """
        if role not in ["SUPER_ADMIN", "CAFE_OWNER"]:
            return "Error: Your role does not allow viewing cafes."
            
        where_clause = {"isArchived": False}
        if role != "SUPER_ADMIN":
            where_clause["id"] = {"in": list(authorized_cafes)}
            
        cafes = await db.cafe.find_many(where=where_clause)
        if not cafes:
            return "You don't own any active cafes."
            
        return "Cafes:\n" + "\n".join([f"- ID: {c.id}, Name: {c.name}" for c in cafes])

    async def get_branches_for_cafe(cafe_id: int = 0) -> str:
        """
        [SUPER_ADMIN, CAFE_OWNER] Get all branches for a specific cafe_id.
        """
        cafe_id = _resolve_cafe_id(cafe_id)
        if cafe_id == 0:
            return "ERROR: A valid cafe_id is required. Call get_my_cafes first to find your cafe ID."

        try:
            await _check_cafe_access(cafe_id)
        except UnauthorizedException as e:
            return str(e)
            
        branches = await db.branch.find_many(where={"cafeId": cafe_id})
        if not branches:
            return f"No branches found for cafe {cafe_id}."
            
        return f"Branches for Cafe {cafe_id}:\n" + "\n".join([
            f"- Branch ID: {b.id}, Name: {b.name}, Location: {b.location or 'Not set'}"
            for b in branches
        ])

    async def get_cafe(cafe_id: int = 0) -> str:
        """
        [SUPER_ADMIN, CAFE_OWNER] Get details of a specific cafe.
        """
        cafe_id = _resolve_cafe_id(cafe_id)
        if cafe_id == 0:
            return "ERROR: A valid cafe_id is required. Call get_my_cafes first to find your cafe ID."

        try:
            await _check_cafe_access(cafe_id)
        except UnauthorizedException as e:
            return str(e)
            
        cafe = await db.cafe.find_unique(where={"id": cafe_id}, include={"owner": True})
        if not cafe:
            return f"Cafe {cafe_id} not found."
            
        owner_email = cafe.owner.email if cafe.owner else "None"
        return f"Cafe ID: {cafe.id}\nName: {cafe.name}\nOwner: {owner_email}\nCreated: {cafe.createdAt}"

    async def search_cafes(query: str = "") -> str:
        """
        [SUPER_ADMIN, CAFE_OWNER] Search for a cafe by name. Use this if the user provides a cafe name with possible typos.
        """
        if role not in ["SUPER_ADMIN", "CAFE_OWNER"]:
            return "Error: Your role does not allow searching cafes."
            
        where_clause = {"isArchived": False}
        if role != "SUPER_ADMIN":
            where_clause["id"] = {"in": list(authorized_cafes)}
            
        cafes = await db.cafe.find_many(where=where_clause)
        if not cafes:
            return "You don't own any cafes to search."
            
        if not query.strip():
            return "Cafes:\n" + "\n".join([f"- ID: {c.id}, Name: {c.name}" for c in cafes])

        names = {c.name: c for c in cafes}
        matches = difflib.get_close_matches(query, names.keys(), n=3, cutoff=0.3)
        
        if not matches:
            return f"No cafes found matching '{query}'"
            
        matched_cafes = [names[m] for m in matches]
        return f"Search results for '{query}':\n" + "\n".join([f"- ID: {c.id}, Name: {c.name}" for c in matched_cafes])

    async def get_staff_list(cafe_id: int = 0) -> str:
        """
        [CAFE_OWNER] Get a list of all staff members for a specific cafe. 
        Returns their User IDs, Emails, and Roles.
        """
        if role == "SUPER_ADMIN":
            return "Error: Super Admins cannot view staff lists directly. Please log in as a Cafe Owner to manage cafe staff."
        
        cafe_id = _resolve_cafe_id(cafe_id)
        if cafe_id == 0:
            return "ERROR: A valid integer cafe_id is required. Use get_my_cafes first to find your cafe ID."

        try:
            await _check_cafe_access(cafe_id)
        except UnauthorizedException as e:
            return str(e)

        try:
            from app.modules.cafes import service as cafe_service
            staff = await cafe_service.get_cafe_staff(cafe_id)
            if not staff:
                return f"No staff found for cafe {cafe_id}."

            res = f"Staff for Cafe {cafe_id}:\n"
            for s in staff:
                role_name = s.role.name if s.role else 'Unknown'
                res += f"- User ID: {s.id} | Email: {s.email} | Role: {role_name}\n"
            return res
        except Exception as e:
            return f"Error retrieving staff list: {str(e)}"

    async def schedule_meeting(
        start_time_iso: str, 
        end_time_iso: str, 
        timezone: str = "",
        cafe_id: int = 0, 
        summary: str = "Staff Meeting", 
        description: str = "", 
        attendee_user_ids: list[int] | None = None
    ) -> str:
        """
        [SUPER_ADMIN, CAFE_OWNER] Schedule a Google Calendar meeting with staff.
        - start_time_iso & end_time_iso MUST be naive ISO 8601 strings (e.g. 2026-08-15T10:00:00).
        - timezone: the timezone string (e.g. 'Asia/Karachi'). If omitted, defaults to user timezone.
        - attendee_user_ids: optional list of integer User IDs (e.g. [2, 4]). Use get_staff_list to find IDs.
        """
        cafe_id = _resolve_cafe_id(cafe_id)
        if cafe_id == 0:
            return "ERROR: You must provide a valid cafe_id. Call get_my_cafes first."

        user_tz = getattr(current_user, "timezone", "") or "Asia/Karachi"
        if user_tz.upper() == "UTC":
            user_tz = "Asia/Karachi"
        resolved_tz = timezone.strip() if timezone.strip() and timezone.strip().upper() != "UTC" else user_tz
            
        if not attendee_user_ids:
            return "ERROR: You cannot schedule a meeting without attendees. Please check with the user which staff members to invite, and call get_staff_list to find their integer IDs."
            
        try:
            await _check_cafe_access(cafe_id)
        except UnauthorizedException as e:
            return str(e)
            
        try:
            import re
            from datetime import datetime
            def _parse_dt(s: str) -> datetime:
                s = s.strip().replace(" ", "T")
                s = re.sub(r'Z$', '', s)
                s = re.sub(r'[+-]\d{2}:\d{2}$', '', s)
                if len(s) == 16:  # YYYY-MM-DDTHH:MM
                    s += ":00"
                return datetime.fromisoformat(s)

            start_dt = _parse_dt(start_time_iso)
            end_dt = _parse_dt(end_time_iso)
        except Exception as e:
            return f"ERROR: Invalid date format '{start_time_iso}' or '{end_time_iso}'. Please use format 'YYYY-MM-DDTHH:MM:SS'."
            
        try:
            from app.modules.cafes import service as cafe_service
            result = await cafe_service.schedule_staff_meeting(
                cafe_id=cafe_id,
                owner_user_id=user_id,
                summary=summary or "Staff Meeting",
                description=description or "",
                start_time=start_dt,
                end_time=end_dt,
                attendee_user_ids=attendee_user_ids,
                timezone=resolved_tz
            )
            return f"Meeting scheduled successfully! Link: {result.get('event_link')}"
        except Exception as e:
            return f"Failed to schedule meeting: {str(e)}"

    if role in ["SUPER_ADMIN", "CAFE_OWNER"]:
        tools = [get_my_cafes, search_cafes, get_cafe, get_branches_for_cafe, get_staff_list, schedule_meeting]
    return tools
