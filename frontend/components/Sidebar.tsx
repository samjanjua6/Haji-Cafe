"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Coffee, LayoutDashboard, Store, GitBranch,
  ShoppingCart, LogOut, Menu, X
} from "lucide-react";
import { useState, useEffect } from "react";
import { auth } from "@/lib/auth";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

interface UserProfile {
  id: number;
  email: string;
  role: string;
  scopes: { cafeId: number | null; branchId: number | null; cafeName: string | null; branchName: string | null }[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (auth.isLoggedIn()) {
      api.get<UserProfile>("/auth/me").then(setUser).catch(() => {});
    }
  }, []);

  const handleLogout = async () => {
    try {
      const refreshToken = auth.getRefresh();
      if (refreshToken) {
        await api.post("/auth/logout", { refresh_token: refreshToken });
      }
    } catch {}
    auth.clear();
    toast.success("Logged out");
    router.push("/");
  };

  const dynamicLinks = [...navItems];
  if (user?.role === "SUPER_ADMIN" || user?.role === "CAFE_OWNER") {
    dynamicLinks.push({ href: "/cafes", label: "Cafés", icon: Store });
  }

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 left-4 z-50 p-2 rounded-lg md:hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside
        style={{
          width: open ? 240 : 0,
          background: "var(--bg-card)",
          borderRight: "1px solid var(--border)",
          height: "100vh",
          position: "fixed",
          top: 0,
          left: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transition: "width 0.25s ease",
          zIndex: 40,
        }}
      >
        {/* Logo */}
        <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: "var(--accent)", borderRadius: 10, padding: 8 }}>
              <Coffee size={20} color="#0f172a" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, whiteSpace: "nowrap" }}>Haji Cafe</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{user?.role ? user.role.replace("_", " ") : "Dashboard"}</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4, overflowY: "auto" }}>
          {dynamicLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  borderRadius: 8,
                  fontWeight: active ? 600 : 400,
                  fontSize: 14,
                  whiteSpace: "nowrap",
                  textDecoration: "none",
                  color: active ? "#0f172a" : "var(--text-muted)",
                  background: active ? "var(--accent)" : "transparent",
                  transition: "all 0.15s",
                }}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}

          {/* Scoped Branch Links for Branch Managers */}
          {user?.role === "BRANCH_MANAGER" && user.scopes.map((scope, idx) => (
            <div key={idx} style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, padding: "0 14px", marginBottom: 8 }}>
                {scope.branchName || `Branch #${scope.branchId}`}
              </div>
              <Link
                href={`/branches/${scope.branchId}/orders`}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8,
                  fontWeight: pathname.includes(`/branches/${scope.branchId}/orders`) ? 600 : 400,
                  fontSize: 14, textDecoration: "none",
                  color: pathname.includes(`/branches/${scope.branchId}/orders`) ? "#0f172a" : "var(--text-muted)",
                  background: pathname.includes(`/branches/${scope.branchId}/orders`) ? "var(--accent)" : "transparent",
                }}
              >
                <ShoppingCart size={18} /> Orders
              </Link>
              <Link
                href={`/branches/${scope.branchId}/menu`}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8,
                  fontWeight: pathname.includes(`/branches/${scope.branchId}/menu`) ? 600 : 400,
                  fontSize: 14, textDecoration: "none",
                  color: pathname.includes(`/branches/${scope.branchId}/menu`) ? "#0f172a" : "var(--text-muted)",
                  background: pathname.includes(`/branches/${scope.branchId}/menu`) ? "var(--accent)" : "transparent",
                }}
              >
                <Store size={18} /> Branch Menu
              </Link>
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: "16px 12px", borderTop: "1px solid var(--border)" }}>
          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              borderRadius: 8,
              fontSize: 14,
              whiteSpace: "nowrap",
              cursor: "pointer",
              color: "#ef4444",
              background: "transparent",
              border: "none",
              width: "100%",
              transition: "background 0.15s",
            }}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Spacer */}
      <div style={{ width: open ? 240 : 0, flexShrink: 0, transition: "width 0.25s ease" }} />
    </>
  );
}
