"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, PanelRight, Sun, Moon } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useLayoutStore } from "@/lib/store";
import { useTheme } from "@/components/ThemeProvider";

// Converts a URL segment to a readable label
function segmentToLabel(segment: string): string {
  // If it's a numeric ID, show it as "#ID"
  if (/^\d+$/.test(segment)) return `#${segment}`;
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Build breadcrumb items from the current pathname
function useBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const crumbs = segments.map((seg, idx) => {
    const href = "/" + segments.slice(0, idx + 1).join("/");
    return { label: segmentToLabel(seg), href };
  });

  return crumbs;
}

// User avatar with initials
function UserAvatar({ email, role }: { email: string; role: string }) {
  const initials = email.slice(0, 2).toUpperCase();

  const roleColors: Record<string, { bg: string; color: string }> = {
    SUPER_ADMIN: { bg: "var(--danger-glow)", color: "var(--danger)" },
    CAFE_OWNER: { bg: "var(--warning-glow)", color: "var(--warning)" },
    BRANCH_MANAGER: { bg: "var(--info-glow)", color: "var(--info)" },
    STAFF: { bg: "var(--success-glow)", color: "var(--success)" },
  };
  const roleStyle = roleColors[role] || { bg: "var(--accent-muted)", color: "var(--text-muted)" };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {/* Role badge */}
      <span style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.04em",
        padding: "3px 10px",
        borderRadius: 99,
        background: roleStyle.bg,
        color: roleStyle.color,
        border: `1px solid ${roleStyle.color}33`,
        whiteSpace: "nowrap",
      }}>
        {role.replace(/_/g, " ")}
      </span>

      {/* Avatar circle */}
      <div style={{
        width: 34,
        height: 34,
        borderRadius: "50%",
        background: "var(--accent)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: 13,
        color: "#0f172a",
        flexShrink: 0,
        cursor: "default",
        boxShadow: "0 0 0 2px var(--bg-card), 0 0 0 4px var(--accent-glow)",
      }}
        title={email}
      >
        {initials}
      </div>
    </div>
  );
}

export default function Topbar() {
  const crumbs = useBreadcrumbs();
  const { data: user } = useCurrentUser();
  const toggleChatbot = useLayoutStore((s) => s.toggleChatbot);
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="topbar">
      {/* Breadcrumb */}
      <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <Link
          href="/dashboard"
          style={{
            fontSize: 13,
            color: "var(--text-faint)",
            textDecoration: "none",
            transition: "color 0.15s",
            fontWeight: 500,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--text-muted)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-faint)")}
        >
          Home
        </Link>

        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          return (
            <span key={crumb.href} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <ChevronRight size={13} style={{ color: "var(--text-faint)", flexShrink: 0 }} />
              {isLast ? (
                <span style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                }}>
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  style={{
                    fontSize: 13,
                    color: "var(--text-faint)",
                    textDecoration: "none",
                    transition: "color 0.15s",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--text-muted)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--text-faint)")}
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>

      {/* Right side — user identity & toggles */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={toggleTheme}
          style={{
            padding: "6px",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.background = "var(--bg-surface)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "transparent"; }}
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          onClick={toggleChatbot}
          style={{
            padding: "6px",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.background = "var(--bg-surface)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "transparent"; }}
          title="Toggle Assistant"
        >
          <PanelRight size={18} />
        </button>
        {user && (
          <Link href="/settings" style={{ textDecoration: "none" }}>
            <UserAvatar email={user.email} role={user.role} />
          </Link>
        )}
      </div>
    </header>
  );
}
