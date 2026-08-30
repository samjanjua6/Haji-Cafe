"use client";
import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, PackageX, GitBranch } from "lucide-react";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/LoadingSkeleton";
import Link from "next/link";
import { Card } from "@/components/Card";

interface LowStockAlertsProps {
  cafeId: number;
  cafeName: string;
}

export function LowStockAlerts({ cafeId, cafeName }: LowStockAlertsProps) {
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["lowStockAlerts", cafeId],
    queryFn: () => api.get<any[]>(`/cafes/${cafeId}/low-stock-alerts`),
  });

  const { outOfStockItems, lowStockItems } = useMemo(() => {
    const outItems: any[] = [];
    const lowItems: any[] = [];
    for (const alert of alerts) {
      if (alert.availableQuantity === 0 || alert.status?.includes("Sold Out")) {
        outItems.push(alert);
      } else {
        lowItems.push(alert);
      }
    }
    return { outOfStockItems: outItems, lowStockItems: lowItems };
  }, [alerts]);

  if (isLoading)
    return (
      <Card>
        <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>Inventory Alerts</h3>
        <Skeleton height={60} />
      </Card>
    );

  if (alerts.length === 0) return null;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* 1. OUT OF STOCK (SOLD OUT) SECTION */}
      {outOfStockItems.length > 0 && (
        <Card style={{ borderColor: "rgba(239, 68, 68, 0.4)", background: "rgba(239, 68, 68, 0.02)" }}>
          <h3
            style={{
              margin: "0 0 14px",
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "var(--danger)",
              fontWeight: 700,
            }}
          >
            <PackageX size={19} />
            Out of Stock (Sold Out) — {cafeName || `Café #${cafeId}`}
            <span
              style={{
                fontSize: 12,
                background: "var(--danger-glow)",
                color: "var(--danger)",
                padding: "2px 8px",
                borderRadius: 99,
                fontWeight: 700,
                marginLeft: "auto",
              }}
            >
              {outOfStockItems.length} {outOfStockItems.length === 1 ? "Item" : "Items"}
            </span>
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {outOfStockItems.map((alert) => (
              <div
                key={alert.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 12,
                  background: "var(--danger-glow)",
                  borderRadius: 8,
                  border: "1px solid rgba(239, 68, 68, 0.15)",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{alert.masterItemName}</div>
                  <div
                    style={{
                      color: "var(--text-muted)",
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      marginTop: 4,
                    }}
                  >
                    <GitBranch size={12} /> {alert.branchName}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "var(--danger)", fontWeight: 700, fontSize: 14 }}>
                    {alert.status}
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>
                    Qty: {alert.availableQuantity ?? "0"} (Threshold: {alert.lowStockThreshold})
                  </div>
                </div>
                <div style={{ marginLeft: 16 }}>
                  <Link
                    href={`/branches/${alert.branchId}/stock?cafeId=${cafeId}`}
                    className="btn btn-ghost btn-sm"
                    style={{ padding: "4px 8px", fontSize: 12, color: "var(--danger)" }}
                  >
                    Restock
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 2. LOW STOCK SECTION */}
      {lowStockItems.length > 0 && (
        <Card style={{ borderColor: "var(--warning-glow)", background: "rgba(245, 158, 11, 0.02)" }}>
          <h3
            style={{
              margin: "0 0 14px",
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "var(--warning)",
              fontWeight: 700,
            }}
          >
            <AlertTriangle size={19} />
            Low Stock Alerts — {cafeName || `Café #${cafeId}`}
            <span
              style={{
                fontSize: 12,
                background: "var(--warning-glow)",
                color: "var(--warning)",
                padding: "2px 8px",
                borderRadius: 99,
                fontWeight: 700,
                marginLeft: "auto",
              }}
            >
              {lowStockItems.length} {lowStockItems.length === 1 ? "Item" : "Items"}
            </span>
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {lowStockItems.map((alert) => (
              <div
                key={alert.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 12,
                  background: "var(--warning-glow)",
                  borderRadius: 8,
                  border: "1px solid rgba(245, 158, 11, 0.15)",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{alert.masterItemName}</div>
                  <div
                    style={{
                      color: "var(--text-muted)",
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      marginTop: 4,
                    }}
                  >
                    <GitBranch size={12} /> {alert.branchName}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "var(--warning)", fontWeight: 700, fontSize: 14 }}>
                    {alert.status}
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>
                    Qty: {alert.availableQuantity ?? "0"} (Threshold: {alert.lowStockThreshold})
                  </div>
                </div>
                <div style={{ marginLeft: 16 }}>
                  <Link
                    href={`/branches/${alert.branchId}/stock?cafeId=${cafeId}`}
                    className="btn btn-ghost btn-sm"
                    style={{ padding: "4px 8px", fontSize: 12, color: "var(--warning)" }}
                  >
                    Manage Stock
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
