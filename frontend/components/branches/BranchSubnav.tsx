"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ShoppingCart,
  Flame,
  Package,
  Calendar,
  UtensilsCrossed,
  ArrowLeft,
} from "lucide-react";

interface BranchSubnavProps {
  branchId: number | string;
  cafeId?: number | string | null;
  branchName?: string | null;
}

export default function BranchSubnav({ branchId, cafeId: propCafeId, branchName }: BranchSubnavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const bId = String(branchId);
  const cafeId = propCafeId || searchParams.get("cafeId");
  const cafeQuery = cafeId ? `?cafeId=${cafeId}` : "";

  const tabs = [
    {
      href: `/branches/${bId}/orders${cafeQuery}`,
      label: "Orders",
      icon: ShoppingCart,
      isActive: pathname.includes(`/branches/${bId}/orders`),
    },
    {
      href: `/branches/${bId}/kitchen${cafeQuery}`,
      label: "Kitchen KDS",
      icon: Flame,
      isActive: pathname.includes(`/branches/${bId}/kitchen`),
    },
    {
      href: `/branches/${bId}/stock${cafeQuery}`,
      label: "Stock & Inventory",
      icon: Package,
      isActive: pathname.includes(`/branches/${bId}/stock`),
    },
    {
      href: `/branches/${bId}/schedule${cafeQuery}`,
      label: "AI Shifts & Peak",
      icon: Calendar,
      isActive: pathname.includes(`/branches/${bId}/schedule`),
    },
    {
      href: `/branches/${bId}/menu${cafeQuery}`,
      label: "Branch Menu",
      icon: UtensilsCrossed,
      isActive: pathname.includes(`/branches/${bId}/menu`),
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "4px 8px",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        marginBottom: 24,
        overflowX: "auto",
        scrollbarWidth: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {cafeId && (
          <Link
            href={`/cafes/${cafeId}/branches`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 12px",
              borderRadius: "var(--radius-md)",
              fontSize: 12,
              fontWeight: 600,
              textDecoration: "none",
              color: "var(--text-muted)",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              marginRight: 6,
            }}
            title="Return to Cafe Branches"
          >
            <ArrowLeft size={13} />
            <span>Café Hub</span>
          </Link>
        )}

        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.isActive;
          return (
            <Link
              key={tab.label}
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

      {branchName && (
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--text-muted)",
            paddingRight: 8,
            whiteSpace: "nowrap",
          }}
        >
          {branchName}
        </span>
      )}
    </div>
  );
}
