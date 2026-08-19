"use client";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, GitBranch } from "lucide-react";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/LoadingSkeleton";
import Link from "next/link";

interface LowStockAlertsProps {
  cafeId: number;
  cafeName: string;
}

import { Card } from "@/components/Card";

export function LowStockAlerts({ cafeId, cafeName }: LowStockAlertsProps) {
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["lowStockAlerts", cafeId],
    queryFn: () => api.get<any[]>(`/cafes/${cafeId}/low-stock-alerts`)
  });

  if (isLoading) return (
    <Card>
      <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>Low Stock Alerts</h3>
      <Skeleton height={60} />
    </Card>
  );

  if (alerts.length === 0) return null;

  return (
    <Card style={{ borderColor: "var(--warning-glow)" }}>
      <h3 style={{ margin: "0 0 16px", fontSize: 16, display: "flex", alignItems: "center", gap: 8, color: "var(--warning)" }}>
        <AlertCircle size={18} />
        Low Stock Alerts — {cafeName || `Café #${cafeId}`}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {alerts.map(alert => (
          <div key={alert.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, background: "var(--warning-glow)", borderRadius: 8 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{alert.masterItemName}</div>
              <div style={{ color: "var(--text-muted)", fontSize: 13, display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                <GitBranch size={12} /> {alert.branchName}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: alert.status.includes("Sold Out") ? "var(--danger)" : "var(--warning)", fontWeight: 700, fontSize: 14 }}>
                {alert.status}
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>
                Qty: {alert.availableQuantity ?? '0'} (Threshold: {alert.lowStockThreshold})
              </div>
            </div>
            <div style={{ marginLeft: 16 }}>
              <Link href={`/branches/${alert.branchId}/stock?cafeId=${cafeId}`} className="btn btn-ghost btn-sm" style={{ padding: "4px 8px", fontSize: 12 }}>
                Manage Stock
              </Link>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
