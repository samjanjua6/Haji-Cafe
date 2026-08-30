"use client";
import { useRouter } from "next/navigation";
import { User, Shield, Mail, Coffee, ShoppingCart, RefreshCw, Calendar, CheckCircle } from "lucide-react";
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
import { HistoricalPredictionChart } from "@/components/analytics/HistoricalPredictionChart";

import { Card } from "@/components/Card";

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  // Shared hook — if Sidebar already fetched this, it's instant from cache
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
      // Invalidate the user cache so everything re-fetches with the new token
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      toast.success("Tokens refreshed!");
    } catch (e: any) { toast.error(e.message); }
  };

  const handleConnectCalendar = async () => {
    try {
      const data: any = await api.get("/auth/google/connect");
      window.location.href = data.connect_url;
    } catch (e: any) {
      toast.error("Could not get Google connect URL.");
    }
  };

  if (!mounted || loading) return (
    <div style={{ display: "grid", gap: 20 }}>
      <Card style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <Skeleton width={64} height={64} borderRadius="50%" />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          <Skeleton width="40%" height={20} />
          <Skeleton width="25%" height={14} />
          <Skeleton width="20%" height={12} />
        </div>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, alignItems: "start" }}>
        {[1, 2].map(i => (
          <Card key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <Skeleton width={52} height={52} borderRadius={12} />
            <Skeleton width="70%" height={14} />
          </Card>
        ))}
      </div>
      <Card>
        <Skeleton width="30%" height={18} style={{ marginBottom: 16 }} />
        <Skeleton width="50%" height={14} />
      </Card>
    </div>
  );

  const renderQuickLinks = () => {
    if (user?.role === "SUPER_ADMIN") {
      return (
        <>
          <Link href="/cafes" style={{ textDecoration: "none" }}>
            <Card interactive style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center", height: "100%" }}>
              <div style={{ background: "var(--warning-glow)", borderRadius: 12, padding: 14 }}><Coffee size={24} color="var(--warning)" /></div>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Manage All Cafés</span>
            </Card>
          </Link>
        </>
      );
    }
    if (user?.role === "CAFE_OWNER") {
      return user.scopes.map((scope, idx) => (
        <Link key={`cafe-${idx}`} href={`/cafes/${scope.cafeId}`} style={{ textDecoration: "none" }}>
          <Card interactive style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center", height: "100%" }}>
            <div style={{ background: "var(--warning-glow)", borderRadius: 12, padding: 14 }}><Coffee size={24} color="var(--warning)" /></div>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Manage {scope.cafeName || `Café #${scope.cafeId}`}</span>
          </Card>
        </Link>
      ));
    }
    if (user?.role === "BRANCH_MANAGER") {
      return user.scopes.map((scope, idx) => (
        <Link key={idx} href={`/branches/${scope.branchId}/orders?cafeId=${scope.cafeId}`} style={{ textDecoration: "none" }}>
          <Card interactive style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center", height: "100%" }}>
            <div style={{ background: "var(--info-glow)", borderRadius: 12, padding: 14 }}><ShoppingCart size={24} color="var(--info)" /></div>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{scope.branchName || `Branch #${scope.branchId}`} Orders</span>
          </Card>
        </Link>
      ));
    }
    return null;
  };

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
          {/* Profile card */}
          <Card style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <User size={28} color="var(--bg-base)" />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{user.email}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
                <span style={{ background: "var(--accent)", color: "var(--bg-base)", padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                  <Shield size={10} style={{ marginRight: 4, display: "inline" }} />
                  {user.role.replace("_", " ")}
                </span>
                <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
                  <Mail size={12} style={{ marginRight: 4, display: "inline" }} />
                  {user.email}
                </span>
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>
                Member since {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Unknown"}
              </div>
            </div>
          </Card>

          {/* KPI Metric Cards — Today's Revenue, Active Orders, Out of Stock, Low Stock */}
          <KpiCards />

          {/* AI Historical Intelligence & Predictive Sales Forecasting Graph */}
          {user.role !== "STAFF" && (
            <HistoricalPredictionChart
              cafeId={user.scopes[0]?.cafeId}
              branchId={user.scopes[0]?.branchId}
              cafeName={user.scopes[0]?.cafeName}
            />
          )}

          {/* Quick links */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, alignItems: "start" }}>
            {renderQuickLinks()}
          </div>

          {/* Google Calendar Connect Banner */}
          {user.role === "CAFE_OWNER" && (
            <Card style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, borderColor: user.has_google_calendar ? "var(--success-glow)" : "var(--warning-glow)", background: user.has_google_calendar ? "rgba(34, 197, 94, 0.05)" : "rgba(245, 158, 11, 0.05)", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ background: user.has_google_calendar ? "var(--success-glow)" : "var(--warning-glow)", borderRadius: 12, padding: 12, flexShrink: 0 }}>
                  {user.has_google_calendar ? <CheckCircle size={24} color="var(--success)" /> : <Calendar size={24} color="var(--warning)" />}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{user.has_google_calendar ? "Google Calendar Connected" : "Connect Google Calendar"}</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>
                    {user.has_google_calendar ? "You can schedule staff meetings directly from the café management page." : "Required to schedule meetings with your staff. Click to grant access."}
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
          {user.role === "CAFE_OWNER" && user.scopes.map((scope, idx) => (
            scope.cafeId ? <LowStockAlerts key={`alert-${idx}`} cafeId={scope.cafeId} cafeName={scope.cafeName || ""} /> : null
          ))}

          {/* Audit Logs */}
          {user.role === "CAFE_OWNER" && user.scopes.map((scope, idx) => (
            scope.cafeId ? <AuditLogTable key={`audit-${idx}`} cafeId={scope.cafeId} cafeName={scope.cafeName || ""} /> : null
          ))}

          {/* API Info */}
          <Card>
            <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>API Connection</h3>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)" }} />
              <span style={{ fontSize: 14, color: "var(--text-muted)" }}>
                Connected to {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}
              </span>
            </div>
            <div style={{ marginTop: 12, fontSize: 13, color: "var(--text-muted)" }}>
              Swagger Docs: <a href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/docs`} target="_blank" style={{ color: "var(--accent)", textDecoration: "underline" }}>Open API Docs ↗</a>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
