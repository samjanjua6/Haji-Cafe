"use client";

import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { OrderStatus } from "@/types/order";
import StatusBadge from "@/components/StatusBadge";

interface OrdersFilterBarProps {
  search: string;
  status: string; // Comma separated
  dateFrom: string;
  dateTo: string;
  branchId: string;
  
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
  
  showBranchFilter?: boolean;
  branches?: { id: number; name: string }[];
}

const ALL_STATUSES: OrderStatus[] = ["PENDING", "IN_PREPARATION", "COMPLETED", "CANCELLED"];

export default function OrdersFilterBar({
  search,
  status,
  dateFrom,
  dateTo,
  branchId,
  onFilterChange,
  onClearFilters,
  showBranchFilter,
  branches = []
}: OrdersFilterBarProps) {
  const [localSearch, setLocalSearch] = useState(search);
  
  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) {
        onFilterChange("search", localSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, search, onFilterChange]);

  const activeStatuses = status ? status.split(",") : [];

  const toggleStatus = (st: string) => {
    let newStatuses = [...activeStatuses];
    if (newStatuses.includes(st)) {
      newStatuses = newStatuses.filter(s => s !== st);
    } else {
      newStatuses.push(st);
    }
    onFilterChange("status", newStatuses.join(","));
  };

  const hasFilters = search || status || dateFrom || dateTo || branchId;

  return (
    <div className="card" style={{ marginBottom: 20, padding: 20 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
        
        {/* Search */}
        <div style={{ flex: "1 1 200px" }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>Search by Order ID</label>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: 11, color: "var(--text-muted)" }} />
            <input 
              type="text" 
              className="input" 
              placeholder="e.g. 1024"
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              style={{ paddingLeft: 34, width: "100%" }}
            />
          </div>
        </div>

        {/* Date Range */}
        <div style={{ display: "flex", gap: 10, flex: "1 1 240px" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>From Date</label>
            <input 
              type="date" 
              className="input" 
              value={dateFrom}
              onChange={e => onFilterChange("dateFrom", e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>To Date</label>
            <input 
              type="date" 
              className="input" 
              value={dateTo}
              onChange={e => onFilterChange("dateTo", e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
        </div>

        {/* Branch Filter (Cafe-level only) */}
        {showBranchFilter && (
          <div style={{ flex: "1 1 180px" }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>Branch</label>
            <select 
              className="input" 
              value={branchId}
              onChange={e => onFilterChange("branchId", e.target.value)}
              style={{ width: "100%", cursor: "pointer" }}
            >
              <option value="">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Status Pills */}
      <div style={{ marginTop: 16 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>Filter by Status</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {ALL_STATUSES.map(st => {
            const isActive = activeStatuses.includes(st);
            return (
              <button 
                key={st}
                onClick={() => toggleStatus(st)}
                style={{ 
                  background: "transparent", 
                  border: "none", 
                  padding: 0, 
                  cursor: "pointer",
                  opacity: isActive ? 1 : 0.4,
                  transition: "opacity 0.2s"
                }}
              >
                <StatusBadge status={st} />
              </button>
            );
          })}
          
          {hasFilters && (
            <button 
              className="btn btn-ghost btn-sm" 
              onClick={() => {
                setLocalSearch("");
                onClearFilters();
              }}
              style={{ marginLeft: "auto", color: "var(--danger)" }}
            >
              <X size={14} /> Clear Filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
