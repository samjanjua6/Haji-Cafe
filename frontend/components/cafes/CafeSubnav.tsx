"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Store,
  GitBranch,
  UtensilsCrossed,
  Package,
  ShoppingCart,
  Users,
  Calendar,
} from "lucide-react";

interface CafeSubnavProps {
  cafeId: number | string;
  cafeName?: string;
}

export default function CafeSubnav({ cafeId, cafeName }: CafeSubnavProps) {
  const pathname = usePathname();
  const cId = String(cafeId);

  const tabs = [
    {
      href: `/cafes/${cId}`,
      label: "Overview",
      icon: Store,
      isActive: pathname === `/cafes/${cId}`,
    },
    {
      href: `/cafes/${cId}/branches`,
      label: "Branches",
      icon: GitBranch,
      isActive: pathname.startsWith(`/cafes/${cId}/branches`),
    },
    {
      href: `/cafes/${cId}/menu`,
      label: "Master Menu",
      icon: UtensilsCrossed,
      isActive: pathname.startsWith(`/cafes/${cId}/menu`),
    },
    {
      href: `/cafes/${cId}/stocks`,
      label: "Stocks & Inventory",
      icon: Package,
      isActive: pathname.startsWith(`/cafes/${cId}/stocks`),
    },
    {
      href: `/cafes/${cId}/orders`,
      label: "Orders",
      icon: ShoppingCart,
      isActive: pathname.startsWith(`/cafes/${cId}/orders`),
    },
    {
      href: `/cafes/${cId}/staff`,
      label: "Staff & Team",
      icon: Users,
      isActive: pathname.startsWith(`/cafes/${cId}/staff`),
    },
    {
      href: `/cafes/${cId}/schedule`,
      label: "AI Shifts & Peak",
      icon: Calendar,
      isActive: pathname.startsWith(`/cafes/${cId}/schedule`),
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        marginBottom: 24,
        overflowX: "auto",
        scrollbarWidth: "none",
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.isActive;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              borderRadius: "var(--radius-md)",
              fontSize: 13,
              fontWeight: active ? 700 : 500,
              textDecoration: "none",
              whiteSpace: "nowrap",
              color: active ? "var(--accent)" : "var(--text-muted)",
              background: active ? "var(--accent-muted)" : "transparent",
              border: active ? "1px solid var(--accent-glow)" : "1px solid transparent",
              transition: "all 0.15s ease",
            }}
          >
            <Icon size={15} style={{ color: active ? "var(--accent)" : "inherit" }} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
