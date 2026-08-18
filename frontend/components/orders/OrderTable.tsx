"use strict";
// We don't use 'use strict' in tsx, use client
"use client";

import { Eye, ShoppingCart, ArrowUp, ArrowDown } from "lucide-react";
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
  onOpenDetail?: (order: Order) => void;
  onStatusChange?: (order: Order, newStatus: string) => void;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  onSort?: (field: string) => void;
  hasFiltersActive?: boolean;
  onClearFilters?: () => void;
  branchMode?: boolean; // If false, shows branch column (for cafe-level view)
}

function SortableHeader({ label, field, currentSortBy, currentSortDir, onSort }: { label: string; field: string; currentSortBy?: string; currentSortDir?: "asc" | "desc"; onSort?: (field: string) => void }) {
  const isActive = currentSortBy === field;
  return (
    <th 
      onClick={() => onSort && onSort(field)} 
      style={{ cursor: onSort ? "pointer" : "default", userSelect: "none" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {label}
        {isActive && (
          currentSortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
        )}
      </div>
    </th>
  );
}

export default function OrderTable({ 
  orders, 
  loading, 
  onOpenDetail, 
  onStatusChange,
  sortBy,
  sortDir,
  onSort,
  hasFiltersActive,
  onClearFilters,
  branchMode = true
}: OrderTableProps) {
  return (
    <div className="card table-wrap">
      {loading ? (
        <TableSkeleton rows={5} cols={branchMode ? 5 : 6} />
      ) : orders.length === 0 ? (
        hasFiltersActive ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)" }}>
            <p style={{ marginBottom: 12 }}>No orders match your filters.</p>
            {onClearFilters && (
              <button className="btn btn-secondary" onClick={onClearFilters}>
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <EmptyState
            icon={ShoppingCart}
            title="No orders yet"
            subtitle="Once orders are placed, they will appear here."
          />
        )
      ) : (
        <table>
          <thead>
            <tr>
              <SortableHeader label="ID" field="id" currentSortBy={sortBy} currentSortDir={sortDir} onSort={onSort} />
              {!branchMode && <th>Branch</th>}
              <SortableHeader label="Status" field="status" currentSortBy={sortBy} currentSortDir={sortDir} onSort={onSort} />
              <SortableHeader label="Total" field="totalAmount" currentSortBy={sortBy} currentSortDir={sortDir} onSort={onSort} />
              <SortableHeader label="Date" field="createdAt" currentSortBy={sortBy} currentSortDir={sortDir} onSort={onSort} />
              {onOpenDetail && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id}>
                <td style={{ color: "var(--text-muted)", fontFamily: "monospace", fontSize: 13 }}>#{order.id}</td>
                {!branchMode && (
                  <td style={{ fontWeight: 500 }}>
                    {(order as any).branch?.name || `Branch #${order.branchId}`}
                  </td>
                )}
                <td><StatusBadge status={order.status} /></td>
                <td style={{ fontWeight: 700, color: "var(--accent)" }}>${Number(order.totalAmount).toFixed(2)}</td>
                <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{new Date(order.createdAt).toLocaleString()}</td>
                {onOpenDetail && (
                  <td>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => onOpenDetail(order)}>
                        <Eye size={13} /> Detail
                      </button>
                      {onStatusChange && STATUS_TRANSITIONS[order.status]?.length > 0 && (
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
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
