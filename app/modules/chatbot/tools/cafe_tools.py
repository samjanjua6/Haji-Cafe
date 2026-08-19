from app.database import db
from app.core.exceptions import UnauthorizedException
import difflib

def build_cafe_tools(current_user, authorized_cafes, _check_cafe_access):
    role = current_user.role.name
    user_id = current_user.id
    tools = []

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
            return "You don't own any cafes."
            
        return "Cafes:\n" + "\n".join([f"- ID: {c.id}, Name: {c.name}" for c in cafes])

    async def get_branches_for_cafe(cafe_id: int) -> str:
        """
        [SUPER_ADMIN, CAFE_OWNER] Get all branches for a specific cafe_id.
        """
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

    async def get_cafe(cafe_id: int) -> str:
        """
        [SUPER_ADMIN, CAFE_OWNER] Get details of a specific cafe.
        """
        try:
            await _check_cafe_access(cafe_id)
        except UnauthorizedException as e:
            return str(e)
            
        cafe = await db.cafe.find_unique(where={"id": cafe_id}, include={"owner": True})
        if not cafe:
            return f"Cafe {cafe_id} not found."
            
        owner_email = cafe.owner.email if cafe.owner else "None"
        return f"Cafe ID: {cafe.id}\nName: {cafe.name}\nOwner: {owner_email}\nCreated: {cafe.createdAt}"

    async def search_cafes(query: str) -> str:
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
            
        names = {c.name: c for c in cafes}
        matches = difflib.get_close_matches(query, names.keys(), n=3, cutoff=0.3)
        
        if not matches:
            return f"No cafes found matching '{query}'"
            
        matched_cafes = [names[m] for m in matches]
        return f"Search results for '{query}':\n" + "\n".join([f"- ID: {c.id}, Name: {c.name}" for c in matched_cafes])

    async def get_staff_list(cafe_id: int) -> str:
        """
        [CAFE_OWNER] Get a list of all staff members for a specific cafe. 
        Returns their User IDs, Emails, and Roles.
        """
        if role == "SUPER_ADMIN":
            return "Error: Super Admins cannot view staff lists directly. Please log in as a Cafe Owner to manage cafe staff."
        if cafe_id is None or cafe_id == 0:
            return "ERROR: A valid integer cafe_id is required. Use get_my_cafes first to find your cafe ID."
        try:
            await _check_cafe_access(cafe_id)
        except UnauthorizedException as e:
            return str(e)

        from app.modules.cafes import service as cafe_service
        staff = await cafe_service.get_cafe_staff(cafe_id)
        if not staff:
            return f"No staff found for cafe {cafe_id}."

        res = f"Staff for Cafe {cafe_id}:\n"
        for s in staff:
            role_name = s.role.name if s.role else 'Unknown'
            res += f"- User ID: {s.id} | Email: {s.email} | Role: {role_name}\n"
        return res

    async def schedule_meeting(
        start_time_iso: str, 
        end_time_iso: str, 
        timezone: str,
        cafe_id: int = 0, 
        summary: str = "Staff Meeting", 
        description: str = "", 
        attendee_user_ids: list[int] = None
    ) -> str:
        """
        [SUPER_ADMIN, CAFE_OWNER] Schedule a Google Calendar meeting with staff.
        - start_time_iso & end_time_iso MUST be naive ISO 8601 strings (e.g. 2026-08-15T10:00:00) without 'Z'.
        - timezone MUST be the exact timezone string provided in your system prompt (e.g. 'Asia/Karachi').
        - attendee_user_ids MUST be a JSON array of integer User IDs (e.g. [2, 4, 5]).
          Use get_staff_list first to find the correct User IDs.
        """
        if cafe_id == 0:
            return "ERROR: You must provide a valid cafe_id."
            
        if not attendee_user_ids:
            return "ERROR: You cannot schedule a meeting without valid attendees. You MUST ask the user which staff members they want to invite, and then use get_staff_list to find their integer IDs. Do NOT guess IDs and do NOT say the meeting was scheduled."
            
        try:
            await _check_cafe_access(cafe_id)
        except UnauthorizedException as e:
            return str(e)
            
        try:
            import re
            from datetime import datetime
            def _strip_tz(s: str) -> str:
                s = s.strip().replace(" ", "T")
                s = re.sub(r'Z$', '', s)
                s = re.sub(r'[+-]\d{2}:\d{2}$', '', s)
                return s
            start_dt = datetime.fromisoformat(_strip_tz(start_time_iso))
            end_dt = datetime.fromisoformat(_strip_tz(end_time_iso))
        except Exception as e:
            return f"ERROR: Invalid date format '{start_time_iso}' or '{end_time_iso}'. You MUST use EXACTLY 'YYYY-MM-DDTHH:MM:SS'. FIX THIS IMMEDIATELY and call the tool again. Do NOT ask the user for confirmation."
            
        try:
            from app.modules.cafes import service as cafe_service
            result = await cafe_service.schedule_staff_meeting(
                cafe_id=cafe_id,
                owner_user_id=user_id,
                summary=summary,
                description=description,
                start_time=start_dt,
                end_time=end_dt,
                attendee_user_ids=attendee_user_ids,
                timezone=timezone
            )
            return f"Meeting scheduled successfully! Link: {result.get('event_link')}"
        except Exception as e:
            return f"Failed to schedule meeting: {str(e)}"

    if role in ["SUPER_ADMIN", "CAFE_OWNER"]:
        tools = [get_my_cafes, search_cafes, get_cafe, get_branches_for_cafe, get_staff_list, schedule_meeting]
    return tools
