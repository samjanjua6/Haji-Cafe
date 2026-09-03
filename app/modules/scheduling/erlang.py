import math
from typing import Dict, Any

def erlang_c_wait_probability(traffic_intensity: float, servers: int) -> float:
    """
    Calculate Erlang-C formula for probability of queuing/waiting P(Wait > 0).
    traffic_intensity (A) = arrival_rate / service_rate
    servers (m) = number of staff/servers
    """
    A = traffic_intensity
    m = servers

    if m <= A:
        return 1.0  # System overloaded, 100% queueing

    # Sum_{k=0}^{m-1} A^k / k!
    sum_terms = sum((A ** k) / math.factorial(k) for k in range(m))
    
    # (A^m / m!) * (m / (m - A))
    last_term = ((A ** m) / math.factorial(m)) * (m / (m - A))
    
    erlang_c = last_term / (sum_terms + last_term)
    return max(0.0, min(1.0, erlang_c))


def calculate_staffing_requirements(
    arrival_rate_orders_per_hr: float,
    avg_prep_time_minutes: float = 3.0,
    target_wait_minutes: float = 3.0,
    target_sla_percent: float = 90.0,
    hourly_labor_rate: float = 15.0
) -> Dict[str, Any]:
    """
    Erlang-C based staffing optimization engine.
    Calculates minimum staff (servers) needed to keep customer wait time below target_wait_minutes
    with at least target_sla_percent probability.
    """
    if arrival_rate_orders_per_hr <= 0:
        return {
            "recommended_staff": 1,
            "traffic_intensity": 0.0,
            "wait_probability_percent": 0.0,
            "avg_wait_time_minutes": 0.0,
            "service_level_percent": 100.0,
            "hourly_labor_cost": hourly_labor_rate,
            "rush_category": "OFF_PEAK"
        }

    # Service rate per server per hour: mu = 60 / avg_prep_time_minutes
    mu = 60.0 / avg_prep_time_minutes
    # Offered traffic A = lambda / mu
    A = arrival_rate_orders_per_hr / mu

    # Minimum servers must strictly exceed traffic intensity A
    min_servers = max(1, math.ceil(A + 0.001))
    
    best_staff = min_servers
    best_wait_prob = 1.0
    best_avg_wait = 999.0
    best_sla = 0.0

    # Search for optimal staff count (capped at 12 for coffee shop scale)
    for m in range(min_servers, min_servers + 8):
        pw = erlang_c_wait_probability(A, m)
        # Average wait in queue: Wq = Pw / (m*mu - lambda) in hours -> convert to minutes
        capacity_rate = (m * mu) - arrival_rate_orders_per_hr
        if capacity_rate > 0:
            avg_wait_min = (pw / capacity_rate) * 60.0
            # P(Wait <= target_wait_minutes) = 1 - Pw * exp(-capacity_rate * (target_wait_minutes/60))
            sla = (1.0 - (pw * math.exp(-capacity_rate * (target_wait_minutes / 60.0)))) * 100.0
        else:
            avg_wait_min = 999.0
            sla = 0.0

        if sla >= target_sla_percent or m == min_servers + 7:
            best_staff = m
            best_wait_prob = pw * 100.0
            best_avg_wait = avg_wait_min
            best_sla = sla
            break

    # Determine rush category
    if arrival_rate_orders_per_hr >= 20.0:
        rush_category = "PEAK_RUSH"
    elif arrival_rate_orders_per_hr >= 10.0:
        rush_category = "MODERATE"
    else:
        rush_category = "OFF_PEAK"

    return {
        "recommended_staff": best_staff,
        "traffic_intensity": round(A, 2),
        "wait_probability_percent": round(best_wait_prob, 1),
        "avg_wait_time_minutes": round(best_avg_wait, 2),
        "service_level_percent": round(min(100.0, best_sla), 1),
        "hourly_labor_cost": round(best_staff * hourly_labor_rate, 2),
        "rush_category": rush_category
    }
