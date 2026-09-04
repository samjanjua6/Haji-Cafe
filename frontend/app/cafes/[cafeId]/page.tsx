"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/LoadingSkeleton";
import { HistoricalPredictionChart } from "@/components/analytics/HistoricalPredictionChart";

import CafeSubnav from "@/components/cafes/CafeSubnav";
import Link from "next/link";
import { GitBranch, UtensilsCrossed, Package, ShoppingCart, Users, Calendar } from "lucide-react";

interface Cafe {
  id: number;
  name: string;
  createdAt: string;
}

export default function CafeDetailPage() {
  const { cafeId } = useParams<{ cafeId: string }>();
  const router = useRouter();
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const c = await api.get<Cafe>(`/cafes/${cafeId}`);
      setCafe(c);
    } catch (e: any) {
      toast.error(e.message || "Failed to load café details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cafeId) load();
  }, [cafeId]);

  if (loading) {
    return (
      <div style={{ display: "grid", gap: 24 }}>
        {/* Header skeleton */}
        <div className="page-header">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton width={60} height={12} />
            <Skeleton width={200} height={26} />
            <Skeleton width={100} height={13} />
          </div>
        </div>
        {/* Chart skeleton */}
        <Skeleton height={320} borderRadius={12} />
      </div>
    );
  }

  const quickLinks = [
    { href: `/cafes/${cafeId}/branches`, label: "Branches", desc: "Manage branch outlets & locations", icon: GitBranch },
    { href: `/cafes/${cafeId}/menu`, label: "Master Menu", desc: "Global item catalog & pricing", icon: UtensilsCrossed },
    { href: `/cafes/${cafeId}/stocks`, label: "Stocks", desc: "Inventory & low stock alerts", icon: Package },
    { href: `/cafes/${cafeId}/orders`, label: "Orders", desc: "Live orders & receipt history", icon: ShoppingCart },
    { href: `/cafes/${cafeId}/staff`, label: "Staff & Team", desc: "Shift rosters & team meetings", icon: Users },
    { href: `/cafes/${cafeId}/schedule`, label: "AI Shifts", desc: "Smart shift & staffing optimizer", icon: Calendar },
  ];

  return (
    <div>
      <CafeSubnav cafeId={cafeId} cafeName={cafe?.name} />

      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <button
            onClick={() => router.back()}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 8,
              fontSize: 13,
              padding: 0,
            }}
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
          <div className="page-title">{cafe?.name}</div>
          <div className="page-subtitle">Café ID: #{cafeId} &bull; Enterprise Operations Hub</div>
        </div>
      </div>

      {/* Quick Access Module Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {quickLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "var(--accent-muted)",
                  color: "var(--accent)",
                }}
              >
                <Icon size={16} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>{item.label}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.3 }}>{item.desc}</div>
            </Link>
          );
        })}
      </div>

      {/* AI Historical Intelligence & Predictive Sales Forecasting Graph */}
      <div>
        <HistoricalPredictionChart cafeId={parseInt(cafeId)} cafeName={cafe?.name} />
      </div>
    </div>
  );
}
