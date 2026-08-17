"use client";

import { Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import { BranchMenuItem } from "@/types/menu";

interface BranchMenuTableProps {
  items: BranchMenuItem[];
  loading: boolean;
  onEdit: (item: BranchMenuItem) => void;
  onPatch: (item: BranchMenuItem, patch: Record<string, unknown>) => void;
}

export default function BranchMenuTable({ items, loading, onEdit, onPatch }: BranchMenuTableProps) {
  if (loading) {
    return (
      <div className="card table-wrap">
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="card table-wrap">
        <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>
          No branch menu items. Add overrides from the master menu.
        </div>
      </div>
    );
  }

  return (
    <div className="card table-wrap">
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Base Price</th>
            <th>Override</th>
            <th>Effective Price</th>
            <th>Avail. Qty</th>
            <th>In Stock</th>
            <th>Active</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id}>
              <td style={{ fontWeight: 600 }}>{item.masterItem.name}</td>
              <td style={{ color: "var(--text-muted)" }}>${Number(item.masterItem.basePrice).toFixed(2)}</td>
              <td style={{ color: item.priceOverride ? "var(--accent)" : "var(--text-muted)" }}>
                {item.priceOverride ? `$${Number(item.priceOverride).toFixed(2)}` : "—"}
              </td>
              <td style={{ fontWeight: 700, color: "var(--accent)" }}>${Number(item.effectivePrice).toFixed(2)}</td>
              <td style={{ color: item.availableQuantity !== null ? "var(--text)" : "var(--text-muted)" }}>
                {item.availableQuantity !== null ? item.availableQuantity : "∞"}
              </td>
              <td>
                <button onClick={() => onPatch(item, { is_in_stock: !item.isInStock })} style={{ background: "none", border: "none", cursor: "pointer" }}>
                  {item.isInStock ? <ToggleRight size={22} color="#22c55e" /> : <ToggleLeft size={22} color="#ef4444" />}
                </button>
              </td>
              <td>
                <button onClick={() => onPatch(item, { is_active: !item.isActive })} style={{ background: "none", border: "none", cursor: "pointer" }}>
                  {item.isActive ? <ToggleRight size={22} color="#22c55e" /> : <ToggleLeft size={22} color="#ef4444" />}
                </button>
              </td>
              <td>
                <button className="btn btn-ghost btn-sm" onClick={() => onEdit(item)}>
                  <Pencil size={13} /> Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
