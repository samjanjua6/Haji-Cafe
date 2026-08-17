"use client";

import { Eye } from "lucide-react";
import { ShoppingCart } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";
import { Order } from "@/types/order";

const STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["IN_PREPARATION", "CANCELLED"],
  IN_PREPARATION: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

interface OrderTableProps {
  orders: Order[];
  loading: boolean;
  onOpenDetail: (order: Order) => void;
  onStatusChange: (order: Order, newStatus: string) => void;
}

export default function OrderTable({ orders, loading, onOpenDetail, onStatusChange }: OrderTableProps) {
  return (
    <div className="card table-wrap">
      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No orders yet"
          subtitle="Once orders are placed for this branch, they will appear here."
        />
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Total</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id}>
                <td style={{ color: "var(--text-muted)", fontFamily: "monospace", fontSize: 13 }}>#{order.id}</td>
                <td><StatusBadge status={order.status} /></td>
                <td style={{ fontWeight: 700, color: "var(--accent)" }}>${Number(order.totalAmount).toFixed(2)}</td>
                <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{new Date(order.createdAt).toLocaleDateString()}</td>
                <td>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => onOpenDetail(order)}>
                      <Eye size={13} /> Detail
                    </button>
                    {STATUS_TRANSITIONS[order.status]?.length > 0 && (
                      <select
                        onChange={e => onStatusChange(order, e.target.value)}
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
  );
}
