"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { Order } from "@/types/order";
import { BranchMenuItem } from "@/types/menu";
import OrderTable from "@/components/orders/OrderTable";
import OrderModals from "@/components/orders/OrderModals";

export default function BranchOrdersPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const router = useRouter();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<BranchMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [placeModal, setPlaceModal] = useState(false);

  const load = async () => {
    try {
      const [o, m] = await Promise.all([
        api.get<Order[]>(`/branches/${branchId}/orders`),
        api.get<BranchMenuItem[]>(`/branches/${branchId}/menu`),
      ]);
      setOrders(o); 
      setMenuItems(m.filter(i => i.isInStock && i.isActive));
    } catch (e: any) { 
      toast.error(e.message); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { load(); }, [branchId]);

  const openDetail = async (order: Order) => {
    try {
      const data = await api.get<Order>(`/branches/${branchId}/orders/${order.id}`);
      setDetailOrder(data);
    } catch (e: any) { 
      toast.error(e.message); 
    }
  };

  const handleStatusChange = async (order: Order, newStatus: string) => {
    try {
      await api.patch(`/branches/${branchId}/orders/${order.id}/status`, { status: newStatus });
      toast.success(`Status → ${newStatus}`); 
      load();
      if (detailOrder?.id === order.id) {
        setDetailOrder({ ...detailOrder, status: newStatus as any });
      }
    } catch (e: any) { 
      toast.error(e.message); 
    }
  };

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
        loading={loading}
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
        onSuccess={load}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
