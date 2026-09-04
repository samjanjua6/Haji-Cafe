"use client";
import { useRouter, useParams, useSearchParams, usePathname } from "next/navigation";
import { Plus, ArrowLeft } from "lucide-react";
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
import BranchSubnav from "@/components/branches/BranchSubnav";

export default function BranchOrdersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams<{ branchId: string }>();
  const queryClient = useQueryClient();
  const branchId = params.branchId;

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
      <BranchSubnav branchId={branchId} />
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
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
