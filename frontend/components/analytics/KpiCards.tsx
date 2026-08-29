"use client";

import React, { useMemo } from "react";
import { DollarSign, ShoppingCart, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Card } from "@/components/Card";
import { Skeleton } from "@/components/LoadingSkeleton";

interface KPISummaryResponse {
  today_revenue: number;
  today_orders: number;
  yesterday_revenue: number;
  yesterday_orders: number;
  rev_growth_pct: number;
  orders_growth_pct: number;
  avg_order_value: number;
  active_orders_count: number;
  completed_orders_total: number;
  low_stock_items_count: number;
  top_selling_item: string;
  top_selling_category: string;
  customer_satisfaction_score: number;
}

function GrowthBadge({ pct }: { pct: number }) {
  const isPositive = pct >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const sign = isPositive ? "+" : "";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 12,
        fontWeight: 700,
        color: isPositive ? "var(--success)" : "var(--danger)",
        background: isPositive ? "var(--success-glow)" : "var(--danger-glow)",
        padding: "2px 8px",
        borderRadius: 99,
      }}
    >
      <Icon size={11} />
      {sign}{pct.toFixed(1)}% vs yesterday
    </span>
  );
}

interface KpiCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  value: string;
  badge?: React.ReactNode;
  subtitle?: string;
  loading: boolean;
}

function KpiCard({ icon, iconBg, title, value, badge, subtitle, loading }: KpiCardProps) {
  if (loading) {
    return (
      <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Skeleton width={44} height={44} borderRadius={10} />
          <Skeleton width="50%" height={13} />
        </div>
        <Skeleton width="60%" height={32} />
        <Skeleton width="70%" height={12} />
      </Card>
    );
  }

  return (
    <Card
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--accent)";
        e.currentTarget.style.boxShadow = "var(--shadow-md)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: iconBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {title}
        </span>
      </div>

      <div
        style={{
          fontSize: 32,
          fontWeight: 800,
          color: "var(--text-primary)",
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>

      <div style={{ minHeight: 22 }}>
        {badge ? badge : (
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{subtitle}</span>
        )}
      </div>
    </Card>
  );
}

export function KpiCards() {
  const { data: user } = useCurrentUser();

  const kpiQueryParam = useMemo(() => {
    if (!user) return null;
    if (user.role === "BRANCH_MANAGER" && user.scopes[0]?.branchId) {
      return "?branch_id=" + user.scopes[0].branchId;
    }
    if (
      (user.role === "CAFE_OWNER" || user.role === "SUPER_ADMIN") &&
      user.scopes[0]?.cafeId
    ) {
      return "?cafe_id=" + user.scopes[0].cafeId;
    }
    return "";
  }, [user]);

  const { data: kpis, isLoading } = useQuery<KPISummaryResponse>({
    queryKey: ["kpis", kpiQueryParam],
    queryFn: () => api.get<KPISummaryResponse>("/analytics/kpis" + (kpiQueryParam ?? "")),
    enabled: kpiQueryParam !== null,
    staleTime: 1000 * 60,
    retry: false,
  });

  if (user?.role === "STAFF") return null;

  const loading = isLoading || !kpis;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 16,
      }}
    >
      <KpiCard
        loading={loading}
        icon={<DollarSign size={22} color="var(--accent)" />}
        iconBg="var(--accent-muted)"
        title="Today's Revenue"
        value={kpis ? "$" + kpis.today_revenue.toFixed(2) : "--"}
        badge={kpis ? <GrowthBadge pct={kpis.rev_growth_pct} /> : undefined}
      />

      <KpiCard
        loading={loading}
        icon={<ShoppingCart size={22} color="var(--info)" />}
        iconBg="var(--info-glow)"
        title="Active Orders"
        value={kpis ? String(kpis.active_orders_count) : "--"}
        subtitle={kpis ? "of " + kpis.today_orders + " orders today" : undefined}
      />

      <KpiCard
        loading={loading}
        icon={<AlertTriangle size={22} color="var(--danger)" />}
        iconBg="var(--danger-glow)"
        title="Low Stock Items"
        value={kpis ? String(kpis.low_stock_items_count) : "--"}
        subtitle={
          kpis
            ? kpis.low_stock_items_count === 0
              ? "All items well stocked"
              : "items need restocking"
            : undefined
        }
      />
    </div>
  );
}