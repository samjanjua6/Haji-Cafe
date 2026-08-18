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

interface Cafe { id: number; name: string; createdAt: string; }
interface Branch { id: number; name: string; location: string | null; }
interface Order { id: number; status: string; totalAmount: number; createdAt: string; }
interface Staff { id: number; email: string; role: string; }

export default function CafeDetailPage() {
  const { cafeId } = useParams<{ cafeId: string }>();
  const router = useRouter();
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  // Branch modals
  const [createBranch, setCreateBranch] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [branchName, setBranchName] = useState("");
  const [branchLocation, setBranchLocation] = useState("");
  const [saving, setSaving] = useState(false);


  const [currentUser, setCurrentUser] = useState<any>(null);

  const load = async () => {
    try {
      const [c, b, o, s, user] = await Promise.all([
        api.get<Cafe>(`/cafes/${cafeId}`),
        api.get<Branch[]>(`/cafes/${cafeId}/branches`),
        api.get<Order[]>(`/cafes/${cafeId}/orders`),
        api.get<Staff[]>(`/cafes/${cafeId}/staff`),
        api.get<any>("/auth/me"),
      ]);
      setCafe(c); setBranches(b); setOrders(o); setStaffList(s); setCurrentUser(user);
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [cafeId]);

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

      {/* Branches */}
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
        <GitBranch size={16} style={{ marginRight: 8, display: "inline" }} />
        Branches ({branches.length})
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: 40 }}>
        {branches.map(b => (
          <div key={b.id} className="card" style={{ position: "relative" }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{b.name}</div>
            {b.location && <div style={{ color: "var(--text-muted)", fontSize: 13, display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
              <MapPin size={12} /> {b.location}
            </div>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <Link href={`/branches/${b.id}/menu?cafeId=${cafeId}`} className="btn btn-ghost btn-sm"><UtensilsCrossed size={12} /> Branch Menu</Link>
              <Link href={`/branches/${b.id}/orders?cafeId=${cafeId}`} className="btn btn-ghost btn-sm"><ShoppingCart size={12} /> Orders</Link>
              <button className="btn btn-ghost btn-sm" onClick={() => { setEditBranch(b); setBranchName(b.name); setBranchLocation(b.location || ""); }}>
                <Pencil size={12} /> Edit
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => handleDeleteBranch(b)}>
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </div>
        ))}
        {branches.length === 0 && <div style={{ color: "var(--text-muted)", fontSize: 14 }}>No branches yet.</div>}
      </div>

      {/* Café-wide Orders */}
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
        <ShoppingCart size={16} style={{ marginRight: 8, display: "inline" }} />
        All Orders ({orders.length})
      </h3>
      <div className="card table-wrap">
        {orders.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="No orders yet"
            subtitle="Orders placed across all branches of this café will appear here."
          />
        ) : (
          <table>
            <thead><tr><th>Order ID</th><th>Status</th><th>Total</th><th>Date</th></tr></thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td style={{ color: "var(--text-muted)", fontFamily: "monospace", fontSize: 13 }}>#{o.id}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td style={{ fontWeight: 700, color: "var(--accent)" }}>${Number(o.totalAmount).toFixed(2)}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
