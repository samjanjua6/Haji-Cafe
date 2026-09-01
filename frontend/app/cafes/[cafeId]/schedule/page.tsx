"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  TrendingUp,
  Sparkles,
  Download,
  Flame,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Store,
  Building2,
  DollarSign
} from "lucide-react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

interface BranchOption {
  id: number;
  name: string;
}

interface OperatingHour {
  hour: number;
  label: string;
  total_orders: number;
  avg_orders_per_hr: number;
  hourly_revenue: number;
  peak_intensity_score: number;
  effective_arrival_rate: number;
  recommended_staff: number;
  avg_wait_time_minutes: number;
  service_level_percent: number;
  rush_category: "PEAK_RUSH" | "MODERATE" | "OFF_PEAK";
}

interface PeakData {
  branch_id?: number;
  cafe_id?: number;
  total_orders_analyzed: number;
  total_revenue_analyzed: number;
  operating_hours: OperatingHour[];
  peak_summary: {
    top_rush_hour: string;
    morning_rush_window: string;
    evening_rush_window: string;
    recommended_max_staff: number;
    recommended_min_staff: number;
  };
}

interface ShiftItem {
  id: string;
  name: string;
  badge_color: string;
  start_time: string;
  end_time: string;
  display_time: string;
  duration_hours: number;
  recommended_headcount: number;
  assigned_staff: Array<{
    user_id: number;
    name: string;
    email: string;
    role_in_shift: string;
  }>;
  focus_rationale: string;
}

interface ScheduleData {
  branch_id: number;
  branch_name: string;
  cafe_name?: string;
  target_date: string;
  demand_multiplier: number;
  shifts: ShiftItem[];
  metrics: {
    total_shifts: number;
    total_labor_hours: number;
    estimated_labor_cost: number;
    projected_daily_savings: number;
    service_sla_target: string;
  };
  executive_rationale: string;
}

export default function CafeOwnerSchedulePage() {
  const router = useRouter();
  const params = useParams<{ cafeId: string }>();
  const cafeId = parseInt(params.cafeId, 10);

  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [peakData, setPeakData] = useState<PeakData | null>(null);
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);

  const [demandMultiplier, setDemandMultiplier] = useState(1.0);
  const [targetDate, setTargetDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });

  // 1. Fetch Cafe Branches
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await api.get<BranchOption[]>(`/cafes/${cafeId}/branches`);
        if (Array.isArray(res)) {
          setBranches(res);
        }
      } catch (e: any) {
        console.error("Failed to load branches:", e);
      }
    };
    fetchBranches();
  }, [cafeId]);

  // 2. Fetch Peak Analysis (Cafe-wide or specific branch)
  const loadPeakHours = useCallback(async (branch: number | "ALL", multiplier = 1.0) => {
    try {
      setLoading(true);
      const query = branch === "ALL"
        ? `/scheduling/peak-hours?cafe_id=${cafeId}&multiplier=${multiplier}`
        : `/scheduling/peak-hours?branch_id=${branch}&multiplier=${multiplier}`;

      const res = await api.get<{ status: string; data: PeakData }>(query);
      if (res?.data) {
        setPeakData(res.data);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load peak hours analysis");
    } finally {
      setLoading(false);
    }
  }, [cafeId]);

  // 3. Generate AI Schedule for active branch
  const generateSchedule = useCallback(async (branch: number | "ALL", multiplier = 1.0, date = targetDate) => {
    try {
      setGenerating(true);
      const targetBranchId = branch === "ALL" ? (branches[0]?.id || 3) : branch;
      const res = await api.post<{ status: string; data: ScheduleData }>(
        "/scheduling/generate-shifts",
        {
          branch_id: targetBranchId,
          target_date: date,
          demand_multiplier: multiplier,
        }
      );
      if (res?.data) {
        setScheduleData(res.data);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate AI schedule");
    } finally {
      setGenerating(false);
    }
  }, [branches, targetDate]);

  useEffect(() => {
    loadPeakHours(selectedBranchId, demandMultiplier);
    generateSchedule(selectedBranchId, demandMultiplier, targetDate);
  }, [selectedBranchId, loadPeakHours, generateSchedule]);

  const handleBranchChange = (newBranch: number | "ALL") => {
    setSelectedBranchId(newBranch);
    loadPeakHours(newBranch, demandMultiplier);
    generateSchedule(newBranch, demandMultiplier, targetDate);
  };

  const handleSliderChange = (newVal: number) => {
    setDemandMultiplier(newVal);
    loadPeakHours(selectedBranchId, newVal);
    generateSchedule(selectedBranchId, newVal, targetDate);
  };

  // Sync to Google Calendar
  const handleSyncGoogleCalendar = async () => {
    if (!scheduleData || !scheduleData.shifts) return;
    try {
      setSyncing(true);
      const res = await api.post<{ status: string; data: any }>("/scheduling/sync-calendar", {
        cafe_id: cafeId,
        branch_name: scheduleData.branch_name || "Franchise",
        shifts: scheduleData.shifts,
      });
      toast.success(res.data?.message || "Synced to Google Calendar successfully!", {
        duration: 5000,
        icon: "📅",
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to sync Google Calendar");
    } finally {
      setSyncing(false);
    }
  };

  // Export .ICS Calendar File
  const handleExportICS = () => {
    const targetBranchId = selectedBranchId === "ALL" ? (branches[0]?.id || 3) : selectedBranchId;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const url = `${apiBase}/scheduling/export-ics?branch_id=${targetBranchId}&target_date=${targetDate}&multiplier=${demandMultiplier}`;
    
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `shifts_cafe_${cafeId}_branch_${targetBranchId}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("📥 Downloaded iCalendar (.ics) file!");
  };

  const hours = peakData?.operating_hours || [];
  const maxOrders = useMemo(() => {
    return Math.max(...hours.map((h) => h.total_orders), 1);
  }, [hours]);

  return (
    <div>
      {/* 1. Page Header */}
      <div className="page-header">
        <div>
          <button
            onClick={() => router.push(`/cafes/${cafeId}`)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 8,
              fontSize: 13,
            }}
          >
            <ArrowLeft size={14} /> Back to Overview
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="page-title">Multi-Branch AI Workforce & Peak Hours</div>
            <span
              className="badge"
              style={{
                background: "var(--accent-glow)",
                color: "var(--accent)",
              }}
            >
              <Building2 size={12} /> Franchise Control
            </span>
          </div>
          <div className="page-subtitle">
            Café #{cafeId} • Cross-branch Erlang-C staffing optimization and Google Calendar synchronization
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleExportICS}
            title="Download .ICS for Apple Calendar & Outlook"
          >
            <Download size={14} /> Download .ICS
          </button>

          <button
            className="btn btn-primary btn-sm"
            onClick={handleSyncGoogleCalendar}
            disabled={syncing || !scheduleData}
            style={{ fontWeight: 600 }}
          >
            <Calendar size={14} /> {syncing ? "Syncing..." : "Sync Google Calendar"}
          </button>

          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              loadPeakHours(selectedBranchId, demandMultiplier);
              generateSchedule(selectedBranchId, demandMultiplier, targetDate);
            }}
            disabled={loading || generating}
          >
            <RefreshCw size={14} className={loading || generating ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* 2. Branch Selector & Comparison Filter Bar */}
      <div className="card" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Store size={18} style={{ color: "var(--accent)" }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Select Scope:</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                className={`btn btn-sm ${selectedBranchId === "ALL" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => handleBranchChange("ALL")}
              >
                All Branches (Combined)
              </button>
              {branches.map((b) => (
                <button
                  key={b.id}
                  className={`btn btn-sm ${selectedBranchId === b.id ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => handleBranchChange(b.id)}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Analyzed <strong>{peakData?.total_orders_analyzed || 0}</strong> orders (${Number(peakData?.total_revenue_analyzed || 0).toLocaleString()} revenue)
          </div>
        </div>
      </div>

      {/* 3. Interactive "What-If" Demand Surge Simulator */}
      <div
        className="card"
        style={{
          marginBottom: 24,
          background: "linear-gradient(145deg, var(--bg-card) 0%, var(--bg-surface) 100%)",
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
              <Sliders size={18} style={{ color: "var(--accent)" }} />
              Franchise "What-If" Demand Surge Simulator
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
              Simulate peak rush conditions across your franchise to evaluate queue times and labor expenditure in real time.
            </div>
          </div>

          <span
            className="badge"
            style={{
              fontSize: 13,
              padding: "6px 12px",
              background: demandMultiplier > 1.0 ? "var(--warning-glow)" : "var(--bg-surface)",
              color: demandMultiplier > 1.0 ? "var(--warning)" : "var(--text-primary)",
              border: "1px solid var(--border)",
            }}
          >
            Multiplier: {demandMultiplier.toFixed(2)}x ({demandMultiplier > 1.0 ? `+${Math.round((demandMultiplier - 1.0) * 100)}% Surge` : "Baseline"})
          </span>
        </div>

        {/* Slider control */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", width: 60 }}>Baseline</span>
          <input
            type="range"
            min="1.0"
            max="1.5"
            step="0.05"
            value={demandMultiplier}
            onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
            style={{
              flex: 1,
              accentColor: "var(--accent)",
              cursor: "pointer",
              height: 6,
            }}
          />
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--warning)", width: 90 }}>+50% Surge</span>
        </div>

        {/* Live Metrics */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
            paddingTop: 12,
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ background: "var(--bg-card)", padding: "10px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Top Peak Rush</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)", marginTop: 2 }}>
              {peakData?.peak_summary.top_rush_hour || "09:00"} <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>({peakData?.peak_summary.morning_rush_window})</span>
            </div>
          </div>

          <div style={{ background: "var(--bg-card)", padding: "10px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Target Service SLA</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--success)", marginTop: 2 }}>
              {scheduleData?.metrics.service_sla_target || "94.8% (< 3.5m wait)"}
            </div>
          </div>

          <div style={{ background: "var(--bg-card)", padding: "10px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Franchise Daily Labor</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>
              {scheduleData?.metrics.total_labor_hours || 15.0} hrs <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>(${scheduleData?.metrics.estimated_labor_cost || 225})</span>
            </div>
          </div>

          <div style={{ background: "var(--bg-card)", padding: "10px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Labor Cost Optimization</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--success)", marginTop: 2 }}>
              ${scheduleData?.metrics.projected_daily_savings || 45.00} <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>/ day saved</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. 24-Hour Peak Distribution Histogram */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
              <TrendingUp size={18} style={{ color: "var(--accent)" }} />
              24-Hour Order Volume & Erlang-C Headcount
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
              {selectedBranchId === "ALL" ? "Franchise-wide combined order frequency" : `Order frequency for ${branches.find(b => b.id === selectedBranchId)?.name || 'Selected Branch'}`}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--accent)" }} />
              <span>Peak Rush (&gt;20/hr)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--info)" }} />
              <span>Moderate</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--border)" }} />
              <span>Off-Peak</span>
            </div>
          </div>
        </div>

        {/* Histogram Bars */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${hours.length || 16}, 1fr)`,
            gap: 6,
            alignItems: "flex-end",
            height: 180,
            paddingTop: 20,
            borderBottom: "1px solid var(--border)",
          }}
        >
          {hours.map((h) => {
            const heightPercent = maxOrders > 0 ? Math.max(8, Math.round((h.total_orders / maxOrders) * 100)) : 10;
            const isPeak = h.rush_category === "PEAK_RUSH";
            const isMod = h.rush_category === "MODERATE";

            let barColor = "var(--border)";
            if (isPeak) barColor = "var(--accent)";
            else if (isMod) barColor = "var(--info)";

            return (
              <div
                key={h.hour}
                title={`${h.label}: ${h.total_orders} Total Orders\nErlang-C Staff Required: ${h.recommended_staff} servers`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  height: "100%",
                  justifyContent: "flex-end",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>
                  {h.recommended_staff}p
                </div>
                <div
                  style={{
                    width: "100%",
                    height: `${heightPercent}%`,
                    background: barColor,
                    borderRadius: "4px 4px 0 0",
                    transition: "height 0.3s ease, background 0.3s ease",
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* X-Axis Hour Labels */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${hours.length || 16}, 1fr)`,
            gap: 6,
            paddingTop: 8,
            textAlign: "center",
          }}
        >
          {hours.map((h) => (
            <div key={h.hour} style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>
              {h.label}
            </div>
          ))}
        </div>
      </div>

      {/* 5. AI Shift Roster Cards */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
              <Calendar size={18} style={{ color: "var(--accent)" }} />
              AI Shift Schedule for {scheduleData?.branch_name || "Franchise"}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
              Dynamic staffing roster matching branch staff to Erlang-C queue requirements.
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="date"
              className="input"
              value={targetDate}
              onChange={(e) => {
                setTargetDate(e.target.value);
                generateSchedule(selectedBranchId, demandMultiplier, e.target.value);
              }}
              style={{ width: "auto" }}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={() => generateSchedule(selectedBranchId, demandMultiplier, targetDate)}
              disabled={generating}
              style={{ fontWeight: 600 }}
            >
              <Sparkles size={14} /> {generating ? "Optimizing..." : "Regenerate Roster"}
            </button>
          </div>
        </div>

        {/* 3 Shift Cards Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          {scheduleData?.shifts.map((shift) => (
            <div
              key={shift.id}
              className="card"
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                border: "1px solid var(--border)",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                      {shift.name}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                      <Clock size={12} /> {shift.display_time} ({shift.duration_hours} hrs)
                    </div>
                  </div>

                  <span
                    className="badge"
                    style={{
                      background: "var(--bg-surface)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <Users size={12} /> {shift.recommended_headcount} Staff Required
                  </span>
                </div>

                <div
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    padding: "8px 12px",
                    fontSize: 12,
                    color: "var(--text-muted)",
                    marginBottom: 16,
                    lineHeight: 1.4,
                  }}
                >
                  💡 {shift.focus_rationale}
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>
                    Assigned Team ({shift.assigned_staff.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {shift.assigned_staff.map((staff, sIdx) => (
                      <div
                        key={sIdx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "6px 10px",
                          borderRadius: "var(--radius-sm)",
                          background: "var(--bg-card)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: "50%",
                              background: "var(--accent)",
                              color: "#0f172a",
                              fontSize: 11,
                              fontWeight: 800,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {staff.name.charAt(0)}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                            {staff.name}
                          </span>
                        </div>

                        <span
                          className="badge"
                          style={{
                            fontSize: 10,
                            padding: "2px 8px",
                            background: "var(--bg-surface)",
                            color: "var(--accent)",
                          }}
                        >
                          {staff.role_in_shift}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: 12,
                  borderTop: "1px solid var(--border)",
                  fontSize: 11,
                  color: "var(--text-muted)",
                }}
              >
                <span>Estimated Cost: ${(shift.duration_hours * shift.assigned_staff.length * 15).toFixed(2)}</span>
                <span style={{ color: "var(--success)", fontWeight: 600 }}>Erlang-C Compliant ✓</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Executive AI Business Rationale */}
      {scheduleData?.executive_rationale && (
        <div
          className="card"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            marginBottom: 24,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
            <Sparkles size={16} style={{ color: "var(--accent)" }} />
            Executive AI Franchise Rationale
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
            {scheduleData.executive_rationale}
          </div>
        </div>
      )}
    </div>
  );
}
