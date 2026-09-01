"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  ShoppingCart,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Order, OrdersResponse } from "@/types/order";
import { Skeleton } from "@/components/LoadingSkeleton";
import OrdersFilterBar from "@/components/orders/OrdersFilterBar";
import OrderTable from "@/components/orders/OrderTable";
import { ExportButtons } from "@/components/orders/ExportButtons";
import OrderReceiptModal from "@/components/orders/OrderReceiptModal";

interface Cafe {
  id: number;
  name: string;
}

interface Branch {
  id: number;
  name: string;
}

export default function CafeOrdersPage() {
  const { cafeId } = useParams<{ cafeId: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingCafe, setLoadingCafe] = useState(true);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);

  // Search parameters from URL
  const search = searchParams.get("search") || "";
  const statusFilter = searchParams.get("status") || "";
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";
  const filterBranchId = searchParams.get("branchId") || "";
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortDir = (searchParams.get("sortDir") as "asc" | "desc") || "desc";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = 25;

  const updateQueryParam = (key: string, value: string) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    if (value) current.set(key, value);
    else current.delete(key);

    if (key !== "page" && key !== "sortBy" && key !== "sortDir") {
      current.set("page", "1");
    }
    router.push(`${pathname}?${current.toString()}`, { scroll: false });
  };

  const clearFilters = () => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.delete("search");
    current.delete("status");
    current.delete("dateFrom");
    current.delete("dateTo");
    current.delete("branchId");
    current.set("page", "1");
    router.push(`${pathname}?${current.toString()}`, { scroll: false });
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      updateQueryParam("sortDir", sortDir === "asc" ? "desc" : "asc");
    } else {
      updateQueryParam("sortBy", field);
      updateQueryParam("sortDir", "desc");
    }
  };

  // Load Cafe and Branches metadata
  useEffect(() => {
    if (!cafeId) return;
    const loadMeta = async () => {
      try {
        const [c, b] = await Promise.all([
          api.get<Cafe>(`/cafes/${cafeId}`),
          api.get<Branch[]>(`/cafes/${cafeId}/branches`),
        ]);
        setCafe(c);
        setBranches(b);
      } catch (e: any) {
        toast.error(e.message || "Failed to load cafe details");
      } finally {
        setLoadingCafe(false);
      }
    };
    loadMeta();
  }, [cafeId]);

  // Fetch paginated Orders using React Query
  const { data: ordersData, isLoading: loadingOrders, refetch, isFetching } = useQuery({
    queryKey: ["cafe-orders", cafeId, search, statusFilter, dateFrom, dateTo, filterBranchId, sortBy, sortDir, page],
    queryFn: () => {
      const q = new URLSearchParams();
      q.set("page", page.toString());
      q.set("limit", limit.toString());
      if (search) q.set("search", search);
      if (statusFilter) q.set("status", statusFilter);
      if (dateFrom) q.set("dateFrom", dateFrom);
      if (dateTo) q.set("dateTo", dateTo);
      if (filterBranchId) q.set("branchId", filterBranchId);
      q.set("sortBy", sortBy);
      q.set("sortDir", sortDir);
      return api.get<OrdersResponse>(`/cafes/${cafeId}/orders?${q.toString()}`);
    },
    enabled: !!cafeId,
  });

  const ordersList = ordersData?.data || [];
  const meta = ordersData?.meta || { total: 0, skip: 0, take: 0 };
  const hasFiltersActive = !!(search || statusFilter || dateFrom || dateTo || filterBranchId);
  const totalPages = Math.ceil(meta.total / limit);

  // Status transitions
  const handleStatusChange = async (order: Order, newStatus: string) => {
    try {
      await api.patch(`/branches/${order.branchId}/orders/${order.id}/status`, { status: newStatus });
      toast.success(`Order #${order.id} status updated to ${newStatus.replace(/_/g, " ")}`);
      queryClient.invalidateQueries({ queryKey: ["cafe-orders"] });
      if (detailOrder && detailOrder.id === order.id) {
        setDetailOrder({ ...detailOrder, status: newStatus as any });
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to update order status");
    }
  };

  if (loadingCafe && !ordersData) {
    return (
      <div style={{ display: "grid", gap: 24 }}>
        <div className="page-header">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton width={100} height={14} />
            <Skeleton width={240} height={30} />
            <Skeleton width={160} height={14} />
          </div>
          <Skeleton width={36} height={36} borderRadius={8} />
        </div>

        <Skeleton height={50} borderRadius={10} />

        <div className="card">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr 1fr", gap: 16, padding: "14px 0", borderBottom: "1px solid var(--border-subtle)" }}>
              <Skeleton width="60%" height={16} />
              <Skeleton width="50%" height={16} />
              <Skeleton width="40%" height={20} borderRadius={99} />
              <Skeleton width="30%" height={16} />
              <Skeleton width="70%" height={16} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="page-header" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <button
            onClick={() => router.push(`/cafes/${cafeId}`)}
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
            <ArrowLeft size={14} /> Back to Overview
          </button>
          <div className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            Orders Management
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              title="Refresh orders data"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
                display: "flex",
                padding: 4,
                borderRadius: 6,
                transition: "color 0.15s, background 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text-primary)";
                e.currentTarget.style.background = "var(--bg-surface)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-muted)";
                e.currentTarget.style.background = "none";
              }}
            >
              <RefreshCw size={16} style={{ animation: isFetching ? "spin 1s linear infinite" : "none" }} />
            </button>
          </div>
          <div className="page-subtitle">
            Café: <strong style={{ color: "var(--text-primary)" }}>{cafe?.name}</strong>{" "}
            <span style={{ color: "var(--text-faint)", fontSize: 12 }}>(#{cafeId})</span>
          </div>
        </div>
      </div>

      {/* ── Header Title & Export Buttons ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
          <ShoppingCart size={16} style={{ marginRight: 8, display: "inline" }} />
          All Orders — Showing {ordersList.length} of {meta.total}
        </h3>
        <ExportButtons orders={ordersList as any} cafeId={cafeId as string} disabled={loadingOrders || isFetching} />
      </div>

      {/* ── Filter Toolbar ── */}
      <OrdersFilterBar
        search={search}
        status={statusFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        branchId={filterBranchId}
        onFilterChange={updateQueryParam}
        onClearFilters={clearFilters}
        showBranchFilter={true}
        branches={branches}
      />

      {/* ── Orders Table ── */}
      <OrderTable
        orders={ordersList as any}
        loading={loadingOrders}
        branchMode={false}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        hasFiltersActive={hasFiltersActive}
        onClearFilters={clearFilters}
        onOpenDetail={(order) => setDetailOrder(order)}
        onStatusChange={handleStatusChange}
      />

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginTop: 24, marginBottom: 40 }}>
          <button
            className="btn btn-secondary"
            disabled={page <= 1 || loadingOrders}
            onClick={() => updateQueryParam("page", String(page - 1))}
          >
            Previous
          </button>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-secondary"
            disabled={page >= totalPages || loadingOrders}
            onClick={() => updateQueryParam("page", String(page + 1))}
          >
            Next
          </button>
        </div>
      )}

      {/* ── Order Detail & Printable Receipt Modal ── */}
      <OrderReceiptModal
        order={detailOrder}
        cafeName={cafe?.name}
        onClose={() => setDetailOrder(null)}
      />
    </div>
  );
}
