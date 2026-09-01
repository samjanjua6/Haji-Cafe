"use client";
import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Package,
  Search,
  ArrowLeft,
  RefreshCw,
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  PackageX,
  Building2,
  Boxes,
} from "lucide-react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { Card } from "@/components/Card";
import { Table, TableHead, TableBody, TableRow, TableCell } from "@/components/Table";
import { Skeleton } from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";

interface Cafe {
  id: number;
  name: string;
}

interface Branch {
  id: number;
  name: string;
}

interface StockItem {
  id: number;
  branchId: number;
  masterItemId: number;
  priceOverride: number | null;
  availableQuantity: number | null;
  isInStock: boolean;
  isActive: boolean;
  lowStockThreshold: number;
  effectivePrice: number;
  masterItem: {
    id: number;
    name: string;
    basePrice: number;
    description: string | null;
  };
  branch: {
    id: number;
    name: string;
  };
}

type SortOption = "name_asc" | "name_desc" | "qty_asc" | "qty_desc" | "critical";

function getItemStatus(item: StockItem) {
  if (item.isInStock === false) {
    return { label: "Sold Out (Manual Override)", color: "var(--danger)", bg: "var(--danger-glow)" };
  }
  if (item.availableQuantity === 0) {
    return { label: "Sold Out", color: "var(--danger)", bg: "var(--danger-glow)" };
  }
  if (item.availableQuantity !== null && item.availableQuantity <= item.lowStockThreshold) {
    return { label: "Low Stock", color: "var(--warning)", bg: "var(--warning-glow)" };
  }
  return { label: "In Stock", color: "var(--success)", bg: "var(--success-glow)" };
}

function StatCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <Card
      style={{ display: "flex", alignItems: "center", gap: 16, transition: "border-color 0.2s, box-shadow 0.2s" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--accent)";
        e.currentTarget.style.boxShadow = "var(--shadow-md)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          background: iconBg,
          color: iconColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.1, letterSpacing: "-0.02em" }}>
          {value}
        </div>
        {sub && (
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>{sub}</div>
        )}
      </div>
    </Card>
  );
}

export default function CafeStocksPage() {
  const { cafeId } = useParams<{ cafeId: string }>();
  const router = useRouter();

  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("name_asc");

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [c, b, s] = await Promise.all([
        api.get<Cafe>(`/cafes/${cafeId}`),
        api.get<Branch[]>(`/cafes/${cafeId}/branches`),
        api.get<StockItem[]>(`/cafes/${cafeId}/stock-rollup`),
      ]);
      setCafe(c);
      setBranches(b);
      setStockItems(s);
    } catch (e: any) {
      toast.error(e.message || "Failed to load stock inventory data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (cafeId) load();
  }, [cafeId]);

  // Branch item counts for dropdown labels
  const branchCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const item of stockItems) {
      counts[item.branchId] = (counts[item.branchId] || 0) + 1;
    }
    return counts;
  }, [stockItems]);

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    let result = stockItems.filter((item) => {
      // 1. Branch filter
      if (selectedBranchId !== "all" && item.branchId !== Number(selectedBranchId)) {
        return false;
      }
      // 2. Search query (item name or branch name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = item.masterItem.name.toLowerCase().includes(q);
        const branchMatch = item.branch.name.toLowerCase().includes(q);
        if (!nameMatch && !branchMatch) return false;
      }
      // 3. Status filter
      if (statusFilter !== "all") {
        const status = getItemStatus(item);
        if (statusFilter === "in_stock" && !status.label.includes("In Stock")) return false;
        if (statusFilter === "low_stock" && !status.label.includes("Low Stock")) return false;
        if (statusFilter === "sold_out" && !status.label.includes("Sold Out")) return false;
      }
      return true;
    });

    // Sorting
    switch (sortBy) {
      case "name_asc":
        result = [...result].sort((a, b) => a.masterItem.name.localeCompare(b.masterItem.name));
        break;
      case "name_desc":
        result = [...result].sort((a, b) => b.masterItem.name.localeCompare(a.masterItem.name));
        break;
      case "qty_asc":
        result = [...result].sort((a, b) => (a.availableQuantity ?? 999999) - (b.availableQuantity ?? 999999));
        break;
      case "qty_desc":
        result = [...result].sort((a, b) => (b.availableQuantity ?? 999999) - (a.availableQuantity ?? 999999));
        break;
      case "critical":
        result = [...result].sort((a, b) => {
          const score = (item: StockItem) => {
            if (!item.isInStock || item.availableQuantity === 0) return 0;
            if (item.availableQuantity !== null && item.availableQuantity <= item.lowStockThreshold) return 1;
            return 2;
          };
          return score(a) - score(b);
        });
        break;
    }

    return result;
  }, [stockItems, selectedBranchId, searchQuery, statusFilter, sortBy]);

  // Overall KPI stats based on selected branch
  const stats = useMemo(() => {
    const baseItems = selectedBranchId === "all"
      ? stockItems
      : stockItems.filter((i) => i.branchId === Number(selectedBranchId));

    let inStock = 0;
    let lowStock = 0;
    let soldOut = 0;

    for (const item of baseItems) {
      const s = getItemStatus(item);
      if (s.label.includes("In Stock")) inStock++;
      else if (s.label.includes("Low Stock")) lowStock++;
      else if (s.label.includes("Sold Out")) soldOut++;
    }

    return {
      total: baseItems.length,
      inStock,
      lowStock,
      soldOut,
    };
  }, [stockItems, selectedBranchId]);

  if (loading) {
    return (
      <div style={{ display: "grid", gap: 24 }}>
        <div className="page-header">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton width={100} height={14} />
            <Skeleton width={240} height={30} />
            <Skeleton width={160} height={14} />
          </div>
          <Skeleton width={36} height={36} borderRadius={8} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={88} borderRadius={12} />
          ))}
        </div>

        <Skeleton height={42} borderRadius={10} />

        <div className="card">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 16, padding: "14px 0", borderBottom: "1px solid var(--border-subtle)" }}>
              <Skeleton width="60%" height={16} />
              <Skeleton width="40%" height={16} />
              <Skeleton width="30%" height={16} />
              <Skeleton width="50%" height={24} borderRadius={99} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="page-header" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <button
            onClick={() => router.push(`/cafes/${cafeId}`)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 8,
              fontSize: 13,
              padding: 0,
            }}
          >
            <ArrowLeft size={14} /> Back to Overview
          </button>
          <div className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            Stocks & Inventory
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              title="Refresh stock data"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
                display: "flex",
                padding: 4,
                borderRadius: 6,
                transition: "color 0.15s, background 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text-primary)";
                e.currentTarget.style.background = "var(--bg-surface)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-muted)";
                e.currentTarget.style.background = "none";
              }}
            >
              <RefreshCw size={16} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            </button>
          </div>
          <div className="page-subtitle">
            Café: <strong style={{ color: "var(--text-primary)" }}>{cafe?.name}</strong>{" "}
            <span style={{ color: "var(--text-faint)", fontSize: 12 }}>(#{cafeId})</span>
          </div>
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <StatCard
          icon={<Boxes size={22} />}
          iconBg="var(--accent-muted)"
          iconColor="var(--accent)"
          label="Tracked Items"
          value={stats.total}
          sub={selectedBranchId === "all" ? "Across all branches" : "In selected branch"}
        />
        <StatCard
          icon={<CheckCircle2 size={22} />}
          iconBg="var(--success-glow)"
          iconColor="var(--success)"
          label="In Stock"
          value={stats.inStock}
          sub={`${stats.inStock} ready for sale`}
        />
        <StatCard
          icon={<AlertTriangle size={22} />}
          iconBg="var(--warning-glow)"
          iconColor="var(--warning)"
          label="Low Stock"
          value={stats.lowStock}
          sub={stats.lowStock === 0 ? "No critical items" : `${stats.lowStock} items near threshold`}
        />
        <StatCard
          icon={<PackageX size={22} />}
          iconBg="var(--danger-glow)"
          iconColor="var(--danger)"
          label="Sold Out"
          value={stats.soldOut}
          sub={stats.soldOut === 0 ? "No sold out items" : `${stats.soldOut} items unavailable`}
        />
      </div>

      {/* ── Filter Toolbar ── */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          />
          <input
            type="text"
            className="input"
            placeholder="Search by item name or branch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 40, width: "100%" }}
          />
        </div>

        {/* Branch Filter Dropdown */}
        <div style={{ minWidth: 180 }}>
          <select
            className="input"
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            style={{ width: "100%", cursor: "pointer" }}
          >
            <option value="all">🏢 All Branches ({stockItems.length} items)</option>
            {branches.map((b) => (
              <option key={b.id} value={String(b.id)}>
                📍 {b.name} ({branchCounts[b.id] || 0} items)
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ minWidth: 150 }}>
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: "100%", cursor: "pointer" }}
          >
            <option value="all">🏷️ All Statuses</option>
            <option value="in_stock">🟢 In Stock</option>
            <option value="low_stock">🟡 Low Stock</option>
            <option value="sold_out">🔴 Sold Out</option>
          </select>
        </div>

        {/* Sort Dropdown */}
        <div style={{ minWidth: 170 }}>
          <select
            className="input"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            style={{ width: "100%", cursor: "pointer" }}
          >
            <option value="name_asc">Sort: Name (A → Z)</option>
            <option value="name_desc">Sort: Name (Z → A)</option>
            <option value="critical">Sort: Critical Stock First</option>
            <option value="qty_asc">Sort: Qty (Low → High)</option>
            <option value="qty_desc">Sort: Qty (High → Low)</option>
          </select>
        </div>

        {/* Filter Result Count & Reset */}
        {(searchQuery || selectedBranchId !== "all" || statusFilter !== "all") && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setSearchQuery("");
              setSelectedBranchId("all");
              setStatusFilter("all");
            }}
            style={{ whiteSpace: "nowrap" }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* ── Stock Items Table / Empty State ── */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No stock items found"
          subtitle={
            searchQuery || selectedBranchId !== "all" || statusFilter !== "all"
              ? "No items match your active search and filter criteria. Try adjusting your filters."
              : "No menu items have been added to branches yet."
          }
          action={
            (searchQuery || selectedBranchId !== "all" || statusFilter !== "all") ? (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedBranchId("all");
                  setStatusFilter("all");
                }}
              >
                Reset Filters
              </button>
            ) : undefined
          }
        />
      ) : (
        <Card padding="none">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell isHeader>Item Name</TableCell>
                <TableCell isHeader>Branch</TableCell>
                <TableCell isHeader style={{ textAlign: "center" }}>Available Qty</TableCell>
                <TableCell isHeader style={{ textAlign: "center" }}>Alert Threshold</TableCell>
                <TableCell isHeader>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredItems.map((item) => {
                const status = getItemStatus(item);
                return (
                  <TableRow key={item.id}>
                    <TableCell style={{ fontWeight: 600 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: "var(--accent-muted)",
                            color: "var(--accent)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Package size={16} />
                        </div>
                        <div>
                          <div style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: 600 }}>
                            {item.masterItem.name}
                          </div>
                          {item.masterItem.description && (
                            <div style={{ color: "var(--text-faint)", fontSize: 12, marginTop: 2, maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {item.masterItem.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 13,
                          color: "var(--text-muted)",
                          background: "var(--bg-surface)",
                          border: "1px solid var(--border)",
                          padding: "3px 10px",
                          borderRadius: 6,
                          fontWeight: 500,
                        }}
                      >
                        <GitBranch size={12} style={{ color: "var(--accent)" }} />
                        {item.branch.name}
                      </span>
                    </TableCell>

                    <TableCell style={{ textAlign: "center" }}>
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: 15,
                          fontWeight: 700,
                          color: item.availableQuantity === 0 ? "var(--danger)" : "var(--text-primary)",
                        }}
                      >
                        {item.availableQuantity ?? "∞"}
                      </span>
                    </TableCell>

                    <TableCell style={{ textAlign: "center" }}>
                      <span style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "monospace" }}>
                        {item.lowStockThreshold !== undefined && item.lowStockThreshold !== null
                          ? `≤ ${item.lowStockThreshold}`
                          : "—"}
                      </span>
                    </TableCell>

                    <TableCell>
                      <span
                        style={{
                          background: status.bg,
                          color: status.color,
                          padding: "4px 10px",
                          borderRadius: 99,
                          fontSize: 12,
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: status.color }} />
                        {status.label}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
