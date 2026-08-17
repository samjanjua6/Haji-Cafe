"use client";

import { Pencil, ToggleLeft, ToggleRight, UtensilsCrossed } from "lucide-react";
import { BranchMenuItem } from "@/types/menu";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";

interface BranchMenuTableProps {
  items: BranchMenuItem[];
  loading: boolean;
  onEdit: (item: BranchMenuItem) => void;
  onPatch: (item: BranchMenuItem, patch: Record<string, unknown>) => void;
}

export default function BranchMenuTable({ items, loading, onEdit, onPatch }: BranchMenuTableProps) {
  return (
    <div className="card table-wrap">
      {loading ? (
        <TableSkeleton rows={5} cols={8} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="No menu items yet"
          subtitle="Add branch-specific overrides from the master menu to get started."
        />
      ) : (
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
                <td style={{ color: "var(--text-muted)", fontSize: 13 }}>${Number(item.masterItem.basePrice).toFixed(2)}</td>
                <td style={{ color: item.priceOverride ? "var(--accent)" : "var(--text-faint)", fontSize: 13 }}>
                  {item.priceOverride ? `$${Number(item.priceOverride).toFixed(2)}` : "—"}
                </td>
                <td style={{ fontWeight: 700, color: "var(--accent)" }}>${Number(item.effectivePrice).toFixed(2)}</td>
                <td style={{ color: "var(--text-muted)", fontSize: 13 }}>
                  {item.availableQuantity !== null ? item.availableQuantity : "∞"}
                </td>
                <td>
                  <button onClick={() => onPatch(item, { is_in_stock: !item.isInStock })} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                    {item.isInStock
                      ? <ToggleRight size={22} color="var(--success)" />
                      : <ToggleLeft size={22} color="var(--danger)" />}
                  </button>
                </td>
                <td>
                  <button onClick={() => onPatch(item, { is_active: !item.isActive })} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                    {item.isActive
                      ? <ToggleRight size={22} color="var(--success)" />
                      : <ToggleLeft size={22} color="var(--danger)" />}
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
      )}
    </div>
  );
}
