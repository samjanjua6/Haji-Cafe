import pytest
from app.modules.scheduling.erlang import erlang_c_wait_probability, calculate_staffing_requirements
from app.modules.scheduling.service import generate_ics_calendar_file
from app.modules.scheduling.router import verify_scheduling_access
from app.core.exceptions import ForbiddenException


def test_erlang_c_math():
    """Verify Erlang-C queueing calculation outputs valid probabilities and headcounts."""
    # Test low traffic (5 orders/hr) -> 1 or 2 staff
    low_res = calculate_staffing_requirements(arrival_rate_orders_per_hr=5.0)
    assert low_res["recommended_staff"] >= 1
    assert low_res["rush_category"] == "OFF_PEAK"
    assert low_res["service_level_percent"] >= 90.0

    # Test peak rush (30 orders/hr) -> requires 3+ staff to achieve <3.5m SLA
    peak_res = calculate_staffing_requirements(arrival_rate_orders_per_hr=30.0)
    assert peak_res["recommended_staff"] >= 3
    assert peak_res["rush_category"] == "PEAK_RUSH"
    assert peak_res["service_level_percent"] >= 90.0

    # Test zero traffic
    zero_res = calculate_staffing_requirements(arrival_rate_orders_per_hr=0.0)
    assert zero_res["recommended_staff"] == 1
    assert zero_res["avg_wait_time_minutes"] == 0.0


def test_rbac_scoping_rules():
    """Verify Branch Manager is strictly forbidden from other branches, while Cafe Owner has access."""
    class MockRole:
        def __init__(self, name):
            self.name = name

    class MockScope:
        def __init__(self, cafe_id=None, branch_id=None):
            self.cafeId = cafe_id
            self.branchId = branch_id

    class MockUser:
        def __init__(self, role_name, scopes):
            self.id = 99
            self.role = MockRole(role_name)
            self.userScopes = scopes

    # 1. Branch Manager for Branch #3
    branch_manager = MockUser("BRANCH_MANAGER", [MockScope(cafe_id=1, branch_id=3)])
    
    # Can access own branch #3
    verify_scheduling_access(branch_manager, branch_id=3)

    # CANNOT access branch #4 -> Must raise ForbiddenException
    with pytest.raises(ForbiddenException):
        verify_scheduling_access(branch_manager, branch_id=4)

    # CANNOT access cafe-wide aggregate without branch_id -> Must raise ForbiddenException
    with pytest.raises(ForbiddenException):
        verify_scheduling_access(branch_manager, cafe_id=1)

    # 2. Cafe Owner for Cafe #1
    cafe_owner = MockUser("CAFE_OWNER", [MockScope(cafe_id=1, branch_id=None)])
    
    # Can access own cafe #1
    verify_scheduling_access(cafe_owner, cafe_id=1)

    # CANNOT access other cafe #2
    with pytest.raises(ForbiddenException):
        verify_scheduling_access(cafe_owner, cafe_id=2)


def test_ics_export_format():
    """Verify RFC 5545 iCalendar string generation."""
    sample_shifts = [
        {
            "id": "shift-1",
            "name": "Opening & Morning Rush",
            "start_time": "2026-09-02T07:30:00",
            "end_time": "2026-09-02T12:30:00",
            "display_time": "07:30 AM – 12:30 PM",
            "assigned_staff": [{"name": "Ali Khan", "role_in_shift": "Head Barista"}],
            "focus_rationale": "Morning coffee rush."
        }
    ]

    ics_content = generate_ics_calendar_file("Downtown HQ", sample_shifts)
    assert "BEGIN:VCALENDAR" in ics_content
    assert "VERSION:2.0" in ics_content
    assert "BEGIN:VEVENT" in ics_content
    assert "[Haji Cafe] Opening & Morning Rush - Downtown HQ" in ics_content
    assert "Ali Khan" in ics_content
    assert "END:VCALENDAR" in ics_content
