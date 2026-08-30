"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { GitBranch, UtensilsCrossed, ShoppingCart, ArrowLeft, MapPin, Plus, Pencil, Trash2, CalendarPlus, Users } from "lucide-react";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";
import Modal from "@/components/Modal";
import toast from "react-hot-toast";
import Link from "next/link";
import { Skeleton } from "@/components/LoadingSkeleton";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import OrdersFilterBar from "@/components/orders/OrdersFilterBar";
import OrderTable from "@/components/orders/OrderTable";
import { Card } from "@/components/Card";
import { Table, TableHead, TableBody, TableRow, TableCell } from "@/components/Table";
import { HistoricalPredictionChart } from "@/components/analytics/HistoricalPredictionChart";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, usePathname } from "next/navigation";
import { OrdersResponse } from "@/types/order";

interface Cafe { id: number; name: string; createdAt: string; }
interface Branch { id: number; name: string; location: string | null; }
interface Order { id: number; status: string; totalAmount: number; createdAt: string; branchId: number; }
interface Staff { id: number; email: string; role: string; }

export default function CafeDetailPage() {
  const { cafeId } = useParams<{ cafeId: string }>();
  const router = useRouter();
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [stockRollup, setStockRollup] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Branch modals
  const [createBranch, setCreateBranch] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [branchName, setBranchName] = useState("");
  const [branchLocation, setBranchLocation] = useState("");
  const [saving, setSaving] = useState(false);


  const pathname = usePathname();
  const searchParams = useSearchParams();

  const search = searchParams.get("search") || "";
  const statusFilter = searchParams.get("status") || "";
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";
  const filterBranchId = searchParams.get("branchId") || "";
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortDir = (searchParams.get("sortDir") as "asc" | "desc") || "desc";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = 25;

  const updateQueryParam = (key: string, value: string) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    if (value) current.set(key, value);
    else current.delete(key);
    
    if (key !== "page" && key !== "sortBy" && key !== "sortDir") {
      current.set("page", "1");
    }
    router.push(`${pathname}?${current.toString()}`, { scroll: false });
  };

  const clearFilters = () => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.delete("search"); current.delete("status"); current.delete("dateFrom"); current.delete("dateTo"); current.delete("branchId");
    current.set("page", "1");
    router.push(`${pathname}?${current.toString()}`, { scroll: false });
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      updateQueryParam("sortDir", sortDir === "asc" ? "desc" : "asc");
    } else {
      updateQueryParam("sortBy", field);
      updateQueryParam("sortDir", "desc");
    }
  };

  const [currentUser, setCurrentUser] = useState<any>(null);

  const load = async () => {
    try {
      const [c, b, s, st, user] = await Promise.all([
        api.get<Cafe>(`/cafes/${cafeId}`),
        api.get<Branch[]>(`/cafes/${cafeId}/branches`),
        api.get<Staff[]>(`/cafes/${cafeId}/staff`),
        api.get<any[]>(`/cafes/${cafeId}/stock-rollup`),
        api.get<any>("/auth/me"),
      ]);
      setCafe(c); setBranches(b); setStaffList(s); setStockRollup(st); setCurrentUser(user);
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [cafeId]);

  const { data: ordersData, isLoading: loadingOrders } = useQuery({
    queryKey: ["cafe-orders", cafeId, search, statusFilter, dateFrom, dateTo, filterBranchId, sortBy, sortDir, page],
    queryFn: () => {
      const q = new URLSearchParams();
      q.set("page", page.toString());
      q.set("limit", limit.toString());
      if (search) q.set("search", search);
      if (statusFilter) q.set("status", statusFilter);
      if (dateFrom) q.set("dateFrom", dateFrom);
      if (dateTo) q.set("dateTo", dateTo);
      if (filterBranchId) q.set("branchId", filterBranchId);
      q.set("sortBy", sortBy);
      q.set("sortDir", sortDir);
      return api.get<OrdersResponse>(`/cafes/${cafeId}/orders?${q.toString()}`);
    }
  });

  const ordersList = ordersData?.data || [];
  const meta = ordersData?.meta || { total: 0, skip: 0, take: 0 };
  const hasFiltersActive = !!(search || statusFilter || dateFrom || dateTo || filterBranchId);
  const totalPages = Math.ceil(meta.total / limit);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post(`/cafes/${cafeId}/branches`, { name: branchName, location: branchLocation || null });
      toast.success("Branch created!"); setCreateBranch(false); setBranchName(""); setBranchLocation(""); load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const handleEditBranch = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editBranch) return; setSaving(true);
    try {
      await api.put(`/cafes/${cafeId}/branches/${editBranch.id}`, { name: branchName, location: branchLocation || null });
      toast.success("Branch updated!"); setEditBranch(null); load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const handleDeleteBranch = async (b: Branch) => {
    if (!confirm(`Delete branch "${b.name}"?`)) return;
    try {
      await api.delete(`/cafes/${cafeId}/branches/${b.id}`);
      toast.success("Branch deleted!"); load();
    } catch (e: any) { toast.error(e.message); }
  };



  if (loading) return (
    <div style={{ display: "grid", gap: 24 }}>
      {/* Header skeleton */}
      <div className="page-header">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Skeleton width={60} height={12} />
          <Skeleton width={200} height={26} />
          <Skeleton width={100} height={13} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Skeleton width={120} height={38} borderRadius={10} />
          <Skeleton width={120} height={38} borderRadius={10} />
        </div>
      </div>
      {/* Branches skeleton */}
      <Skeleton width={160} height={20} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Skeleton width="60%" height={18} />
            <Skeleton width="40%" height={13} />
            <div style={{ display: "flex", gap: 8 }}>
              <Skeleton width={90} height={30} borderRadius={8} />
              <Skeleton width={80} height={30} borderRadius={8} />
            </div>
          </div>
        ))}
      </div>
      {/* Orders skeleton */}
      <Skeleton width={140} height={20} />
      <div className="card">
        {[1,2,3,4].map(i => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr", gap: 16, padding: "14px 0", borderBottom: "1px solid var(--border-subtle)" }}>
            <Skeleton width="60%" height={14} />
            <Skeleton width="50%" height={22} borderRadius={99} />
            <Skeleton width="70%" height={14} />
            <Skeleton width="80%" height={14} />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 13 }}>
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
          <div className="page-title">{cafe?.name}</div>
          <div className="page-subtitle">Café ID: #{cafeId}</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-primary" onClick={() => { setBranchName(""); setBranchLocation(""); setCreateBranch(true); }}>
            <Plus size={15} /> Add Branch
          </button>
        </div>
      </div>

      {/* AI Historical Intelligence & Predictive Sales Forecasting Graph */}
      <div style={{ marginBottom: 32 }}>
        <HistoricalPredictionChart cafeId={parseInt(cafeId)} cafeName={cafe?.name} />
      </div>

      {/* Branches */}
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
        <GitBranch size={16} style={{ marginRight: 8, display: "inline" }} />
        Branches ({branches.length})
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: 40, alignItems: "start" }}>
        {branches.map(b => (
          <Card key={b.id} style={{ position: "relative" }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{b.name}</div>
            {b.location && <div style={{ color: "var(--text-muted)", fontSize: 13, display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
              <MapPin size={12} /> {b.location}
            </div>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <Link href={`/branches/${b.id}/menu?cafeId=${cafeId}`} className="btn btn-ghost btn-sm"><UtensilsCrossed size={12} /> Branch Menu</Link>
              <Link href={`/branches/${b.id}/orders?cafeId=${cafeId}`} className="btn btn-ghost btn-sm"><ShoppingCart size={12} /> Orders</Link>
              <Link href={`/branches/${b.id}/stock?cafeId=${cafeId}`} className="btn btn-ghost btn-sm"><GitBranch size={12} /> Stock</Link>
              <button className="btn btn-ghost btn-sm" onClick={() => { setEditBranch(b); setBranchName(b.name); setBranchLocation(b.location || ""); }}>
                <Pencil size={12} /> Edit
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => handleDeleteBranch(b)}>
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </Card>
        ))}
        {branches.length === 0 && <div style={{ color: "var(--text-muted)", fontSize: 14 }}>No branches yet.</div>}
      </div>

      {/* Café-wide Orders */}
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
        <ShoppingCart size={16} style={{ marginRight: 8, display: "inline" }} />
        All Orders — Showing {ordersList.length} of {meta.total}
      </h3>
      
      <OrdersFilterBar 
        search={search}
        status={statusFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        branchId={filterBranchId}
        onFilterChange={updateQueryParam}
        onClearFilters={clearFilters}
        showBranchFilter={true}
        branches={branches}
      />

      <OrderTable 
        orders={ordersList as any}
        loading={loading || loadingOrders}
        branchMode={false}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        hasFiltersActive={hasFiltersActive}
        onClearFilters={clearFilters}
      />

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginTop: 24, marginBottom: 40 }}>
          <button 
            className="btn btn-secondary" 
            disabled={page <= 1} 
            onClick={() => updateQueryParam("page", String(page - 1))}
          >
            Previous
          </button>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Page {page} of {totalPages}
          </span>
          <button 
            className="btn btn-secondary" 
            disabled={page >= totalPages} 
            onClick={() => updateQueryParam("page", String(page + 1))}
          >
            Next
          </button>
        </div>
      )}

      {/* Stock Rollup */}
      {currentUser?.role === "CAFE_OWNER" || currentUser?.role === "SUPER_ADMIN" ? (
        <>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, marginTop: 40 }}>
            <GitBranch size={16} style={{ marginRight: 8, display: "inline" }} />
            All Branches Stock Rollup
          </h3>
          <Card padding="none" style={{ marginBottom: 40 }}>
            {stockRollup.length === 0 ? (
              <EmptyState icon={GitBranch} title="No items in stock" subtitle="Add items to branch menus to track stock." />
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell isHeader>Item</TableCell>
                    <TableCell isHeader>Branch</TableCell>
                    <TableCell isHeader>Qty</TableCell>
                    <TableCell isHeader>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stockRollup.map(item => {
                    let statusText = "In Stock";
                    let color = "var(--success)";
                    let bg = "var(--success-glow)";
                    if (item.isInStock === false) { statusText = "Sold Out (Manual Override)"; color = "var(--danger)"; bg = "var(--danger-glow)"; }
                    else if (item.availableQuantity === 0) { statusText = "Sold Out"; color = "var(--danger)"; bg = "var(--danger-glow)"; }
                    else if (item.availableQuantity !== null && item.availableQuantity <= item.lowStockThreshold) { statusText = "Low Stock"; color = "var(--warning)"; bg = "var(--warning-glow)"; }
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell style={{ fontWeight: 600 }}>{item.masterItem.name}</TableCell>
                        <TableCell style={{ color: "var(--text-muted)", fontSize: 13 }}>{item.branch.name}</TableCell>
                        <TableCell style={{ fontFamily: "monospace" }}>{item.availableQuantity ?? '∞'}</TableCell>
                        <TableCell>
                          <span style={{
                            background: bg,
                            color: color,
                            padding: "4px 8px",
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600
                          }}>
                            {statusText}
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        </>
      ) : null}

      {/* Create Branch Modal */}
      <Modal open={createBranch} onClose={() => setCreateBranch(false)} title="Add Branch">
        <form onSubmit={handleCreateBranch} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div><label>Branch Name</label><input value={branchName} onChange={e => setBranchName(e.target.value)} placeholder="e.g. Downtown HQ" required /></div>
          <div><label>Location (optional)</label><input value={branchLocation} onChange={e => setBranchLocation(e.target.value)} placeholder="e.g. 123 Main St" /></div>
          <button className="btn btn-primary" type="submit" disabled={saving} style={{ justifyContent: "center" }}>{saving ? "Creating..." : "Create Branch"}</button>
        </form>
      </Modal>

      {/* Edit Branch Modal */}
      <Modal open={!!editBranch} onClose={() => setEditBranch(null)} title={`Edit: ${editBranch?.name}`}>
        <form onSubmit={handleEditBranch} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div><label>Branch Name</label><input value={branchName} onChange={e => setBranchName(e.target.value)} required /></div>
          <div><label>Location</label><input value={branchLocation} onChange={e => setBranchLocation(e.target.value)} /></div>
          <button className="btn btn-primary" type="submit" disabled={saving} style={{ justifyContent: "center" }}>{saving ? "Saving..." : "Save Changes"}</button>
        </form>
      </Modal>


    </div>
  );
}
