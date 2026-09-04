"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Store, ShoppingCart, LogOut, Menu, X, UtensilsCrossed, Users, Settings, Flame, GitBranch, Package, Coffee, Calendar
} from "lucide-react";
import { auth } from "@/lib/auth";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQueryClient } from "@tanstack/react-query";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

function NavLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: any; active: boolean }) {
  return (
    <Link
      href={href}
      prefetch={true}
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
      }}
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-primary)";
          (e.currentTarget as HTMLAnchorElement).style.background = "var(--bg-surface)";
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
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(true);

  // Share the user profile with Dashboard — no duplicate network call
  const { data: user } = useCurrentUser();

  const handleLogout = async () => {
    try {
      const refreshToken = auth.getRefresh();
      if (refreshToken) {
        await api.post("/auth/logout", { refresh_token: refreshToken });
      }
    } catch {}
    auth.clear();
    // Clear all cached queries so no stale data shows on next login
    queryClient.clear();
    toast.success("Logged out");
    router.push("/");
  };

  const dynamicLinks = [...navItems];
  if (user?.role === "SUPER_ADMIN") {
    dynamicLinks.push({ href: "/cafes", label: "All Cafés", icon: Store });
    dynamicLinks.push({ href: "/kitchen", label: "Kitchen KDS", icon: Flame });
    dynamicLinks.push({ href: "/admin/users", label: "User Management", icon: Users });
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
                {user?.role ? user.role.replace(/_/g, " ") : "Loading..."}
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
          {dynamicLinks.map(({ href, label, icon }) => (
            <NavLink key={href} href={href} label={label} icon={icon} active={pathname === href} />
          ))}

          {/* Scoped Cafe Links */}
          {user?.role === "CAFE_OWNER" && user.scopes.map((scope, idx) => (
            <div key={`cafe-${idx}`} style={{ marginTop: 16 }}>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                padding: "0 14px",
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}>
                <Coffee size={12} style={{ color: "var(--accent)" }} />
                <span>{scope.cafeName || `Café #${scope.cafeId}`}</span>
              </div>
              <NavLink
                href={`/cafes/${scope.cafeId}`}
                label="Overview"
                icon={Store}
                active={pathname === `/cafes/${scope.cafeId}`}
              />
              <NavLink
                href={`/cafes/${scope.cafeId}/branches`}
                label="Branches"
                icon={GitBranch}
                active={pathname === `/cafes/${scope.cafeId}/branches` || pathname.startsWith(`/cafes/${scope.cafeId}/branches/`)}
              />
              <NavLink
                href={`/cafes/${scope.cafeId}/menu`}
                label="Master Menu"
                icon={UtensilsCrossed}
                active={pathname.includes(`/cafes/${scope.cafeId}/menu`)}
              />
              <NavLink
                href={`/cafes/${scope.cafeId}/stocks`}
                label="Stocks"
                icon={Package}
                active={pathname === `/cafes/${scope.cafeId}/stocks` || pathname.startsWith(`/cafes/${scope.cafeId}/stocks/`)}
              />
              <NavLink
                href={`/cafes/${scope.cafeId}/orders`}
                label="Orders"
                icon={ShoppingCart}
                active={pathname === `/cafes/${scope.cafeId}/orders` || pathname.startsWith(`/cafes/${scope.cafeId}/orders/`)}
              />
              <NavLink
                href={`/cafes/${scope.cafeId}/staff`}
                label="Staff & Meetings"
                icon={Users}
                active={pathname.includes(`/cafes/${scope.cafeId}/staff`)}
              />
              <NavLink
                href={`/cafes/${scope.cafeId}/schedule`}
                label="AI Shifts & Peak Hours"
                icon={Calendar}
                active={pathname.includes(`/cafes/${scope.cafeId}/schedule`)}
              />
            </div>
          ))}

          {/* Scoped Branch Links */}
          {(user?.role === "BRANCH_MANAGER" || user?.role === "STAFF") && user.scopes.map((scope, idx) => (
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
                href={`/branches/${scope.branchId}/orders?cafeId=${scope.cafeId}`}
                label={user?.role === "STAFF" ? "Take Customer Order" : "Orders"}
                icon={ShoppingCart}
                active={pathname.includes(`/branches/${scope.branchId}/orders`)}
              />
              <NavLink
                href={`/branches/${scope.branchId}/kitchen?cafeId=${scope.cafeId}`}
                label="Kitchen KDS"
                icon={Flame}
                active={pathname.includes(`/branches/${scope.branchId}/kitchen`)}
              />
              {user?.role === "BRANCH_MANAGER" && (
                <NavLink
                  href={`/branches/${scope.branchId}/stock?cafeId=${scope.cafeId}`}
                  label="Stock & Inventory"
                  icon={Package}
                  active={pathname.includes(`/branches/${scope.branchId}/stock`)}
                />
              )}
              <NavLink
                href={`/branches/${scope.branchId}/schedule?cafeId=${scope.cafeId}`}
                label="AI Shifts & Peak Hours"
                icon={Calendar}
                active={pathname.includes(`/branches/${scope.branchId}/schedule`)}
              />
              <NavLink
                href={`/branches/${scope.branchId}/menu?cafeId=${scope.cafeId}`}
                label="Branch Menu"
                icon={UtensilsCrossed}
                active={pathname.includes(`/branches/${scope.branchId}/menu`)}
              />
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border)" }}>
          {user && (
            <div style={{ marginBottom: 8, overflow: "hidden" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.displayName?.trim() || user.email}
              </div>
              {user.displayName?.trim() && (
                <div style={{ fontSize: 11, color: "var(--text-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.email}
                </div>
              )}
            </div>
          )}
          
          <NavLink
            href="/settings"
            label="Settings"
            icon={Settings}
            active={pathname.includes("/settings")}
          />
          
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
      </aside>

      {/* Spacer */}
      <div style={{ width: open ? 240 : 0, flexShrink: 0, transition: "width 0.25s ease" }} />
    </>
  );
}
