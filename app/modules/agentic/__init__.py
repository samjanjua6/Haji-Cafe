"""
Agentic Autonomous Decision Engine for Haji Cafe Management System.
Monitors low-stock thresholds, sales dip anomalies, and stale menu items,
generating actionable drafts and 1-click execution approvals.
"""
from .router import router

__all__ = ["router"]
