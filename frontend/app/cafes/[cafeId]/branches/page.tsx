"use client";
import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  GitBranch,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  UtensilsCrossed,
  ShoppingCart,
  ArrowLeft,
  Search,
  Building2,
  Package,
  Calendar,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { api } from "@/lib/api";
import Modal from "@/components/Modal";
import toast from "react-hot-toast";
import { Card } from "@/components/Card";
import { Skeleton } from "@/components/LoadingSkeleton";
import CafeSubnav from "@/components/cafes/CafeSubnav";
import EmptyState from "@/components/EmptyState";
import { formatDate } from "@/lib/format";

interface Cafe {
  id: number;
  name: string;
  createdAt?: string;
}

interface Branch {
  id: number;
  name: string;
  location: string | null;
  createdAt: string;
}

type SortOption = "newest" | "oldest" | "az" | "za";

// ── Branch status badge helper ────────────────────────────────────────────────
function getBranchStatus(branchId: number, menuCounts: Record<number, number>) {
  const count = menuCounts[branchId];
  if (count === undefined) return null;
  if (count === 0) return { label: "No Menu",    color: "var(--danger)",  glow: "var(--danger-glow)"  };
  if (count < 3)  return { label: "Incomplete",  color: "var(--warning)", glow: "var(--warning-glow)" };
  return             { label: "Active",      color: "var(--success)", glow: "var(--success-glow)" };
}

// ── Small KPI Card component ──────────────────────────────────────────────────
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
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: iconBg, color: iconColor,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BranchesManagementPage() {
  const { cafeId } = useParams<{ cafeId: string }>();
  const router = useRouter();

  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [branchMenuCounts, setBranchMenuCounts] = useState<Record<number, number>>({});
  const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);

  // Modal states
  const [createModal, setCreateModal] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);
  const [branchName, setBranchName] = useState("");
  const [branchLocation, setBranchLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Load data ──────────────────────────────────────────────────────────────
  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [c, b, alerts] = await Promise.all([
        api.get<Cafe>(`/cafes/${cafeId}`),
        api.get<Branch[]>(`/cafes/${cafeId}/branches`),
        api.get<any[]>(`/cafes/${cafeId}/low-stock-alerts`).catch(() => []),
      ]);
      setCafe(c);
      setBranches(b);
      setLowStockAlerts(alerts);

      // Fetch menu item count for each branch in parallel (for status badge)
      const menuCounts = await Promise.all(
        b.map((branch: Branch) =>
          api
            .get<any[]>(`/branches/${branch.id}/menu`)
            .then((items) => ({ id: branch.id, count: items.length }))
            .catch(() => ({ id: branch.id, count: 0 }))
        )
      );
      const countMap: Record<number, number> = {};
      menuCounts.forEach(({ id, count }) => { countMap[id] = count; });
      setBranchMenuCounts(countMap);
    } catch (e: any) {
      toast.error(e.message || "Failed to load branches data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (cafeId) load();
  }, [cafeId]);

  // ── Derived KPI values ─────────────────────────────────────────────────────
  const branchesWithLowStock = useMemo(
    () => new Set(lowStockAlerts.map((a: any) => a.branchId)).size,
    [lowStockAlerts]
  );

  // ── Sorted + filtered branches ─────────────────────────────────────────────
  const filteredBranches = useMemo(() => {
    let result = branches.filter((b) => {
      const q = searchQuery.toLowerCase();
      return b.name.toLowerCase().includes(q) || (b.location?.toLowerCase().includes(q) ?? false);
    });
    switch (sortBy) {
      case "newest": result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
      case "oldest": result = [...result].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); break;
      case "az":     result = [...result].sort((a, b) => a.name.localeCompare(b.name)); break;
      case "za":     result = [...result].sort((a, b) => b.name.localeCompare(a.name)); break;
    }
    return result;
  }, [branches, searchQuery, sortBy]);

  // ── CRUD handlers ──────────────────────────────────────────────────────────
  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) return toast.error("Branch name is required");
    setSaving(true);
    try {
      await api.post(`/cafes/${cafeId}/branches`, {
        name: branchName.trim(),
        location: branchLocation.trim() || null,
      });
      toast.success("Branch created successfully!");
      setCreateModal(false);
      setBranchName(""); setBranchLocation("");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to create branch");
    } finally {
      setSaving(false);
    }
  };

  const handleEditBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBranch) return;
    if (!branchName.trim()) return toast.error("Branch name is required");
    setSaving(true);
    try {
      await api.put(`/cafes/${cafeId}/branches/${editBranch.id}`, {
        name: branchName.trim(),
        location: branchLocation.trim() || null,
      });
      toast.success("Branch updated successfully!");
      setEditBranch(null);
      setBranchName(""); setBranchLocation("");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to update branch");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBranch = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/cafes/${cafeId}/branches/${deleteTarget.id}`);
      toast.success("Branch deleted successfully!");
      setDeleteTarget(null);
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete branch");
    } finally {
      setDeleting(false);
    }
  };

  // ── Unsaved changes guard for Edit Modal ───────────────────────────────────
  const isEditDirty = editBranch
    ? branchName !== editBranch.name || branchLocation !== (editBranch.location || "")
    : false;

  const handleEditClose = () => {
    if (isEditDirty && !confirm("You have unsaved changes. Discard them?")) return;
    setEditBranch(null);
  };

  // ── Skeleton loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: "grid", gap: 24 }}>
        <div className="page-header">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton width={100} height={14} />
            <Skeleton width={240} height={30} />
            <Skeleton width={160} height={14} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Skeleton width={36} height={36} borderRadius={8} />
            <Skeleton width={130} height={40} borderRadius={10} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          {[1, 2, 3].map((i) => <Skeleton key={i} height={88} borderRadius={12} />)}
        </div>
        <Skeleton height={42} borderRadius={10} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Skeleton width="70%" height={20} />
              <Skeleton width="45%" height={14} />
              <Skeleton width="35%" height={12} />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {[1, 2, 3].map((j) => <Skeleton key={j} width={80} height={30} borderRadius={8} />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      <CafeSubnav cafeId={cafeId} />
      {/* ── Header ── */}
      <div className="page-header" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <button
            onClick={() => router.push(`/cafes/${cafeId}`)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-muted)", display: "flex", alignItems: "center",
              gap: 6, marginBottom: 8, fontSize: 13, padding: 0,
            }}
          >
            <ArrowLeft size={14} /> Back to Overview
          </button>
          <div className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            Branches Management
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              title="Refresh branches"
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-muted)", display: "flex", padding: 4, borderRadius: 6,
                transition: "color 0.15s, background 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.background = "var(--bg-surface)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "none"; }}
            >
              <RefreshCw size={16} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            </button>
          </div>
          <div className="page-subtitle">
            Café:{" "}
            <strong style={{ color: "var(--text-primary)" }}>{cafe?.name}</strong>{" "}
            <span style={{ color: "var(--text-faint)", fontSize: 12 }}>(#{cafeId})</span>
          </div>
        </div>
        <button
          className="btn btn-primary"
          style={{ whiteSpace: "nowrap" }}
          onClick={() => { setBranchName(""); setBranchLocation(""); setCreateModal(true); }}
        >
          <Plus size={15} /> Add Branch
        </button>
      </div>

      {/* ── KPI Stats ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 16, marginBottom: 24,
      }}>
        <StatCard
          icon={<GitBranch size={22} />}
          iconBg="var(--accent-muted)"
          iconColor="var(--accent)"
          label="Total Branches"
          value={branches.length}
          sub={branches.length === 1 ? "1 branch" : `${branches.length} branches`}
        />
        <StatCard
          icon={<AlertTriangle size={22} />}
          iconBg="var(--warning-glow)"
          iconColor="var(--warning)"
          label="Low Stock Alerts"
          value={branchesWithLowStock}
          sub={branchesWithLowStock === 0 ? "All branches stocked" : `${branchesWithLowStock} branch${branchesWithLowStock > 1 ? "es" : ""} affected`}
        />
      </div>

      {/* ── Search + Sort Toolbar ── */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
          <Search size={16} style={{
            position: "absolute", left: 14, top: "50%",
            transform: "translateY(-50%)", color: "var(--text-muted)",
          }} />
          <input
            type="text"
            className="input"
            placeholder="Search by branch name or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 40, width: "100%" }}
          />
        </div>
        <select
          className="input"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          style={{ width: "auto", minWidth: 170, flexShrink: 0 }}
        >
          <option value="newest">Sort: Newest First</option>
          <option value="oldest">Sort: Oldest First</option>
          <option value="az">Sort: A → Z</option>
          <option value="za">Sort: Z → A</option>
        </select>
        {searchQuery && (
          <span style={{ fontSize: 13, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
            {filteredBranches.length} result{filteredBranches.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── Branch Cards Grid ── */}
      {filteredBranches.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={searchQuery ? "No matching branches found" : "No branches configured yet"}
          subtitle={
            searchQuery
              ? `No results for "${searchQuery}". Try a different keyword.`
              : "Get started by adding your first branch location to this café franchise."
          }
          action={
            searchQuery ? (
              <button className="btn btn-ghost btn-sm" onClick={() => setSearchQuery("")}>
                Clear Search
              </button>
            ) : (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => { setBranchName(""); setBranchLocation(""); setCreateModal(true); }}
              >
                <Plus size={14} /> Add First Branch
              </button>
            )
          }
        />
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 16, alignItems: "start",
        }}>
          {filteredBranches.map((b) => {
            const status = getBranchStatus(b.id, branchMenuCounts);
            return (
              <Card key={b.id} interactive style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {/* Card Header — name + ID badge */}
                <div style={{ padding: "0 0 10px 0" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)", lineHeight: 1.3 }}>
                      {b.name}
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: "var(--text-faint)",
                      background: "var(--bg-surface)", border: "1px solid var(--border)",
                      borderRadius: 6, padding: "2px 8px", flexShrink: 0, marginTop: 2,
                    }}>
                      #{b.id}
                    </span>
                  </div>

                  {/* Location */}
                  {b.location && (
                    <div style={{ color: "var(--text-muted)", fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}>
                      <MapPin size={12} style={{ flexShrink: 0 }} />
                      <span>{b.location}</span>
                    </div>
                  )}

                  {/* Created date + Status badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: "var(--text-faint)", display: "flex", alignItems: "center", gap: 4 }}>
                      <Calendar size={11} /> {formatDate(b.createdAt)}
                    </span>
                    {status && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "2px 10px",
                        borderRadius: 99, background: status.glow, color: status.color,
                        display: "inline-flex", alignItems: "center", gap: 4,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: status.color }} />
                        {status.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Navigation buttons row */}
                <div style={{
                  display: "flex", gap: 6, flexWrap: "wrap",
                  paddingTop: 10, borderTop: "1px solid var(--border)",
                }}>
                  <Link href={`/branches/${b.id}/menu?cafeId=${cafeId}`} className="btn btn-ghost btn-sm">
                    <UtensilsCrossed size={13} /> Branch Menu
                  </Link>
                  <Link href={`/branches/${b.id}/orders?cafeId=${cafeId}`} className="btn btn-ghost btn-sm">
                    <ShoppingCart size={13} /> Orders
                  </Link>
                  <Link href={`/branches/${b.id}/stock?cafeId=${cafeId}`} className="btn btn-ghost btn-sm">
                    <Package size={13} /> Stock
                  </Link>
                </div>

                {/* Action buttons row */}
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => { setEditBranch(b); setBranchName(b.name); setBranchLocation(b.location || ""); }}
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => setDeleteTarget(b)}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Create Branch Modal ── */}
      <Modal open={createModal} title="Add New Branch" onClose={() => setCreateModal(false)}>
        <form onSubmit={handleCreateBranch}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
              Branch Name *
            </label>
            <input
              className="input"
              required
              placeholder="e.g. Downtown HQ, Airport Terminal B"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              autoFocus
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
              Location / Address <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>(Optional)</span>
            </label>
            <input
              className="input"
              placeholder="e.g. 123 Main St, Terminal 2 Gate 4"
              value={branchLocation}
              onChange={(e) => setBranchLocation(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-ghost" onClick={() => setCreateModal(false)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Creating..." : "Create Branch"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Branch Modal ── */}
      <Modal
        open={!!editBranch}
        title={`Edit Branch: ${editBranch?.name || ""}`}
        onClose={handleEditClose}
      >
        <form onSubmit={handleEditBranch}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
              Branch Name *
            </label>
            <input
              className="input"
              required
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              autoFocus
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
              Location / Address <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>(Optional)</span>
            </label>
            <input
              className="input"
              placeholder="e.g. 123 Main St"
              value={branchLocation}
              onChange={(e) => setBranchLocation(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-ghost" onClick={handleEditClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving || !isEditDirty}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      <Modal open={!!deleteTarget} title="Delete Branch?" onClose={() => setDeleteTarget(null)}>
        <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7, marginBottom: 8 }}>
          Are you sure you want to delete{" "}
          <strong style={{ color: "var(--text-primary)" }}>{deleteTarget?.name}</strong>?
        </p>
        <p style={{ color: "var(--text-faint)", fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
          This action will permanently remove the branch and all associated data including orders, menu overrides, and stock history. This cannot be undone.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={handleDeleteBranch} disabled={deleting}>
            <Trash2 size={14} /> {deleting ? "Deleting..." : "Yes, Delete Branch"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
