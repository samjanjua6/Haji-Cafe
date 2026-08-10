"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Coffee, LayoutDashboard, Store, GitBranch,
  ShoppingCart, LogOut, Menu, X, Users
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
  if (user?.role === "SUPER_ADMIN") {
    dynamicLinks.push({ href: "/cafes", label: "All Cafés", icon: Store });
    dynamicLinks.push({ href: "/admin/users", label: "Users", icon: Users });
  } else if (user?.role === "CAFE_OWNER") {
    user.scopes.forEach((scope) => {
      dynamicLinks.push({ href: `/cafes/${scope.cafeId}`, label: scope.cafeName || `Café #${scope.cafeId}`, icon: Store });
    });
  }

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 left-4 z-50 p-2 rounded-lg md:hidden"
        style={{ background: "var(--sidebar)", color: "#FFFFFF", border: "none" }}
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside
        style={{
          width: open ? 260 : 0,
          background: "var(--sidebar)",
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
        <div style={{ padding: "32px 24px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, background: "#FFFFFF", borderRadius: 12, padding: 4 }}>
              <img src="/logo.png" alt="Haji Cafe Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
            <div>
              <div className="font-heading" style={{ fontWeight: 700, fontSize: 18, color: "#FFFFFF", whiteSpace: "nowrap", letterSpacing: "-0.01em" }}>Haji Café</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>{user?.role ? user.role.replace("_", " ") : "MANAGEMENT"}</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "24px 16px", display: "flex", flexDirection: "column", gap: 6, overflowY: "auto" }}>
          {dynamicLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 16px",
                  borderRadius: 10,
                  fontWeight: active ? 600 : 500,
                  fontSize: 14,
                  whiteSpace: "nowrap",
                  textDecoration: "none",
                  color: active ? "#FFFFFF" : "rgba(255,255,255,0.65)",
                  background: active ? "var(--primary)" : "transparent",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.color = "#FFFFFF";
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.color = "rgba(255,255,255,0.65)";
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}

          {/* Scoped Branch Links for Branch Managers */}
          {user?.role === "BRANCH_MANAGER" && user.scopes.map((scope, idx) => (
            <div key={idx} style={{ marginTop: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", padding: "0 16px", marginBottom: 12 }}>
                {scope.branchName || `Branch #${scope.branchId}`}
              </div>
              <Link
                href={`/branches/${scope.branchId}/orders`}
                style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 10,
                  fontWeight: pathname.includes(`/branches/${scope.branchId}/orders`) ? 600 : 500,
                  fontSize: 14, textDecoration: "none",
                  color: pathname.includes(`/branches/${scope.branchId}/orders`) ? "#FFFFFF" : "rgba(255,255,255,0.65)",
                  background: pathname.includes(`/branches/${scope.branchId}/orders`) ? "var(--primary)" : "transparent",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={e => { if (!pathname.includes(`/branches/${scope.branchId}/orders`)) { e.currentTarget.style.color = "#FFFFFF"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; } }}
                onMouseLeave={e => { if (!pathname.includes(`/branches/${scope.branchId}/orders`)) { e.currentTarget.style.color = "rgba(255,255,255,0.65)"; e.currentTarget.style.background = "transparent"; } }}
              >
                <ShoppingCart size={18} /> Orders
              </Link>
              <Link
                href={`/branches/${scope.branchId}/menu`}
                style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 10,
                  fontWeight: pathname.includes(`/branches/${scope.branchId}/menu`) ? 600 : 500,
                  fontSize: 14, textDecoration: "none",
                  color: pathname.includes(`/branches/${scope.branchId}/menu`) ? "#FFFFFF" : "rgba(255,255,255,0.65)",
                  background: pathname.includes(`/branches/${scope.branchId}/menu`) ? "var(--primary)" : "transparent",
                  transition: "all 0.2s ease",
                  marginTop: 6
                }}
                onMouseEnter={e => { if (!pathname.includes(`/branches/${scope.branchId}/menu`)) { e.currentTarget.style.color = "#FFFFFF"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; } }}
                onMouseLeave={e => { if (!pathname.includes(`/branches/${scope.branchId}/menu`)) { e.currentTarget.style.color = "rgba(255,255,255,0.65)"; e.currentTarget.style.background = "transparent"; } }}
              >
                <Store size={18} /> Branch Menu
              </Link>
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: "20px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "12px 16px",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 500,
              whiteSpace: "nowrap",
              cursor: "pointer",
              color: "#E28B8B",
              background: "transparent",
              border: "none",
              width: "100%",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "rgba(226, 139, 139, 0.1)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Spacer */}
      <div style={{ width: open ? 260 : 0, flexShrink: 0, transition: "width 0.25s ease" }} />
    </>
  );
}

