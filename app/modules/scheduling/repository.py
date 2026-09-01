from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from app.database import db

async def get_hourly_order_metrics(
    branch_id: Optional[int] = None,
    cafe_id: Optional[int] = None,
    days_history: int = 90
) -> Dict[str, Any]:
    """
    Pulls completed orders and computes 24-hour distribution bins,
    peak intensities, and day-of-week demand curves.
    """
    cutoff = datetime.utcnow() - timedelta(days=days_history)
    
    where_clause: Dict[str, Any] = {
        "status": "COMPLETED",
        "createdAt": {"gte": cutoff}
    }
    
    if branch_id:
        where_clause["branchId"] = branch_id
    elif cafe_id:
        # Get all branch IDs belonging to this cafe
        branches = await db.branch.find_many(where={"cafeId": cafe_id})
        branch_ids = [b.id for b in branches]
        if branch_ids:
            where_clause["branchId"] = {"in": branch_ids}
        else:
            return {"hourly_stats": [], "total_orders_analyzed": 0, "total_revenue": 0.0}

    orders = await db.order.find_many(
        where=where_clause,
        order={"createdAt": "desc"}
    )

    # Initialize 24-hour bins (0 to 23)
    hourly_counts = {h: 0 for h in range(24)}
    hourly_revenue = {h: 0.0 for h in range(24)}
    day_of_week_counts = {d: 0 for d in range(7)} # 0 = Monday, 6 = Sunday

    total_orders = len(orders)
    total_rev = 0.0

    for o in orders:
        created = o.createdAt
        hour = created.hour
        weekday = created.weekday()
        amount = float(o.totalAmount or 0.0)

        hourly_counts[hour] += 1
        hourly_revenue[hour] += amount
        day_of_week_counts[weekday] += 1
        total_rev += amount

    # Estimate active operating days in the sample
    active_days = max(1, min(days_history, 30))

    # Format hourly bins
    hourly_stats = []
    max_orders_in_hour = max(hourly_counts.values()) if hourly_counts else 1

    for h in range(24):
        cnt = hourly_counts[h]
        rev = hourly_revenue[h]
        avg_per_day = round(cnt / active_days, 1)
        peak_intensity = round((cnt / max_orders_in_hour) * 100.0, 1) if max_orders_in_hour > 0 else 0.0

        hourly_stats.append({
            "hour": h,
            "label": f"{h:02d}:00",
            "total_orders": cnt,
            "avg_orders_per_hr": avg_per_day,
            "hourly_revenue": round(rev, 2),
            "peak_intensity_score": peak_intensity
        })

    return {
        "hourly_stats": hourly_stats,
        "total_orders_analyzed": total_orders,
        "total_revenue": round(total_rev, 2),
        "active_days_sampled": active_days,
        "day_of_week_distribution": [
            {"day": "Mon", "orders": day_of_week_counts[0]},
            {"day": "Tue", "orders": day_of_week_counts[1]},
            {"day": "Wed", "orders": day_of_week_counts[2]},
            {"day": "Thu", "orders": day_of_week_counts[3]},
            {"day": "Fri", "orders": day_of_week_counts[4]},
            {"day": "Sat", "orders": day_of_week_counts[5]},
            {"day": "Sun", "orders": day_of_week_counts[6]},
        ]
    }


async def get_branch_staff_profiles(branch_id: int) -> List[Dict[str, Any]]:
    """
    Fetches staff members and branch managers assigned to the specified branch.
    """
    scopes = await db.userscope.find_many(
        where={"branchId": branch_id},
        include={"user": {"include": {"role": True}}}
    )

    staff_profiles = []
    for s in scopes:
        if s.user:
            staff_profiles.append({
                "id": s.user.id,
                "email": s.user.email,
                "display_name": getattr(s.user, "displayName", None) or s.user.email.split("@")[0].capitalize(),
                "role": s.user.role.name if s.user.role else "STAFF",
            })

    # If no specific scoped staff found, fetch all cafe staff as fallback
    if not staff_profiles:
        branch = await db.branch.find_unique(where={"id": branch_id})
        if branch and branch.cafeId:
            cafe_scopes = await db.userscope.find_many(
                where={"cafeId": branch.cafeId},
                include={"user": {"include": {"role": True}}}
            )
            for cs in cafe_scopes:
                if cs.user and not any(p["id"] == cs.user.id for p in staff_profiles):
                    staff_profiles.append({
                        "id": cs.user.id,
                        "email": cs.user.email,
                        "display_name": getattr(cs.user, "displayName", None) or cs.user.email.split("@")[0].capitalize(),
                        "role": cs.user.role.name if cs.user.role else "STAFF",
                    })

    return staff_profiles
