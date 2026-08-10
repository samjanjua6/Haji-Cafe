"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, ArrowLeft, Eye, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import Modal from "@/components/Modal";
import StatusBadge from "@/components/StatusBadge";
import toast from "react-hot-toast";

interface OrderItem { id: number; quantity: number; priceAtPurchase: number; notes: string | null; branchMenuItem: { masterItem: { name: string } }; }
interface Order { id: number; status: string; totalAmount: number; createdAt: string; orderItems?: OrderItem[]; }
interface BranchMenuItem { id: number; isInStock: boolean; isActive: boolean; effectivePrice: number; masterItem: { name: string }; }

const STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["IN_PREPARATION", "CANCELLED"],
  IN_PREPARATION: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export default function BranchOrdersPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<BranchMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [placeModal, setPlaceModal] = useState(false);
  const [orderLines, setOrderLines] = useState<{ branchMenuItemId: string; quantity: number; notes: string }[]>([
    { branchMenuItemId: "", quantity: 1, notes: "" }
  ]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [o, m] = await Promise.all([
        api.get<Order[]>(`/branches/${branchId}/orders`),
        api.get<BranchMenuItem[]>(`/branches/${branchId}/menu`),
      ]);
      setOrders(o); setMenuItems(m.filter(i => i.isInStock && i.isActive));
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [branchId]);

  const openDetail = async (order: Order) => {
    try {
      const data = await api.get<Order>(`/branches/${branchId}/orders/${order.id}`);
      setDetailOrder(data);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleStatusChange = async (order: Order, newStatus: string) => {
    try {
      await api.patch(`/branches/${branchId}/orders/${order.id}/status`, { status: newStatus });
      toast.success(`Status → ${newStatus}`); load();
      if (detailOrder?.id === order.id) setDetailOrder({ ...detailOrder, status: newStatus });
    } catch (e: any) { toast.error(e.message); }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const items = orderLines
        .filter(l => l.branchMenuItemId)
        .map(l => ({ branch_menu_item_id: parseInt(l.branchMenuItemId), quantity: l.quantity, notes: l.notes || null }));
      await api.post(`/branches/${branchId}/orders`, { items });
      toast.success("Order placed!"); setPlaceModal(false); setOrderLines([{ branchMenuItemId: "", quantity: 1, notes: "" }]); load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const addLine = () => setOrderLines([...orderLines, { branchMenuItemId: "", quantity: 1, notes: "" }]);
  const updateLine = (idx: number, field: string, value: string | number) => {
    const updated = [...orderLines];
    (updated[idx] as any)[field] = value;
    setOrderLines(updated);
  };
  const removeLine = (idx: number) => setOrderLines(orderLines.filter((_, i) => i !== idx));

  const calcOrderTotal = () => {
    return orderLines.reduce((sum, line) => {
      const item = menuItems.find(m => m.id === parseInt(line.branchMenuItemId));
      return sum + (item ? Number(item.effectivePrice) * line.quantity : 0);
    }, 0);
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading...</div>;

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

      <div className="card table-wrap">
        {orders.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>No orders yet.</div>
        ) : (
          <table>
            <thead><tr><th>ID</th><th>Status</th><th>Total</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id}>
                  <td style={{ color: "var(--text-muted)" }}>#{order.id}</td>
                  <td><StatusBadge status={order.status} /></td>
                  <td style={{ fontWeight: 700, color: "var(--accent)" }}>${Number(order.totalAmount).toFixed(2)}</td>
                  <td style={{ color: "var(--text-muted)" }}>{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openDetail(order)}>
                        <Eye size={13} /> Detail
                      </button>
                      {STATUS_TRANSITIONS[order.status]?.length > 0 && (
                        <select
                          onChange={e => handleStatusChange(order, e.target.value)}
                          value=""
                          style={{ padding: "6px 10px", fontSize: 12, width: "auto", cursor: "pointer" }}
                        >
                          <option value="" disabled>Change Status</option>
                          {STATUS_TRANSITIONS[order.status].map(s => (
                            <option key={s} value={s}>{s.replace("_", " ")}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Order Detail Modal */}
      <Modal open={!!detailOrder} onClose={() => setDetailOrder(null)} title={`Order #${detailOrder?.id}`} width={560}>
        {detailOrder && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <StatusBadge status={detailOrder.status} />
              <span style={{ fontWeight: 700, color: "var(--accent)", fontSize: 18 }}>${Number(detailOrder.totalAmount).toFixed(2)}</span>
            </div>
            {detailOrder.orderItems?.map(oi => (
              <div key={oi.id} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{oi.branchMenuItem?.masterItem?.name}</div>
                  {oi.notes && <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Note: {oi.notes}</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "var(--text-muted)", fontSize: 13 }}>x{oi.quantity} × ${Number(oi.priceAtPurchase).toFixed(2)}</div>
                  <div style={{ fontWeight: 700 }}>${(Number(oi.priceAtPurchase) * oi.quantity).toFixed(2)}</div>
                </div>
              </div>
            ))}
            {STATUS_TRANSITIONS[detailOrder.status]?.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <label>Change Status</label>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  {STATUS_TRANSITIONS[detailOrder.status].map(s => (
                    <button key={s} className="btn btn-ghost btn-sm" onClick={() => handleStatusChange(detailOrder, s)}>
                      → {s.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Place Order Modal */}
      <Modal open={placeModal} onClose={() => setPlaceModal(false)} title="Place New Order" width={600}>
        <form onSubmit={handlePlaceOrder} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {orderLines.map((line, idx) => (
            <div key={idx} style={{ background: "var(--bg-surface)", borderRadius: 10, padding: 16 }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 2 }}>
                  <label>Item</label>
                  <select value={line.branchMenuItemId} onChange={e => updateLine(idx, "branchMenuItemId", e.target.value)} required>
                    <option value="">Select item...</option>
                    {menuItems.map(m => (
                      <option key={m.id} value={m.id}>{m.masterItem.name} — ${Number(m.effectivePrice).toFixed(2)}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label>Qty</label>
                  <input type="number" min="1" value={line.quantity} onChange={e => updateLine(idx, "quantity", parseInt(e.target.value))} required />
                </div>
                {orderLines.length > 1 && (
                  <button type="button" onClick={() => removeLine(idx)} className="btn btn-danger btn-sm" style={{ marginTop: 22 }}>✕</button>
                )}
              </div>
              <div>
                <label>Notes (optional)</label>
                <input value={line.notes} onChange={e => updateLine(idx, "notes", e.target.value)} placeholder="e.g. No sugar" />
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-ghost" onClick={addLine}>
            <Plus size={14} /> Add Another Item
          </button>
          {calcOrderTotal() > 0 && (
            <div style={{ background: "var(--bg-surface)", padding: "12px 16px", borderRadius: 8, display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Estimated Total</span>
              <span style={{ fontWeight: 700, color: "var(--accent)", fontSize: 18 }}>${calcOrderTotal().toFixed(2)}</span>
            </div>
          )}
          <button className="btn btn-primary" type="submit" disabled={saving} style={{ justifyContent: "center" }}>
            {saving ? "Placing Order..." : "Place Order"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
