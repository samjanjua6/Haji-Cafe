"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, ArrowLeft, Tag, UtensilsCrossed } from "lucide-react";
import { api } from "@/lib/api";
import Modal from "@/components/Modal";
import toast from "react-hot-toast";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";
import CafeSubnav from "@/components/cafes/CafeSubnav";

interface MenuItem { id: number; name: string; description: string | null; basePrice: number; isDeleted: boolean; category: { name: string } | null; }
interface Category { id: number; name: string; }

export default function MasterMenuPage() {
  const { cafeId } = useParams<{ cafeId: string }>();
  const router = useRouter();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<MenuItem | null>(null);
  const [form, setForm] = useState({ name: "", description: "", basePrice: "", categoryId: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const data = await api.get<MenuItem[]>(`/cafes/${cafeId}/menu`);
      setItems(data);
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [cafeId]);

  const resetForm = () => setForm({ name: "", description: "", basePrice: "", categoryId: "" });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post(`/cafes/${cafeId}/menu`, {
        name: form.name,
        description: form.description || null,
        base_price: parseFloat(form.basePrice),
        category_id: form.categoryId ? parseInt(form.categoryId) : null,
      });
      toast.success("Item created!"); setModal(null); resetForm(); load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selected) return; setSaving(true);
    try {
      await api.put(`/cafes/${cafeId}/menu/${selected.id}`, {
        name: form.name,
        description: form.description || null,
        base_price: parseFloat(form.basePrice),
      });
      toast.success("Item updated!"); setModal(null); resetForm(); load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const handleDelete = async (item: MenuItem) => {
    if (!confirm(`Soft-delete "${item.name}"?`)) return;
    try {
      await api.delete(`/cafes/${cafeId}/menu/${item.id}`);
      toast.success("Item deleted (soft)!"); load();
    } catch (e: any) { toast.error(e.message); }
  };


  return (
    <div>
      <CafeSubnav cafeId={cafeId} />
      <div className="page-header">
        <div>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 13 }}>
            <ArrowLeft size={14} /> Back
          </button>
          <div className="page-title">Master Menu</div>
          <div className="page-subtitle">Café-wide menu items for café #{cafeId}</div>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setModal("create"); }}>
          <Plus size={16} /> Add Item
        </button>
      </div>

      <div className="card table-wrap">
        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title="No menu items yet"
            subtitle="Add items to this café's master menu. Branch overrides can be set per branch."
          />
        ) : (
          <table>
            <thead><tr><th>ID</th><th>Name</th><th>Category</th><th>Base Price</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} style={{ opacity: item.isDeleted ? 0.4 : 1 }}>
                  <td style={{ color: "var(--text-muted)" }}>#{item.id}</td>
                  <td style={{ fontWeight: 600 }}>
                    {item.name}
                    {item.description && <div style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 400 }}>{item.description}</div>}
                  </td>
                  <td>
                    {item.category ? (
                      <span style={{ background: "var(--bg-surface)", padding: "3px 10px", borderRadius: 999, fontSize: 12, display: "flex", alignItems: "center", gap: 4, width: "fit-content" }}>
                        <Tag size={10} /> {item.category.name}
                      </span>
                    ) : <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Uncategorized</span>}
                  </td>
                  <td style={{ fontWeight: 700, color: "var(--accent)" }}>${Number(item.basePrice).toFixed(2)}</td>
                  <td>
                    <span style={{
                      background: item.isDeleted ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
                      color: item.isDeleted ? "var(--danger)" : "var(--success)",
                      border: `1px solid ${item.isDeleted ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
                      padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                    }}>
                      {item.isDeleted ? "Deleted" : "Active"}
                    </span>
                  </td>
                  <td>
                    {!item.isDeleted && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setSelected(item); setForm({ name: item.name, description: item.description || "", basePrice: String(item.basePrice), categoryId: "" }); setModal("edit"); }}>
                          <Pencil size={13} /> Edit
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item)}>
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modal === "create"} onClose={() => setModal(null)} title="Add Menu Item">
        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div><label>Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Latte" required /></div>
          <div><label>Description</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description" /></div>
          <div><label>Base Price ($)</label><input type="number" step="0.01" value={form.basePrice} onChange={e => setForm({ ...form, basePrice: e.target.value })} placeholder="4.50" required /></div>
          <div><label>Category ID (optional)</label><input type="number" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} placeholder="e.g. 1" /></div>
          <button className="btn btn-primary" type="submit" disabled={saving} style={{ justifyContent: "center" }}>{saving ? "Creating..." : "Create Item"}</button>
        </form>
      </Modal>

      <Modal open={modal === "edit"} onClose={() => setModal(null)} title={`Edit: ${selected?.name}`}>
        <form onSubmit={handleEdit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div><label>Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
          <div><label>Description</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div><label>Base Price ($)</label><input type="number" step="0.01" value={form.basePrice} onChange={e => setForm({ ...form, basePrice: e.target.value })} required /></div>
          <button className="btn btn-primary" type="submit" disabled={saving} style={{ justifyContent: "center" }}>{saving ? "Saving..." : "Save Changes"}</button>
        </form>
      </Modal>
    </div>
  );
}
