"use client";
import { useRouter } from "next/navigation";
import {
  User,
  Shield,
  Mail,
  Coffee,
  ShoppingCart,
  RefreshCw,
  Calendar,
  CheckCircle,
  Flame,
  ArrowRight,
  Store,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";
import toast from "react-hot-toast";
import Link from "next/link";
import { AuditLogTable } from "@/components/AuditLogTable";
import { Skeleton } from "@/components/LoadingSkeleton";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { LowStockAlerts } from "@/components/LowStockAlerts";
import { KpiCards } from "@/components/analytics/KpiCards";
import { Card } from "@/components/Card";
import SplinePeakChart from "@/components/charts/SplinePeakChart";
import WeeklyRushHeatmap from "@/components/charts/WeeklyRushHeatmap";

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user, isLoading: loading } = useCurrentUser();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const [dashChartType, setDashChartType] = React.useState<"HEATMAP" | "SPLINE" | "HISTOGRAM">("HEATMAP");
  const branchId = user?.scopes?.[0]?.branchId || user?.defaultBranchId || (user?.role === "BRANCH_MANAGER" ? 3 : undefined);
  const cafeId = user?.scopes?.[0]?.cafeId || user?.defaultCafeId || (user?.role === "CAFE_OWNER" ? 2 : undefined);

  const { data: peakDataRes, isLoading: loadingPeaks } = useQuery({
    queryKey: ["dashboard-peaks", branchId, cafeId],
    queryFn: async () => {
      const query = branchId
        ? `/scheduling/peak-hours?branch_id=${branchId}`
        : cafeId
        ? `/scheduling/peak-hours?cafe_id=${cafeId}`
        : `/scheduling/peak-hours`;
      return api.get<{ status: string; data: any }>(query);
    },
    enabled: !!user,
  });
  const peakData = peakDataRes?.data;
  const hours = peakData?.operating_hours || [];
  const maxOrders = hours.length > 0 ? Math.max(...hours.map((h: any) => h.total_orders)) : 1;

  React.useEffect(() => {
    if (user?.email && user.email.toLowerCase() === "kitchen@gmail.com") {
      const bId = user.scopes?.[0]?.branchId || 1;
      router.replace(`/branches/${bId}/kitchen`);
    }
  }, [user, router]);

  const handleRefresh = async () => {
    const refreshToken = auth.getRefresh();
    if (!refreshToken) return;
    try {
      const data: any = await api.post("/auth/refresh", { refresh_token: refreshToken });
      auth.setTokens(data.access_token, data.refresh_token);
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      toast.success("Tokens refreshed!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleConnectCalendar = async () => {
    try {
      const data: any = await api.get("/auth/google/connect");
      window.location.href = data.connect_url;
    } catch (e: any) {
      toast.error("Could not get Google connect URL.");
    }
  };

  if (!mounted || loading) {
    return (
      <div style={{ display: "grid", gap: 20 }}>
        <Card style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Skeleton width={64} height={64} borderRadius="50%" />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            <Skeleton width="40%" height={20} />
            <Skeleton width="25%" height={14} />
            <Skeleton width="20%" height={12} />
          </div>
        </Card>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={88} borderRadius={12} />
          ))}
        </div>
        <Card>
          <Skeleton width="30%" height={18} style={{ marginBottom: 16 }} />
          <Skeleton width="50%" height={14} />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Welcome back to Haji Cafe Management</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={handleRefresh}>
          <RefreshCw size={14} /> Refresh Token
        </button>
      </div>

      {user && (
        <div style={{ display: "grid", gap: 20 }}>
          {/* Profile Card with Integrated Cafe / Role Quick Jump Badge */}
          <Card
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 20,
              flexWrap: "wrap",
            }}
          >
            {/* User Identity Details */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontWeight: 800,
                  fontSize: 20,
                  color: "#0f172a",
                }}
              >
                {user.displayName?.trim()
                  ? user.displayName
                      .trim()
                      .split(/\s+/)
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()
                  : user.email.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
                  {user.displayName?.trim() || user.email}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center", flexWrap: "wrap" }}>
                  <span
                    style={{
                      background: "var(--accent-muted)",
                      color: "var(--accent)",
                      padding: "2px 8px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                      border: "1px solid var(--accent-glow)",
                    }}
                  >
                    <Shield size={10} style={{ marginRight: 4, display: "inline" }} />
                    {user.role.replace("_", " ")}
                  </span>
                  {user.displayName?.trim() && (
                    <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                      {user.email}
                    </span>
                  )}
                  <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                    {user.displayName?.trim() ? "• " : ""}Member since {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Unknown"}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Side: Cafe / Branch Quick Jump Badge */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              {user.role === "CAFE_OWNER" &&
                user.scopes.map((scope, idx) => (
                  <Link
                    key={`cafe-badge-${idx}`}
                    href={`/cafes/${scope.cafeId}`}
                    className="btn btn-secondary"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 14px",
                      borderRadius: "var(--radius-md)",
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: "none",
                      border: "1px solid var(--border)",
                      transition: "border-color 0.2s, background 0.2s",
                    }}
                  >
                    <Coffee size={15} color="var(--accent)" />
                    <span>{scope.cafeName || `Café #${scope.cafeId}`}</span>
                    <span style={{ color: "var(--text-faint)", fontSize: 11 }}>(#{scope.cafeId})</span>
                    <ArrowRight size={13} style={{ color: "var(--text-muted)", marginLeft: 2 }} />
                  </Link>
                ))}

              {user.role === "BRANCH_MANAGER" &&
                user.scopes.map((scope, idx) => (
                  <Link
                    key={`branch-badge-${idx}`}
                    href={`/branches/${scope.branchId}/orders?cafeId=${scope.cafeId}`}
                    className="btn btn-secondary"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 14px",
                      borderRadius: "var(--radius-md)",
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    <Store size={15} color="var(--info)" />
                    <span>{scope.branchName || `Branch #${scope.branchId}`}</span>
                    <ArrowRight size={13} style={{ color: "var(--text-muted)", marginLeft: 2 }} />
                  </Link>
                ))}

              {user.role === "SUPER_ADMIN" && (
                <Link
                  href="/cafes"
                  className="btn btn-secondary"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 14px",
                    borderRadius: "var(--radius-md)",
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  <Coffee size={15} color="var(--warning)" />
                  <span>Manage All Cafés</span>
                  <ArrowRight size={13} style={{ color: "var(--text-muted)", marginLeft: 2 }} />
                </Link>
              )}

              {user.role === "STAFF" &&
                user.scopes.map((scope, idx) => (
                  <React.Fragment key={idx}>
                    <Link
                      href={`/branches/${scope.branchId}/orders?cafeId=${scope.cafeId}&takeOrder=true`}
                      className="btn btn-primary btn-sm"
                      style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                    >
                      <ShoppingCart size={14} /> Take Order
                    </Link>
                    <Link
                      href={`/branches/${scope.branchId}/kitchen?cafeId=${scope.cafeId}`}
                      className="btn btn-secondary btn-sm"
                      style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                    >
                      <Flame size={14} color="#3b82f6" /> KDS
                    </Link>
                  </React.Fragment>
                ))}
            </div>
          </Card>

          {/* KPI Metric Cards — Today's Revenue, Active Orders, Out of Stock, Low Stock */}
          <KpiCards />

          {/* AI Peak Hours, 7x24 Rush Heatmap & Hourly Profitability Hub directly embedded on Dashboard */}
          {(user.role === "BRANCH_MANAGER" || user.role === "CAFE_OWNER" || user.role === "SUPER_ADMIN") && (
            <Card style={{ padding: "20px 24px" }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                    <TrendingUp size={20} style={{ color: "var(--accent)" }} />
                    {dashChartType === "HEATMAP"
                      ? "7×24 Day-of-Week Customer Traffic Heatmap Matrix"
                      : "24-Hour Customer Order Peak Velocity & Staffing"}
                    <span className="badge" style={{ background: "var(--accent-glow)", color: "var(--accent)", fontSize: 11 }}>
                      <Sparkles size={11} style={{ marginRight: 3, display: "inline" }} /> Erlang-C AI
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>
                    Live 7-day traffic density, peak rush bottlenecks, hourly profit margins, and queueing models.
                  </div>
                </div>

                {/* 3-Way View Switcher */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 4, background: "var(--bg-surface)", padding: 3, borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                    <button
                      className={`btn btn-sm ${dashChartType === "HEATMAP" ? "btn-primary" : "btn-ghost"}`}
                      onClick={() => setDashChartType("HEATMAP")}
                      style={{ padding: "4px 10px", fontSize: 12, fontWeight: 700 }}
                    >
                      🔥 7×24 Heatmap
                    </button>
                    <button
                      className={`btn btn-sm ${dashChartType === "SPLINE" ? "btn-primary" : "btn-ghost"}`}
                      onClick={() => setDashChartType("SPLINE")}
                      style={{ padding: "4px 10px", fontSize: 12, fontWeight: 700 }}
                    >
                      📈 Spline Curve
                    </button>
                    <button
                      className={`btn btn-sm ${dashChartType === "HISTOGRAM" ? "btn-primary" : "btn-ghost"}`}
                      onClick={() => setDashChartType("HISTOGRAM")}
                      style={{ padding: "4px 10px", fontSize: 12, fontWeight: 700 }}
                    >
                      📊 Columns
                    </button>
                  </div>

                  {user.role === "BRANCH_MANAGER" && user.scopes?.[0]?.branchId && (
                    <Link
                      href={`/branches/${user.scopes[0].branchId}/schedule?cafeId=${user.scopes[0].cafeId || ""}`}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)" }}
                    >
                      Full Roster Planner <ArrowRight size={13} style={{ marginLeft: 4 }} />
                    </Link>
                  )}
                  {(user.role === "CAFE_OWNER" || user.role === "SUPER_ADMIN") && user.scopes?.[0]?.cafeId && (
                    <Link
                      href={`/cafes/${user.scopes[0].cafeId}/schedule`}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)" }}
                    >
                      Franchise Roster Planner <ArrowRight size={13} style={{ marginLeft: 4 }} />
                    </Link>
                  )}
                </div>
              </div>

              {/* Financial Efficiency & Profit Margin Strip */}
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
                    padding: "10px 16px",
                    marginBottom: 16,
                    fontSize: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#10b981", fontWeight: 700 }}>
                    <span>💰 Financial & Labor Efficiency:</span>
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

              {/* Dynamic Chart Display directly inside Dashboard */}
              {dashChartType === "HEATMAP" ? (
                <WeeklyRushHeatmap
                  heatmapData={peakData?.weekly_heatmap || []}
                  topPeaks={peakData?.top_weekly_peaks || []}
                  isLoading={loadingPeaks}
                />
              ) : dashChartType === "SPLINE" ? (
                <SplinePeakChart hours={hours} maxOrders={maxOrders} />
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
                    {hours.map((h: any) => {
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
                          title={`${h.label}: ${h.total_orders} Total Orders\nErlang-C Staff Required: ${staffCount} servers\nEstimated Revenue: $${(h.estimated_hourly_revenue || h.hourly_revenue || 0).toFixed(2)}\nProfit Margin: ${h.profit_margin_percent || 80}%`}
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
                    {hours.map((h: any) => (
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
            </Card>
          )}

          {/* Google Calendar Connect Banner */}
          {user.role === "CAFE_OWNER" && (
            <Card
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                borderColor: user.has_google_calendar ? "var(--success-glow)" : "var(--warning-glow)",
                background: user.has_google_calendar ? "rgba(34, 197, 94, 0.05)" : "rgba(245, 158, 11, 0.05)",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div
                  style={{
                    background: user.has_google_calendar ? "var(--success-glow)" : "var(--warning-glow)",
                    borderRadius: 12,
                    padding: 12,
                    flexShrink: 0,
                  }}
                >
                  {user.has_google_calendar ? (
                    <CheckCircle size={24} color="var(--success)" />
                  ) : (
                    <Calendar size={24} color="var(--warning)" />
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>
                    {user.has_google_calendar ? "Google Calendar Connected" : "Connect Google Calendar"}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>
                    {user.has_google_calendar
                      ? "You can schedule staff meetings directly from the café management page."
                      : "Required to schedule meetings with your staff. Click to grant access."}
                  </div>
                </div>
              </div>
              {!user.has_google_calendar && (
                <button className="btn btn-primary btn-sm" onClick={handleConnectCalendar} style={{ flexShrink: 0 }}>
                  <Calendar size={14} style={{ marginRight: 6 }} /> Connect Now
                </button>
              )}
            </Card>
          )}

          {/* Low Stock Alerts */}
          {user.role === "CAFE_OWNER" &&
            user.scopes.map((scope, idx) =>
              scope.cafeId ? (
                <LowStockAlerts
                  key={`alert-${idx}`}
                  cafeId={scope.cafeId}
                  cafeName={scope.cafeName || ""}
                />
              ) : null
            )}

          {/* Audit Logs */}
          {user.role === "CAFE_OWNER" &&
            user.scopes.map((scope, idx) =>
              scope.cafeId ? (
                <AuditLogTable
                  key={`audit-${idx}`}
                  cafeId={scope.cafeId}
                  cafeName={scope.cafeName || ""}
                />
              ) : null
            )}
        </div>
      )}
    </div>
  );
}
