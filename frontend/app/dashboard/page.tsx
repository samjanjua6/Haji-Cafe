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
import { useQueryClient } from "@tanstack/react-query";
import React from "react";
import { LowStockAlerts } from "@/components/LowStockAlerts";
import { KpiCards } from "@/components/analytics/KpiCards";
import { Card } from "@/components/Card";

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user, isLoading: loading } = useCurrentUser();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (user?.email && user.email.toLowerCase() === "kitchen@gmail.com") {
      const branchId = user.scopes?.[0]?.branchId || 1;
      router.replace(`/branches/${branchId}/kitchen`);
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
                {user.email.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
                  {user.email}
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
                  <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                    Member since {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Unknown"}
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

          {/* AI Peak Hours & 7x24 Rush Heatmap Intelligence Hub */}
          {(user.role === "BRANCH_MANAGER" || user.role === "CAFE_OWNER" || user.role === "SUPER_ADMIN") && (
            <Card
              style={{
                background: "linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(59, 130, 246, 0.06) 100%)",
                border: "1px solid rgba(245, 158, 11, 0.25)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
                padding: "16px 20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div
                  style={{
                    background: "var(--accent-glow)",
                    borderRadius: 12,
                    padding: 12,
                    color: "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <TrendingUp size={24} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                    <span>AI Peak Hours & 7×24 Rush Heatmap</span>
                    <span className="badge" style={{ background: "var(--accent-glow)", color: "var(--accent)", fontSize: 11 }}>
                      <Sparkles size={11} style={{ marginRight: 3, display: "inline" }} /> Erlang-C AI
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                    Live customer demand velocity, 7-day rush heatmaps, hourly profit margins (88%+), and intelligent staff scheduling.
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {user.role === "BRANCH_MANAGER" && user.scopes?.[0]?.branchId && (
                  <Link
                    href={`/branches/${user.scopes[0].branchId}/schedule?cafeId=${user.scopes[0].cafeId || ""}`}
                    className="btn btn-primary btn-sm"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, padding: "8px 14px" }}
                  >
                    <Flame size={14} /> Open Branch Peak Heatmap & Roster <ArrowRight size={13} />
                  </Link>
                )}
                {(user.role === "CAFE_OWNER" || user.role === "SUPER_ADMIN") && user.scopes?.[0]?.cafeId && (
                  <Link
                    href={`/cafes/${user.scopes[0].cafeId}/schedule`}
                    className="btn btn-primary btn-sm"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, padding: "8px 14px" }}
                  >
                    <Flame size={14} /> Franchise Peak Analysis & Rosters <ArrowRight size={13} />
                  </Link>
                )}
              </div>
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
