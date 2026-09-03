"use client";
import { useRouter, useParams, useSearchParams, usePathname } from "next/navigation";
import { Plus, ArrowLeft, Flame, TrendingUp, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { Order, OrdersResponse } from "@/types/order";
import { BranchMenuItem } from "@/types/menu";
import OrderTable from "@/components/orders/OrderTable";
import OrderModals from "@/components/orders/OrderModals";
import OrdersFilterBar from "@/components/orders/OrdersFilterBar";
import { ExportButtons } from "@/components/orders/ExportButtons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback, useEffect } from "react";
import SplinePeakChart from "@/components/charts/SplinePeakChart";
import WeeklyRushHeatmap from "@/components/charts/WeeklyRushHeatmap";
import { Card } from "@/components/Card";

export default function BranchOrdersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams<{ branchId: string }>();
  const queryClient = useQueryClient();
  const branchId = params.branchId;

  const [showHeatmapSection, setShowHeatmapSection] = useState(true);
  const [orderChartType, setOrderChartType] = useState<"HEATMAP" | "SPLINE" | "HISTOGRAM">("HEATMAP");

  const { data: peakDataRes, isLoading: loadingPeaks } = useQuery({
    queryKey: ["branch-peaks", branchId],
    queryFn: () => api.get<{ status: string; data: any }>(`/scheduling/peak-hours?branch_id=${branchId}`),
    enabled: !!branchId,
  });
  const peakData = peakDataRes?.data;
  const peakHours = peakData?.operating_hours || [];
  const maxPeakOrders = peakHours.length > 0 ? Math.max(...peakHours.map((h: any) => h.total_orders)) : 1;

  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortDir = (searchParams.get("sortDir") as "asc" | "desc") || "desc";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = 25;

  const updateQueryParam = useCallback(
    (key: string, value: string) => {
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      if (value) {
        current.set(key, value);
      } else {
        current.delete(key);
      }
      // Reset page to 1 when filters change (unless the key is page or sort)
      if (key !== "page" && key !== "sortBy" && key !== "sortDir") {
        current.set("page", "1");
      }
      router.push(`${pathname}?${current.toString()}`);
    },
    [searchParams, pathname, router]
  );

  const clearFilters = useCallback(() => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.delete("search");
    current.delete("status");
    current.delete("dateFrom");
    current.delete("dateTo");
    current.set("page", "1");
    router.push(`${pathname}?${current.toString()}`);
  }, [searchParams, pathname, router]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      updateQueryParam("sortDir", sortDir === "asc" ? "desc" : "asc");
    } else {
      updateQueryParam("sortBy", field);
      updateQueryParam("sortDir", "desc");
    }
  };

  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [placeModal, setPlaceModal] = useState(false);

  useEffect(() => {
    if (searchParams.get("takeOrder") === "true") {
      setPlaceModal(true);
    }
  }, [searchParams]);

  const { data, isLoading: loadingOrders } = useQuery({
    queryKey: ["orders", branchId, search, status, dateFrom, dateTo, sortBy, sortDir, page],
    queryFn: () => {
      const q = new URLSearchParams();
      q.set("page", page.toString());
      q.set("limit", limit.toString());
      if (search) q.set("search", search);
      if (status) q.set("status", status);
      if (dateFrom) q.set("dateFrom", dateFrom);
      if (dateTo) q.set("dateTo", dateTo);
      q.set("sortBy", sortBy);
      q.set("sortDir", sortDir);
      return api.get<OrdersResponse>(`/branches/${branchId}/orders?${q.toString()}`);
    }
  });

  const orders = data?.data || [];
  const meta = data?.meta || { total: 0, skip: 0, take: 0 };
  const hasFiltersActive = !!(search || status || dateFrom || dateTo);
  const totalPages = Math.ceil(meta.total / limit);

  const { data: menuItems = [], isLoading: loadingMenu } = useQuery({
    queryKey: ["menu", branchId],
    queryFn: async () => {
      const data = await api.get<BranchMenuItem[]>(`/branches/${branchId}/menu`);
      return data.filter(i => i.isInStock && i.isActive);
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: number, status: string }) => 
      api.patch(`/branches/${branchId}/orders/${orderId}/status`, { status }),
    onSuccess: (_, variables) => {
      toast.success(`Status → ${variables.status}`); 
      queryClient.invalidateQueries({ queryKey: ["orders", branchId] });
      if (detailOrder?.id === variables.orderId) {
        setDetailOrder({ ...detailOrder, status: variables.status as any });
      }
    },
    onError: (e: any) => toast.error(e.message)
  });

  const openDetail = async (order: Order) => {
    try {
      const data = await api.get<Order>(`/branches/${branchId}/orders/${order.id}`);
      setDetailOrder(data);
    } catch (e: any) { 
      toast.error(e.message); 
    }
  };

  const handleStatusChange = (order: Order, newStatus: string) => {
    statusMutation.mutate({ orderId: order.id, status: newStatus });
  };

  const isLoading = loadingOrders || loadingMenu;

  return (
    <div>
      <div className="page-header">
        <div>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 13 }}>
            <ArrowLeft size={14} /> Back
          </button>
          <div className="page-title">Branch Orders</div>
          <div className="page-subtitle" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>Branch #{branchId} — Showing {orders.length} of {meta.total} orders</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--success)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--success)", boxShadow: "0 0 6px var(--success)" }} />
              Live Synced
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => router.push(`/branches/${branchId}/schedule?cafeId=${searchParams.get("cafeId") || ""}`)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontWeight: 600,
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              color: "var(--accent)",
            }}
            title="Open AI Peak Hours, 7x24 Heatmap & Staff Scheduling"
          >
            <Flame size={14} color="var(--accent)" />
            AI Peak Hours & Heatmap
          </button>
          <ExportButtons orders={orders} branchId={branchId as string} disabled={isLoading} />
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setPlaceModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "var(--bg-surface)",
              color: "var(--accent)",
              border: "1px solid var(--accent)",
              fontWeight: 600,
            }}
            title="Create a new customer order"
          >
            <Plus size={14} />
            Take Customer Order
          </button>
        </div>
      </div>

      {/* 2. Embedded AI Peak Hours & 7x24 Customer Traffic Heatmap for Branch Manager */}
      <Card style={{ marginBottom: 20, padding: "18px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showHeatmapSection ? 16 : 0, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                background: "var(--accent-glow)",
                borderRadius: 10,
                padding: 10,
                color: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TrendingUp size={20} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                <span>Branch #{branchId} AI Peak Demand & 7×24 Heatmap</span>
                <span className="badge" style={{ background: "var(--accent-glow)", color: "var(--accent)", fontSize: 11 }}>
                  <Sparkles size={11} style={{ marginRight: 3, display: "inline" }} /> Erlang-C Live
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                Live hourly traffic velocity, rush congestion hotspots, gross profit margins, and staffing requirements.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {showHeatmapSection && (
              <div style={{ display: "flex", gap: 4, background: "var(--bg-surface)", padding: 3, borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                <button
                  className={`btn btn-sm ${orderChartType === "HEATMAP" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setOrderChartType("HEATMAP")}
                  style={{ padding: "4px 10px", fontSize: 12, fontWeight: 700 }}
                >
                  🔥 7×24 Heatmap
                </button>
                <button
                  className={`btn btn-sm ${orderChartType === "SPLINE" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setOrderChartType("SPLINE")}
                  style={{ padding: "4px 10px", fontSize: 12, fontWeight: 700 }}
                >
                  📈 Spline Curve
                </button>
                <button
                  className={`btn btn-sm ${orderChartType === "HISTOGRAM" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setOrderChartType("HISTOGRAM")}
                  style={{ padding: "4px 10px", fontSize: 12, fontWeight: 700 }}
                >
                  📊 Columns
                </button>
              </div>
            )}

            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowHeatmapSection(!showHeatmapSection)}
              style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}
            >
              {showHeatmapSection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {showHeatmapSection ? "Hide" : "Show Analytics"}
            </button>
          </div>
        </div>

        {showHeatmapSection && (
          <div>
            {/* Financial Efficiency & Profit Margin Strip */}
            {peakData?.financial_summary && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                  background: "rgba(16, 185, 129, 0.06)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  borderRadius: "var(--radius-md)",
                  padding: "8px 14px",
                  marginBottom: 14,
                  fontSize: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#10b981", fontWeight: 700 }}>
                  <span>💰 Financial & Labor Efficiency:</span>
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", color: "var(--text-primary)" }}>
                  <span>
                    Daily Projected Rev: <strong style={{ color: "#10b981" }}>${peakData.financial_summary.daily_projected_revenue.toFixed(2)}</strong>
                  </span>
                  <span>
                    Labor Cost: <strong style={{ color: "var(--accent)" }}>${peakData.financial_summary.daily_projected_labor_cost.toFixed(2)}</strong> ($15/hr)
                  </span>
                  <span>
                    Net Labor Profit: <strong style={{ color: "#10b981" }}>${peakData.financial_summary.daily_projected_net_profit.toFixed(2)}</strong>
                  </span>
                  <span
                    style={{
                      background: "rgba(16, 185, 129, 0.15)",
                      color: "#10b981",
                      padding: "2px 8px",
                      borderRadius: "var(--radius-sm)",
                      fontWeight: 800,
                    }}
                  >
                    Overall Margin: {peakData.financial_summary.overall_profit_margin_percent}% 🟢
                  </span>
                </div>
              </div>
            )}

            {/* Dynamic Chart Display directly inside Branch Orders Dashboard */}
            {orderChartType === "HEATMAP" ? (
              <WeeklyRushHeatmap
                heatmapData={peakData?.weekly_heatmap || []}
                topPeaks={peakData?.top_weekly_peaks || []}
                isLoading={loadingPeaks}
              />
            ) : orderChartType === "SPLINE" ? (
              <SplinePeakChart hours={peakHours} maxOrders={maxPeakOrders} />
            ) : (
              <div>
                {/* Histogram Bars */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${peakHours.length || 16}, 1fr)`,
                    gap: 6,
                    alignItems: "flex-end",
                    height: 180,
                    paddingTop: 20,
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  {peakHours.map((h: any) => {
                    const heightPercent = maxPeakOrders > 0 ? Math.max(12, Math.round((h.total_orders / maxPeakOrders) * 100)) : 12;
                    const isPeak = h.rush_category === "PEAK_RUSH" || heightPercent >= 70 || h.total_orders >= 160;
                    const isMod = !isPeak && (h.rush_category === "MODERATE" || heightPercent >= 45 || h.total_orders >= 95);

                    let barBg = "var(--bg-surface)";
                    let barBorder = "1px solid var(--border)";
                    let labelColor = "var(--text-muted)";
                    let staffCount = h.recommended_staff || 1;

                    if (isPeak) {
                      barBg = "linear-gradient(180deg, #f59e0b 0%, #d97706 100%)";
                      barBorder = "1px solid #f59e0b";
                      labelColor = "#f59e0b";
                    } else if (isMod) {
                      barBg = "linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)";
                      barBorder = "1px solid #3b82f6";
                      labelColor = "#3b82f6";
                    }

                    return (
                      <div
                        key={h.hour}
                        title={`${h.label}: ${h.total_orders} Total Orders\nErlang-C Staff Required: ${staffCount} servers\nEstimated Revenue: $${(h.estimated_hourly_revenue || h.hourly_revenue || 0).toFixed(2)}\nProfit Margin: ${h.profit_margin_percent || 80}%`}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          height: "100%",
                          justifyContent: "flex-end",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 800, color: labelColor, marginBottom: 4 }}>
                          {staffCount}p
                        </div>
                        <div
                          style={{
                            width: "100%",
                            height: `${heightPercent}%`,
                            background: barBg,
                            border: barBorder,
                            borderRadius: "5px 5px 0 0",
                            boxShadow: isPeak ? "0 2px 8px rgba(245, 158, 11, 0.3)" : (isMod ? "0 2px 8px rgba(59, 130, 246, 0.25)" : "none"),
                            transition: "all 0.25s ease",
                          }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* X-Axis Hour Labels & Database Order Counts */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${peakHours.length || 16}, 1fr)`,
                    gap: 6,
                    paddingTop: 8,
                    textAlign: "center",
                  }}
                >
                  {peakHours.map((h: any) => (
                    <div key={h.hour} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: "var(--text-primary)", fontWeight: 700 }}>
                        {h.label}
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          color: h.rush_category === "PEAK_RUSH" ? "var(--accent)" : "var(--text-muted)",
                          fontWeight: 600,
                          marginTop: 2,
                        }}
                      >
                        {h.total_orders} orders
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      <OrdersFilterBar 
        search={search}
        status={status}
        dateFrom={dateFrom}
        dateTo={dateTo}
        branchId="" // Not used here
        onFilterChange={updateQueryParam}
        onClearFilters={clearFilters}
      />

      <OrderTable 
        orders={orders}
        loading={isLoading}
        onOpenDetail={openDetail}
        onStatusChange={handleStatusChange}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        hasFiltersActive={hasFiltersActive}
        onClearFilters={clearFilters}
      />

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginTop: 24 }}>
          <button 
            className="btn btn-secondary" 
            disabled={page <= 1} 
            onClick={() => updateQueryParam("page", String(page - 1))}
          >
            Previous
          </button>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Page {page} of {totalPages}
          </span>
          <button 
            className="btn btn-secondary" 
            disabled={page >= totalPages} 
            onClick={() => updateQueryParam("page", String(page + 1))}
          >
            Next
          </button>
        </div>
      )}

      <OrderModals 
        branchId={branchId as string}
        detailOrder={detailOrder}
        setDetailOrder={setDetailOrder}
        placeModal={placeModal}
        setPlaceModal={setPlaceModal}
        menuItems={menuItems}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["orders", branchId] })}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
