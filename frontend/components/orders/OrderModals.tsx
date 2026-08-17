"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import Modal from "@/components/Modal";
import StatusBadge from "@/components/StatusBadge";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { Order } from "@/types/order";
import { BranchMenuItem } from "@/types/menu";
import { useMutation } from "@tanstack/react-query";

const STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["IN_PREPARATION", "CANCELLED"],
  IN_PREPARATION: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

interface OrderLineState {
  branchMenuItemId: string;
  quantity: number;
  notes: string;
}

interface OrderModalsProps {
  branchId: string;
  detailOrder: Order | null;
  setDetailOrder: (order: Order | null) => void;
  placeModal: boolean;
  setPlaceModal: (open: boolean) => void;
  menuItems: BranchMenuItem[];
  onSuccess: () => void;
  onStatusChange: (order: Order, newStatus: string) => void;
}

export default function OrderModals({
  branchId,
  detailOrder,
  setDetailOrder,
  placeModal,
  setPlaceModal,
  menuItems,
  onSuccess,
  onStatusChange,
}: OrderModalsProps) {
  const [orderLines, setOrderLines] = useState<OrderLineState[]>([
    { branchMenuItemId: "", quantity: 1, notes: "" }
  ]);

  const placeMutation = useMutation({
    mutationFn: (items: any[]) => api.post(`/branches/${branchId}/orders`, { items }),
    onSuccess: () => {
      toast.success("Order placed!");
      setPlaceModal(false);
      setOrderLines([{ branchMenuItemId: "", quantity: 1, notes: "" }]);
      onSuccess();
    },
    onError: (e: any) => toast.error(e.message)
  });

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault(); 
    const items = orderLines
      .filter(l => l.branchMenuItemId)
      .map(l => ({ 
        branch_menu_item_id: parseInt(l.branchMenuItemId), 
        quantity: l.quantity, 
        notes: l.notes || null 
      }));
    placeMutation.mutate(items);
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

  return (
    <>
      <Modal open={!!detailOrder} onClose={() => setDetailOrder(null)} title={`Order #${detailOrder?.id}`} width={560}>
        {detailOrder && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <StatusBadge status={detailOrder.status} />
              <span style={{ fontWeight: 700, color: "var(--accent)", fontSize: 18 }}>${Number(detailOrder.totalAmount).toFixed(2)}</span>
            </div>
            {detailOrder.orderLines?.map(oi => (
              <div key={oi.id} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{oi.branchMenuItem?.masterItem?.name}</div>
                  {oi.notes && <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Note: {oi.notes}</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "var(--text-muted)", fontSize: 13 }}>x{oi.quantity} × ${Number(oi.unitPrice).toFixed(2)}</div>
                  <div style={{ fontWeight: 700 }}>${(Number(oi.unitPrice) * oi.quantity).toFixed(2)}</div>
                </div>
              </div>
            ))}
            {STATUS_TRANSITIONS[detailOrder.status]?.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <label>Change Status</label>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  {STATUS_TRANSITIONS[detailOrder.status].map(s => (
                    <button key={s} className="btn btn-ghost btn-sm" onClick={() => onStatusChange(detailOrder, s)}>
                      → {s.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

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
          <button className="btn btn-primary" type="submit" disabled={placeMutation.isPending} style={{ justifyContent: "center" }}>
            {placeMutation.isPending ? "Placing Order..." : "Place Order"}
          </button>
        </form>
      </Modal>
    </>
  );
}
