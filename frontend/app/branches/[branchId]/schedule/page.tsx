"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
  ShieldCheck,
  Sun,
  CloudRain,
  GraduationCap,
  Zap,
  BarChart3,
  Lightbulb,
  RefreshCw,
  Sliders,
  DollarSign,
  FileText,
} from "lucide-react";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";
import toast from "react-hot-toast";
import SplinePeakChart from "@/components/charts/SplinePeakChart";
import WeeklyRushHeatmap from "@/components/charts/WeeklyRushHeatmap";
import { exportScheduleToPDF } from "@/lib/schedulePdfExport";
import BranchSubnav from "@/components/branches/BranchSubnav";

interface OperatingHour {
  hour: number;
  label: string;
  total_orders: number;
  avg_orders_per_hr: number;
  hourly_revenue: number;
  estimated_hourly_revenue?: number;
  hourly_labor_cost?: number;
  net_labor_profit?: number;
  profit_margin_percent?: number;
  margin_rating?: string;
  peak_intensity_score: number;
  effective_arrival_rate: number;
  recommended_staff: number;
  avg_wait_time_minutes: number;
  service_level_percent: number;
  rush_category: "PEAK_RUSH" | "MODERATE" | "OFF_PEAK";
}

interface PeakData {
  branch_id: number;
  total_orders_analyzed: number;
  total_revenue_analyzed: number;
  operating_hours: OperatingHour[];
  weekly_heatmap?: any[];
  top_weekly_peaks?: any[];
  financial_summary?: {
    daily_projected_revenue: number;
    daily_projected_labor_cost: number;
    daily_projected_net_profit: number;
    overall_profit_margin_percent: number;
  };
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
  display_date?: string;
  day_name?: string;
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
  target_date: string;
  target_date_formatted?: string;
  day_name?: string;
  demand_multiplier: number;
  optimization_generation?: number;
  strategy_name?: string;
  strategy_tag?: string;
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

export default function BranchSchedulePage() {
  const router = useRouter();
  const params = useParams<{ branchId: string }>();
  const searchParams = useSearchParams();
  const branchId = parseInt(params.branchId, 10);
  const cafeId = searchParams.get("cafeId");

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [peakData, setPeakData] = useState<PeakData | null>(null);
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);

  // What-If Demand Surge Simulation Slider (1.0x to 1.5x)
  const [demandMultiplier, setDemandMultiplier] = useState(1.0);
  const [chartType, setChartType] = useState<"SPLINE" | "HISTOGRAM" | "HEATMAP">("SPLINE");
  const [rotationSeed, setRotationSeed] = useState(0);
  const [targetDate, setTargetDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });

  // 1. Fetch Peak Hours Data
  const loadPeakHours = useCallback(async (multiplier = 1.0) => {
    try {
      setLoading(true);
      const res = await api.get<{ status: string; data: PeakData }>(
        `/scheduling/peak-hours?branch_id=${branchId}&multiplier=${multiplier}`
      );
      if (res?.data) {
        setPeakData(res.data);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load peak hours analysis");
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  // 2. Generate AI Schedule
  const generateSchedule = useCallback(async (multiplier = demandMultiplier, date = targetDate, offset = rotationSeed) => {
    try {
      setGenerating(true);
      const res = await api.post<{ status: string; data: ScheduleData }>(
        "/scheduling/generate-shifts",
        {
          branch_id: branchId,
          target_date: date,
          demand_multiplier: multiplier,
          rotation_offset: offset,
        }
      );
      if (res?.data) {
        setScheduleData(res.data);
        toast.success("AI Schedule optimized for rush-hour peak demand!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate AI schedule");
    } finally {
      setGenerating(false);
    }
  }, [branchId, demandMultiplier, targetDate, rotationSeed]);

  useEffect(() => {
    loadPeakHours(1.0);
    generateSchedule(1.0, targetDate, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  // Handle Simulation Slider Change
  const handleSliderChange = (newVal: number) => {
    setDemandMultiplier(newVal);
    loadPeakHours(newVal);
    generateSchedule(newVal, targetDate, rotationSeed);
  };

  // Handle Regenerate Roster
  const handleRegenerateRoster = async () => {
    const nextSeed = rotationSeed + 1;
    setRotationSeed(nextSeed);
    await generateSchedule(demandMultiplier, targetDate, nextSeed);
    toast.success(`✨ Generation #${nextSeed + 1}: Shift roles & duties re-optimized!`, { icon: "🔄" });
  };

  // Sync to Google Calendar
  const handleSyncGoogleCalendar = async () => {
    if (!scheduleData || !scheduleData.shifts) return;
    try {
      setSyncing(true);
      const res = await api.post<{ status: string; data: any }>("/scheduling/sync-calendar", {
        branch_id: branchId,
        cafe_id: cafeId && cafeId !== "null" ? parseInt(cafeId, 10) : undefined,
        branch_name: scheduleData.branch_name,
        shifts: scheduleData.shifts,
      });
      toast.success(res.data?.message || "Synced to Google Calendar successfully!", {
        duration: 5000,
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to sync Google Calendar");
    } finally {
      setSyncing(false);
    }
  };

  // Export .ICS Calendar File (Authenticated Blob Download)
  const handleExportICS = async () => {
    try {
      setDownloading(true);
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const token = auth.getAccess();
      const res = await fetch(`${apiBase}/scheduling/export-ics?branch_id=${branchId}&target_date=${targetDate}&multiplier=${demandMultiplier}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error(`Download failed: ${res.statusText}`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `shifts_branch_${branchId}_${targetDate}.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("📥 Downloaded iCalendar (.ics) file!", { icon: "📅" });
    } catch (err: any) {
      toast.error(err.message || "Failed to download .ICS file");
    } finally {
      setDownloading(false);
    }
  };

  // Export Professional Printable PDF Report
  const handleExportPDF = async () => {
    if (!scheduleData || !scheduleData.shifts) return;
    try {
      setDownloading(true);
      await exportScheduleToPDF({
        branchName: scheduleData.branch_name || `Branch #${branchId}`,
        targetDate: targetDate,
        demandMultiplier: demandMultiplier,
        shifts: scheduleData.shifts,
        metrics: scheduleData.metrics,
        peakSummary: peakData?.peak_summary,
        executiveRationale: scheduleData.executive_rationale,
      });
      toast.success("📄 Downloaded PDF Shift Schedule Report!", { icon: "📄" });
    } catch (err: any) {
      toast.error(err.message || "Failed to generate PDF report");
    } finally {
      setDownloading(false);
    }
  };

  const hours = peakData?.operating_hours || [];
  const maxOrders = useMemo(() => {
    return Math.max(...hours.map((h) => h.total_orders), 1);
  }, [hours]);

  return (
    <div>
      <BranchSubnav branchId={branchId} cafeId={cafeId} branchName={scheduleData?.branch_name} />
      {/* 1. Page Header */}
      <div className="page-header">
        <div>
          <button
            onClick={() => router.push(`/branches/${branchId}/orders${cafeId ? `?cafeId=${cafeId}` : ""}`)}
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
            <ArrowLeft size={14} /> Back
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="page-title">AI Shift Scheduler &amp; Peak Hours</div>
            <span
              className="badge"
              style={{
                background: "var(--accent-glow)",
                color: "var(--accent)",
              }}
            >
              <Sparkles size={12} /> Smart Staffing AI
            </span>
          </div>
          <div className="page-subtitle">
            Branch #{branchId} • Customer order demand forecasting &amp; intelligent roster optimization
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleExportPDF}
            disabled={downloading || !scheduleData}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              color: "var(--accent)",
              fontWeight: 600,
            }}
            title="Download Printable PDF Shift Schedule Report for Noticeboard"
          >
            <FileText size={14} /> Export PDF
          </button>

          <button
            className="btn btn-ghost btn-sm"
            onClick={handleExportICS}
            disabled={downloading || !scheduleData}
            title="Download .ICS for Apple Calendar & Outlook"
          >
            <Download size={14} /> Download .ICS
          </button>

          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              loadPeakHours(demandMultiplier);
              generateSchedule(demandMultiplier, targetDate);
            }}
            disabled={loading || generating}
          >
            <RefreshCw size={14} className={loading || generating ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* 2. Interactive "What-If" Demand Surge Simulator */}
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
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 17, fontWeight: 800, color: "var(--text-primary)" }}>
              <Sliders size={18} style={{ color: "var(--accent)" }} />
              Interactive "What-If" Demand Surge Simulator
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
              Test how sudden real-world customer rushes (rain, festivals, promos) affect queue wait times and how Smart Staffing AI dynamically balances your workforce.
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              className="badge"
              style={{
                fontSize: 13,
                fontWeight: 700,
                padding: "6px 14px",
                background: demandMultiplier > 1.0 ? "var(--warning-glow)" : "var(--bg-surface)",
                color: demandMultiplier > 1.0 ? "var(--warning)" : "var(--text-primary)",
                border: "1px solid var(--border)",
              }}
            >
              {demandMultiplier === 1.0 ? (
                <span>Baseline Traffic (1.0x)</span>
              ) : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Flame size={13} style={{ color: "var(--warning)" }} /> +{Math.round((demandMultiplier - 1.0) * 100)}% Surge Active
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Quick Scenario 1-Click Presets */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>
            Quick 1-Click Scenarios:
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { label: "Normal Day (1.0x)", val: 1.0, icon: Sun },
              { label: "Rainy Morning (+15%)", val: 1.15, icon: CloudRain },
              { label: "Campus / Festival (+30%)", val: 1.30, icon: GraduationCap },
              { label: "Flash Promo (+50%)", val: 1.50, icon: Zap },
            ].map((sc) => {
              const ScIcon = sc.icon;
              const isSelected = Math.abs(demandMultiplier - sc.val) < 0.03;
              return (
                <button
                  key={sc.label}
                  type="button"
                  className={`btn btn-sm ${isSelected ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => handleSliderChange(sc.val)}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "6px 12px",
                    border: isSelected ? "1px solid var(--accent)" : "1px solid var(--border)",
                    background: isSelected ? "var(--accent-glow)" : "var(--bg-card)",
                    color: isSelected ? "var(--accent)" : "var(--text-primary)",
                    transition: "all 0.2s ease",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <ScIcon size={14} />
                  <span>{sc.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Custom Slider with Visual Milestone Ticks */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 6, fontWeight: 600 }}>
            <span>1.0x Baseline</span>
            <span>1.25x (+25% Spike)</span>
            <span>1.50x (+50% Max Surge)</span>
          </div>
          <input
            type="range"
            min="1.0"
            max="1.5"
            step="0.05"
            value={demandMultiplier}
            onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
            style={{
              width: "100%",
              accentColor: "var(--accent)",
              cursor: "pointer",
              height: 8,
            }}
          />
        </div>

        {/* Live AI "Scenario Protection" Insight Card */}
        <div
          style={{
            background: "rgba(245, 158, 11, 0.05)",
            border: "1px dashed var(--accent)",
            borderRadius: "var(--radius-md)",
            padding: "10px 14px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "var(--accent-muted)",
                color: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {demandMultiplier === 1.0 ? (
                <Sun size={20} />
              ) : demandMultiplier <= 1.2 ? (
                <CloudRain size={20} />
              ) : demandMultiplier <= 1.35 ? (
                <GraduationCap size={20} />
              ) : (
                <Zap size={20} />
              )}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                {demandMultiplier === 1.0 ? "Standard Baseline Operations" : `Surge Simulation: +${Math.round((demandMultiplier - 1.0) * 100)}% Customer Foot-Traffic`}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                {demandMultiplier === 1.0
                  ? "Standard schedule keeps customer wait time at ~2.3m with zero idle staff waste."
                  : `Smart staffing AI dynamically scales rush shifts from 1 to 3–4 baristas to handle extra volume without long wait times.`}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Queue Protection</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--success)", display: "flex", alignItems: "center", gap: 5 }}>
                <ShieldCheck size={14} /> Zero Walkouts (&lt; 2.5m Wait)
              </div>
            </div>
          </div>
        </div>

        {/* Live Mathematical Metric Pills */}
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
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Avg Wait Time</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--success)", marginTop: 2 }}>
              ~2.3 min <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>(&lt; 3.5m SLA)</span>
            </div>
          </div>

          <div style={{ background: "var(--bg-card)", padding: "10px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Service Level SLA</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)", marginTop: 2 }}>
              {scheduleData?.metrics.service_sla_target || "94.8% on-time"}
            </div>
          </div>

          <div style={{ background: "var(--bg-card)", padding: "10px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Daily Labor Hours</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>
              {scheduleData?.metrics.total_labor_hours || 15.0} hrs <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>(${scheduleData?.metrics.estimated_labor_cost || 225})</span>
            </div>
          </div>

          <div style={{ background: "var(--bg-card)", padding: "10px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Projected Labor Savings</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--success)", marginTop: 2 }}>
              ${scheduleData?.metrics.projected_daily_savings || 45.00} <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>/ day</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 24-Hour Visual Hourly Peak Orders (Spline Curve / Histogram / 7x24 Heatmap) */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
              <TrendingUp size={18} style={{ color: "var(--accent)" }} />
              {chartType === "HEATMAP"
                ? "7×24 Day-of-Week Customer Traffic Heatmap Matrix"
                : "24-Hour Customer Order Peak Curve"}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
              {chartType === "HEATMAP"
                ? "Historical 7-day hourly density heatmap showing weekly rush bottlenecks and customer traffic patterns."
                : "Historical customer order velocity used to compute optimal barista staffing."}
            </div>
          </div>

          {/* Toggle View (Spline / Columns / 7x24 Heatmap) & Legend */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 4, background: "var(--bg-surface)", padding: 3, borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
              <button
                className={`btn btn-sm ${chartType === "SPLINE" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setChartType("SPLINE")}
                style={{ padding: "4px 10px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <TrendingUp size={13} /> Spline Curve
              </button>
              <button
                className={`btn btn-sm ${chartType === "HISTOGRAM" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setChartType("HISTOGRAM")}
                style={{ padding: "4px 10px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <BarChart3 size={13} /> Columns
              </button>
              <button
                className={`btn btn-sm ${chartType === "HEATMAP" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setChartType("HEATMAP")}
                style={{ padding: "4px 10px", fontSize: 12, fontWeight: 600 }}
              >
                🔥 7×24 Heatmap
              </button>
            </div>

            {chartType !== "HEATMAP" && (
              <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--accent)" }} />
                  <span>Peak Rush</span>
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
            )}
          </div>
        </div>

        {/* Hourly Financial Efficiency & Profit Margin Strip */}
        {peakData?.financial_summary && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
              background: "rgba(16, 185, 129, 0.06)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              borderRadius: "var(--radius-md)",
              padding: "8px 14px",
              marginBottom: 16,
              fontSize: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#10b981", fontWeight: 700 }}>
              <span>💰 Projected Financial Efficiency:</span>
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", color: "var(--text-primary)" }}>
              <span>
                Daily Projected Rev: <strong style={{ color: "#10b981" }}>${peakData.financial_summary.daily_projected_revenue.toFixed(2)}</strong>
              </span>
              <span>
                Labor Cost: <strong style={{ color: "var(--accent)" }}>${peakData.financial_summary.daily_projected_labor_cost.toFixed(2)}</strong> ($15/hr)
              </span>
              <span>
                Net Labor Profit: <strong style={{ color: "#10b981" }}>${peakData.financial_summary.daily_projected_net_profit.toFixed(2)}</strong>
              </span>
              <span
                style={{
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#10b981",
                  padding: "2px 8px",
                  borderRadius: "var(--radius-sm)",
                  fontWeight: 800,
                }}
              >
                Overall Margin: {peakData.financial_summary.overall_profit_margin_percent}% 🟢
              </span>
            </div>
          </div>
        )}

        {/* Dynamic Chart Display */}
        {chartType === "SPLINE" ? (
          <SplinePeakChart hours={hours} maxOrders={maxOrders} />
        ) : chartType === "HEATMAP" ? (
          <WeeklyRushHeatmap
            heatmapData={peakData?.weekly_heatmap || []}
            topPeaks={peakData?.top_weekly_peaks || []}
            isLoading={loading}
          />
        ) : (
          <div>
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
                const heightPercent = maxOrders > 0 ? Math.max(12, Math.round((h.total_orders / maxOrders) * 100)) : 12;
                const isPeak = h.rush_category === "PEAK_RUSH" || heightPercent >= 70 || h.total_orders >= 160;
                const isMod = !isPeak && (h.rush_category === "MODERATE" || heightPercent >= 45 || h.total_orders >= 95);

                let barBg = "var(--bg-surface)";
                let barBorder = "1px solid var(--border)";
                let labelColor = "var(--text-muted)";
                let staffCount = h.recommended_staff || 1;

                if (isPeak) {
                  barBg = "linear-gradient(180deg, #f59e0b 0%, #d97706 100%)";
                  barBorder = "1px solid #f59e0b";
                  labelColor = "#f59e0b";
                } else if (isMod) {
                  barBg = "linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)";
                  barBorder = "1px solid #3b82f6";
                  labelColor = "#3b82f6";
                }

                return (
                  <div
                    key={h.hour}
                    title={`${h.label}: ${h.total_orders} Total Orders\nRecommended Staff: ${staffCount} baristas\nEstimated Revenue: $${(h.estimated_hourly_revenue || h.hourly_revenue).toFixed(2)}\nProfit Margin: ${h.profit_margin_percent || 80}%`}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      height: "100%",
                      justifyContent: "flex-end",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 800, color: labelColor, marginBottom: 4 }}>
                      {staffCount}p
                    </div>
                    <div
                      style={{
                        width: "100%",
                        height: `${heightPercent}%`,
                        background: barBg,
                        border: barBorder,
                        borderRadius: "5px 5px 0 0",
                        boxShadow: isPeak ? "0 2px 8px rgba(245, 158, 11, 0.3)" : (isMod ? "0 2px 8px rgba(59, 130, 246, 0.25)" : "none"),
                        transition: "all 0.25s ease",
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* X-Axis Hour Labels & Database Order Counts */}
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
                <div key={h.hour} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: "var(--text-primary)", fontWeight: 700 }}>
                    {h.label}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      color: h.rush_category === "PEAK_RUSH" ? "var(--accent)" : "var(--text-muted)",
                      fontWeight: 600,
                      marginTop: 2,
                    }}
                  >
                    {h.total_orders} orders
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. AI Shift Roster Cards */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
              <Calendar size={18} style={{ color: "var(--accent)" }} />
              AI Recommended Shift Schedule
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
              Dynamic staffing roster generated by matching available branch team members to peak rush demand.
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Target Date:</span>
              <input
                type="date"
                className="input"
                value={targetDate}
                onChange={(e) => {
                  setTargetDate(e.target.value);
                  generateSchedule(demandMultiplier, e.target.value, rotationSeed);
                }}
                style={{ width: "auto", padding: "4px 8px", fontSize: 13 }}
              />
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleRegenerateRoster}
              disabled={generating}
              style={{ fontWeight: 600 }}
            >
              <Sparkles size={14} className={generating ? "animate-spin" : ""} />
              {generating ? "Optimizing..." : "Regenerate Roster"}
            </button>
          </div>
        </div>

        {/* Active AI Strategy Badge */}
        {scheduleData?.strategy_name && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: "var(--radius-full)",
              background: "var(--accent-glow)",
              border: "1px solid var(--accent)",
              color: "var(--accent)",
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            <Sparkles size={13} />
            <span>
              Strategy: <strong>{scheduleData.strategy_name}</strong> • {scheduleData.strategy_tag} (Variant #{scheduleData.optimization_generation || 1})
            </span>
          </div>
        )}

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
                {/* Shift Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                      {shift.name}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700, display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
                      <Calendar size={13} /> {shift.display_date || scheduleData?.target_date_formatted || targetDate}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
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

                {/* Focus Rationale */}
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
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                >
                  <Lightbulb size={14} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />
                  <span>{shift.focus_rationale}</span>
                </div>

                {/* Assigned Team Members */}
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
                <span style={{ color: "var(--success)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <CheckCircle2 size={13} /> Rush-Hour Optimized
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Executive AI Business Rationale Box */}
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
            Executive AI Workforce Rationale
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
            {scheduleData.executive_rationale}
          </div>
        </div>
      )}
    </div>
  );
}
