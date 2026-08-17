"use client";
import { useRouter } from "next/navigation";
import { Plus, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { Order } from "@/types/order";
import { BranchMenuItem } from "@/types/menu";
import OrderTable from "@/components/orders/OrderTable";
import OrderModals from "@/components/orders/OrderModals";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export default function BranchOrdersPage({ params }: { params: { branchId: string } }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const branchId = params.branchId;
  
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [placeModal, setPlaceModal] = useState(false);

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ["orders", branchId],
    queryFn: () => api.get<Order[]>(`/branches/${branchId}/orders`)
  });

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
          <div className="page-subtitle">Branch #{branchId} — {orders.length} orders</div>
        </div>
        <button className="btn btn-primary" onClick={() => setPlaceModal(true)}>
          <Plus size={16} /> Place Order
        </button>
      </div>

      <OrderTable 
        orders={orders}
        loading={isLoading}
        onOpenDetail={openDetail}
        onStatusChange={handleStatusChange}
      />

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
