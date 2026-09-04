"use strict";
// We don't use 'use strict' in tsx, use client
"use client";

import { Eye, ShoppingCart, ArrowUp, ArrowDown } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";
import { Order } from "@/types/order";

import { Card } from "@/components/Card";
import { Table, TableHead, TableBody, TableRow, TableCell } from "@/components/Table";
import { getOrderItemsSummary } from "@/lib/orders";

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

function SortableHeader({ label, field, currentSortBy, currentSortDir, onSort, sticky }: { label: string; field: string; currentSortBy?: string; currentSortDir?: "asc" | "desc"; onSort?: (field: string) => void; sticky?: boolean }) {
  const isActive = currentSortBy === field;
  return (
    <TableCell 
      isHeader 
      sticky={sticky}
      onClick={() => onSort && onSort(field)} 
      style={{ cursor: onSort ? "pointer" : "default", userSelect: "none" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {label}
        {isActive && (
          currentSortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
        )}
      </div>
    </TableCell>
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
    <Card padding="none">
      {loading ? (
        <TableSkeleton rows={5} cols={branchMode ? 6 : 7} />
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
        <Table>
          <TableHead>
            <TableRow>
              <SortableHeader sticky label="ID" field="id" currentSortBy={sortBy} currentSortDir={sortDir} onSort={onSort} />
              {!branchMode && <TableCell isHeader>Branch</TableCell>}
              <TableCell isHeader>Service</TableCell>
              <TableCell isHeader>Items</TableCell>
              <SortableHeader label="Status" field="status" currentSortBy={sortBy} currentSortDir={sortDir} onSort={onSort} />
              <SortableHeader label="Total" field="totalAmount" currentSortBy={sortBy} currentSortDir={sortDir} onSort={onSort} />
              <SortableHeader label="Date" field="createdAt" currentSortBy={sortBy} currentSortDir={sortDir} onSort={onSort} />
              {onOpenDetail && <TableCell isHeader>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map(order => (
              <TableRow key={order.id}>
                <TableCell sticky style={{ color: "var(--text-muted)", fontFamily: "monospace", fontSize: 13 }}>#{order.id}</TableCell>
                {!branchMode && (
                  <TableCell style={{ fontWeight: 500 }}>
                    {(order as any).branch?.name || `Branch #${order.branchId}`}
                  </TableCell>
                )}
                <TableCell style={{ fontSize: 13, fontWeight: 500 }}>
                  {order.orderType === "DELIVERY" ? (
                    <span style={{ color: "#3b82f6", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      Delivery
                    </span>
                  ) : (
                    <span style={{ color: "#f59e0b", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {order.tableNumber || "Dine-in"}
                    </span>
                  )}
                  {order.customerName && (
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      {order.customerName}
                    </div>
                  )}
                </TableCell>
                <TableCell style={{ maxWidth: 220, fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={getOrderItemsSummary(order, 10)}>
                  {getOrderItemsSummary(order, 2)}
                </TableCell>
                <TableCell><StatusBadge status={order.status} /></TableCell>
                <TableCell style={{ fontWeight: 700, color: "var(--accent)" }}>${Number(order.totalAmount).toFixed(2)}</TableCell>
                <TableCell style={{ color: "var(--text-muted)", fontSize: 13 }}>{new Date(order.createdAt).toLocaleString()}</TableCell>
                {onOpenDetail && (
                  <TableCell>
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
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
