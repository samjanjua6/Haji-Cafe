"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { GitBranch, UtensilsCrossed, ShoppingCart, ArrowLeft, MapPin, Plus, Pencil, Trash2, CalendarPlus, Users } from "lucide-react";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";
import Modal from "@/components/Modal";
import StatusBadge from "@/components/StatusBadge";
import toast from "react-hot-toast";
import Link from "next/link";
import { formatDate, formatCurrency } from "@/lib/format";

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

  // Meeting modal
  const [scheduleMeeting, setScheduleMeeting] = useState(false);
  const [meetingSummary, setMeetingSummary] = useState("");
  const [meetingDesc, setMeetingDesc] = useState("");
  const [meetingStart, setMeetingStart] = useState("");
  const [meetingEnd, setMeetingEnd] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<number[]>([]);
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

  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStaff.length === 0) return toast.error("Select at least one staff member.");
    
    setSaving(true);
    try {
      await api.post(`/cafes/${cafeId}/meetings`, {
        summary: meetingSummary,
        description: meetingDesc || null,
        start_time: new Date(meetingStart).toISOString(),
        end_time: new Date(meetingEnd).toISOString(),
        attendee_user_ids: selectedStaff,
      });
      toast.success("Meeting scheduled & invites sent!");
      setScheduleMeeting(false);
      setMeetingSummary(""); setMeetingDesc(""); setMeetingStart(""); setMeetingEnd(""); setSelectedStaff([]);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStaff = (id: number) => {
    if (selectedStaff.includes(id)) {
      setSelectedStaff(selectedStaff.filter(s => s !== id));
    } else {
      setSelectedStaff([...selectedStaff, id]);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <button onClick={() => router.back()} className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}>
            <ArrowLeft size={14} /> Back to Cafés
          </button>
          <div className="page-title">{cafe?.name}</div>
          <div className="page-subtitle">Café ID: #{cafeId}</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {currentUser?.role === "CAFE_OWNER" && (
            <button className="btn btn-ghost" onClick={() => setScheduleMeeting(true)} style={{ color: "var(--success)", background: "var(--success-bg)" }}>
              <CalendarPlus size={15} /> Schedule Meeting
            </button>
          )}
          <Link href={`/cafes/${cafeId}/menu`} className="btn btn-ghost">
            <UtensilsCrossed size={15} /> Master Menu
          </Link>
          <button className="btn btn-primary" onClick={() => { setBranchName(""); setBranchLocation(""); setCreateBranch(true); }}>
            <Plus size={15} /> Add Branch
          </button>
        </div>
      </div>

      {/* Branches */}
      <h3 className="font-heading" style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <GitBranch size={18} color="var(--primary)" />
        Branches ({branches.length})
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16, marginBottom: 40 }}>
        {branches.map(b => (
          <div key={b.id} className="card" style={{ position: "relative", display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>{b.name}</div>
              {b.location && <div style={{ color: "var(--text-secondary)", fontSize: 13, display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <MapPin size={14} /> {b.location}
              </div>}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: "auto" }}>
              <Link href={`/branches/${b.id}/orders`} className="btn btn-primary" style={{ flex: 1 }}>Manage Branch</Link>
              <button className="btn btn-ghost" onClick={() => { setEditBranch(b); setBranchName(b.name); setBranchLocation(b.location || ""); }}>
                <Pencil size={14} />
              </button>
              <button className="btn btn-danger" onClick={() => handleDeleteBranch(b)}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {branches.length === 0 && <div style={{ color: "var(--text-muted)", fontSize: 14 }}>No branches yet.</div>}
      </div>

      {/* Café-wide Orders */}
      <h3 className="font-heading" style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <ShoppingCart size={18} color="var(--primary)" />
        All Orders ({orders.length})
      </h3>
      <div className="card table-wrap">
        {orders.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>No orders found.</div>
        ) : (
          <table>
            <thead><tr><th>Order ID</th><th>Status</th><th>Total</th><th>Date</th></tr></thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td style={{ color: "var(--text-muted)" }}>#{o.id}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td style={{ fontWeight: 700, color: "var(--primary)" }}>{formatCurrency(o.totalAmount)}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{formatDate(o.createdAt)}</td>
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

      {/* Schedule Meeting Modal */}
      <Modal open={scheduleMeeting} onClose={() => setScheduleMeeting(false)} title="Schedule Staff Meeting">
        <form onSubmit={handleScheduleMeeting} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div><label>Meeting Subject</label><input value={meetingSummary} onChange={e => setMeetingSummary(e.target.value)} required placeholder="e.g. Weekly Branch Manager Sync" /></div>
          <div><label>Description (optional)</label><textarea value={meetingDesc} onChange={e => setMeetingDesc(e.target.value)} style={{ width: "100%", padding: 10, background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-main)", resize: "vertical" }} /></div>
          <div style={{ display: "flex", gap: 16, width: "100%", boxSizing: "border-box", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 200px" }}><label>Start Time</label><input type="datetime-local" value={meetingStart} onChange={e => setMeetingStart(e.target.value)} required style={{ width: "100%", boxSizing: "border-box" }} /></div>
            <div style={{ flex: "1 1 200px" }}><label>End Time</label><input type="datetime-local" value={meetingEnd} onChange={e => setMeetingEnd(e.target.value)} required style={{ width: "100%", boxSizing: "border-box" }} /></div>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}><Users size={14}/> Invite Staff Members</label>
              {staffList.length > 0 && (
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: "var(--accent)" }}>
                  <input 
                    type="checkbox" 
                    checked={selectedStaff.length === staffList.length} 
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStaff(staffList.map(s => s.id));
                      } else {
                        setSelectedStaff([]);
                      }
                    }} 
                  />
                  Select All
                </label>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 150, overflowY: "auto", overflowX: "hidden", padding: 10, background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 6 }}>
              {staffList.length === 0 ? <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No staff found for this café. Use Super Admin to assign staff.</div> : null}
              {staffList.map(s => (
                <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, width: "100%", justifyContent: "flex-start" }}>
                  <input type="checkbox" checked={selectedStaff.includes(s.id)} onChange={() => toggleStaff(s.id)} style={{ width: "auto", margin: 0, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontWeight: 600, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.email}</span>
                  <span style={{ fontSize: 11, background: "var(--bg-surface)", padding: "2px 6px", borderRadius: 4, whiteSpace: "nowrap", flexShrink: 0 }}>{s.role.replace("_", " ")}</span>
                </label>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving || selectedStaff.length === 0} style={{ justifyContent: "center", background: "#22c55e", color: "white", marginTop: 8 }}>
            <CalendarPlus size={16} /> {saving ? "Scheduling..." : "Create Calendar Invites"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
