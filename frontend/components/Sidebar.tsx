"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Coffee, LayoutDashboard, Store, GitBranch,
  ShoppingCart, LogOut, Menu, X
} from "lucide-react";
import { useState } from "react";
import { auth } from "@/lib/auth";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/cafes", label: "Cafés", icon: Store },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(true);

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
              <div style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>Admin Dashboard</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
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
