"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Shield, Mail, Coffee, GitBranch, ShoppingCart, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";
import toast from "react-hot-toast";

interface UserProfile { id: number; email: string; role: { name: string }; createdAt: string; }

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

  if (loading) return <div style={{ color: "var(--text-muted)", marginTop: 80, textAlign: "center" }}>Loading...</div>;

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
                  {user.role.name}
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
            {[
              { icon: Coffee, label: "Manage Cafés", href: "/cafes", color: "#f59e0b" },
            ].map(({ icon: Icon, label, href, color }) => (
              <a
                key={href}
                href={href}
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
                <div style={{ background: color + "22", borderRadius: 12, padding: 14 }}>
                  <Icon size={24} color={color} />
                </div>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{label}</span>
              </a>
            ))}
          </div>

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
