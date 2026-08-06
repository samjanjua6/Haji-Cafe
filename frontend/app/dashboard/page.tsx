"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Shield, Mail, Coffee, ShoppingCart, RefreshCw, Calendar, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";
import toast from "react-hot-toast";
import { AuditLogTable } from "@/components/AuditLogTable";

interface UserProfile {
  id: number;
  email: string;
  role: string;
  createdAt: string;
  has_google_calendar: boolean;
  scopes: { cafeId: number | null; branchId: number | null; cafeName: string | null; branchName: string | null }[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.isLoggedIn()) { router.push("/"); return; }
    api.get<UserProfile>("/auth/me")
      .then(setUser)
      .catch(() => { auth.clear(); router.push("/"); })
      .finally(() => setLoading(false));
  }, []);

  const handleRefresh = async () => {
    const refreshToken = auth.getRefresh();
    if (!refreshToken) return;
    try {
      const data: any = await api.post("/auth/refresh", { refresh_token: refreshToken });
      auth.setTokens(data.access_token, data.refresh_token);
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

  if (loading) return <div style={{ color: "var(--text-muted)", marginTop: 80, textAlign: "center" }}>Loading...</div>;

  const renderQuickLinks = () => {
    if (user?.role === "SUPER_ADMIN") {
      return (
        <>
          <a
            href="/cafes"
            className="card"
            style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 12, textDecoration: "none", cursor: "pointer",
              transition: "transform 0.2s, border-color 0.2s",
              textAlign: "center",
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-4px)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "none")}
          >
            <div style={{ background: "#f59e0b22", borderRadius: 12, padding: 14 }}>
              <Coffee size={24} color="#f59e0b" />
            </div>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Manage All Cafés</span>
          </a>
          <a
            href="/admin/users"
            className="card"
            style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 12, textDecoration: "none", cursor: "pointer",
              transition: "transform 0.2s, border-color 0.2s",
              textAlign: "center",
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-4px)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "none")}
          >
            <div style={{ background: "#3b82f622", borderRadius: 12, padding: 14 }}>
              <User size={24} color="#3b82f6" />
            </div>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Manage All Users</span>
          </a>
        </>
      );
    }

    if (user?.role === "CAFE_OWNER") {
      return user.scopes.map((scope, idx) => (
        <a
          key={`cafe-${idx}`}
          href={`/cafes/${scope.cafeId}`}
          className="card"
          style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: 12, textDecoration: "none", cursor: "pointer",
            transition: "transform 0.2s, border-color 0.2s",
            textAlign: "center",
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-4px)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "none")}
        >
          <div style={{ background: "#f59e0b22", borderRadius: 12, padding: 14 }}>
            <Coffee size={24} color="#f59e0b" />
          </div>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Manage {scope.cafeName || `Café #${scope.cafeId}`}</span>
        </a>
      ));
    }

    if (user?.role === "BRANCH_MANAGER") {
      return user.scopes.map((scope, idx) => (
        <a
          key={idx}
          href={`/branches/${scope.branchId}/orders`}
          className="card"
          style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: 12, textDecoration: "none", cursor: "pointer",
            transition: "transform 0.2s, border-color 0.2s",
            textAlign: "center",
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-4px)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "none")}
        >
          <div style={{ background: "#3b82f622", borderRadius: 12, padding: 14 }}>
            <ShoppingCart size={24} color="#3b82f6" />
          </div>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{scope.branchName || `Branch #${scope.branchId}`} Orders</span>
        </a>
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
          <div className="card" style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <User size={28} color="#0f172a" />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{user.email}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
                <span style={{
                  background: "var(--accent)", color: "#0f172a", padding: "3px 10px",
                  borderRadius: 999, fontSize: 12, fontWeight: 700,
                }}>
                  <Shield size={10} style={{ marginRight: 4, display: "inline" }} />
                  {user.role.replace("_", " ")}
                </span>
                <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
                  <Mail size={12} style={{ marginRight: 4, display: "inline" }} />
                  {user.email}
                </span>
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>
                Member since {new Date(user.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            {renderQuickLinks()}
          </div>

          {/* Google Calendar Connect Banner — only for CAFE_OWNER */}
          {user.role === "CAFE_OWNER" && (
            <div
              className="card"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                borderColor: user.has_google_calendar ? "#22c55e44" : "#f59e0b44",
                background: user.has_google_calendar ? "#22c55e08" : "#f59e0b08",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div
                  style={{
                    background: user.has_google_calendar ? "#22c55e22" : "#f59e0b22",
                    borderRadius: 12,
                    padding: 12,
                    flexShrink: 0,
                  }}
                >
                  {user.has_google_calendar
                    ? <CheckCircle size={24} color="#22c55e" />
                    : <Calendar size={24} color="#f59e0b" />}
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
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleConnectCalendar}
                  style={{ flexShrink: 0 }}
                >
                  <Calendar size={14} style={{ marginRight: 6 }} />
                  Connect Now
                </button>
              )}
            </div>
          )}

          {/* Audit Logs for Cafe Owners */}
          {user.role === "CAFE_OWNER" && user.scopes.map((scope, idx) => (
            scope.cafeId ? <AuditLogTable key={`audit-${idx}`} cafeId={scope.cafeId} cafeName={scope.cafeName || ""} /> : null
          ))}

          {/* API Info */}
          <div className="card">
            <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>API Connection</h3>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
              <span style={{ fontSize: 14, color: "var(--text-muted)" }}>
                Connected to {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}
              </span>
            </div>
            <div style={{ marginTop: 12, fontSize: 13, color: "var(--text-muted)" }}>
              Swagger Docs: <a href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/docs`} target="_blank" style={{ color: "var(--accent)" }}>Open API Docs ↗</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
