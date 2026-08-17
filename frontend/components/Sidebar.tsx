"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Coffee, LayoutDashboard, Store, ShoppingCart, LogOut, Menu, X, UtensilsCrossed
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

function NavLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: any; active: boolean }) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        borderRadius: "var(--radius-md)",
        fontWeight: active ? 600 : 400,
        fontSize: 14,
        whiteSpace: "nowrap",
        textDecoration: "none",
        color: active ? "var(--accent)" : "var(--text-muted)",
        background: active ? "var(--accent-muted)" : "transparent",
        borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
        transition: "all 0.15s ease",
        position: "relative",
      }}
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-primary)";
          (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.04)";
          (e.currentTarget as HTMLAnchorElement).style.transform = "translateX(2px)";
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-muted)";
          (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
          (e.currentTarget as HTMLAnchorElement).style.transform = "translateX(0)";
        }
      }}
    >
      <Icon size={17} />
      {label}
    </Link>
  );
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 10, overflow: "hidden", background: "var(--bg-surface)", flexShrink: 0 }}>
              <img src="/logo.png" alt="Haji Cafe Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", color: "var(--text-primary)" }}>Haji Cafe</div>
              <div style={{ fontSize: 10, color: "var(--accent)", whiteSpace: "nowrap", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                {user?.role ? user.role.replace(/_/g, " ") : "Dashboard"}
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
          {dynamicLinks.map(({ href, label, icon }) => (
            <NavLink key={href} href={href} label={label} icon={icon} active={pathname === href} />
          ))}

          {/* Scoped Branch Links */}
          {user?.role === "BRANCH_MANAGER" && user.scopes.map((scope, idx) => (
            <div key={idx} style={{ marginTop: 16 }}>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--text-faint)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                padding: "0 14px",
                marginBottom: 6,
              }}>
                {scope.branchName || `Branch #${scope.branchId}`}
              </div>
              <NavLink
                href={`/branches/${scope.branchId}/orders`}
                label="Orders"
                icon={ShoppingCart}
                active={pathname.includes(`/branches/${scope.branchId}/orders`)}
              />
              <NavLink
                href={`/branches/${scope.branchId}/menu`}
                label="Branch Menu"
                icon={UtensilsCrossed}
                active={pathname.includes(`/branches/${scope.branchId}/menu`)}
              />
            </div>
          ))}
        </nav>

        {/* User footer */}
        {user && (
          <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.email}
            </div>
            <button
              onClick={handleLogout}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 14px",
                borderRadius: "var(--radius-md)",
                fontSize: 14,
                whiteSpace: "nowrap",
                cursor: "pointer",
                color: "var(--danger)",
                background: "transparent",
                border: "none",
                width: "100%",
                transition: "background 0.15s",
                fontWeight: 500,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--danger-glow)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        )}
      </aside>

      {/* Spacer */}
      <div style={{ width: open ? 240 : 0, flexShrink: 0, transition: "width 0.25s ease" }} />
    </>
  );
}
