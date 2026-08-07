"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, ArrowLeft, Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import { api } from "@/lib/api";
import Modal from "@/components/Modal";
import toast from "react-hot-toast";

interface BranchMenuItem {
  id: number;
  priceOverride: number | null;
  availableQuantity: number | null;
  isInStock: boolean;
  isActive: boolean;
  effectivePrice: number;
  masterItem: { id: number; name: string; basePrice: number; };
}

export default function BranchMenuPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const router = useRouter();
  const [items, setItems] = useState<BranchMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [upsertModal, setUpsertModal] = useState(false);
  const [editItem, setEditItem] = useState<BranchMenuItem | null>(null);
  const [form, setForm] = useState({ masterItemId: "", priceOverride: "", availableQuantity: "", isInStock: true, isActive: true });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const data = await api.get<BranchMenuItem[]>(`/branches/${branchId}/menu`);
      setItems(data);
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [branchId]);

  const handleUpsert = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post(`/branches/${branchId}/menu`, {
        master_item_id: parseInt(form.masterItemId),
        price_override: form.priceOverride ? parseFloat(form.priceOverride) : null,
        available_quantity: form.availableQuantity ? parseInt(form.availableQuantity, 10) : null,
        is_in_stock: form.isInStock,
        is_active: form.isActive,
      });
      toast.success("Branch menu item upserted!"); setUpsertModal(false); load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const handlePatch = async (item: BranchMenuItem, patch: Record<string, unknown>) => {
    try {
      await api.patch(`/branches/${branchId}/menu/${item.id}`, patch);
      toast.success("Updated!"); load();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editItem) return; setSaving(true);
    try {
      await api.patch(`/branches/${branchId}/menu/${editItem.id}`, {
        price_override: form.priceOverride ? parseFloat(form.priceOverride) : null,
        available_quantity: form.availableQuantity ? parseInt(form.availableQuantity, 10) : null,
        is_in_stock: form.isInStock,
        is_active: form.isActive,
      });
      toast.success("Updated!"); setEditItem(null); load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 13 }}>
            <ArrowLeft size={14} /> Back
          </button>
          <div className="page-title">Branch Menu</div>
          <div className="page-subtitle">Overrides for branch #{branchId}</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ masterItemId: "", priceOverride: "", availableQuantity: "", isInStock: true, isActive: true }); setUpsertModal(true); }}>
          <Plus size={16} /> Upsert Item
        </button>
      </div>

      <div className="card table-wrap">
        {items.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>No branch menu items. Add overrides from the master menu.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Item</th><th>Base Price</th><th>Override</th><th>Effective Price</th><th>Avail. Qty</th><th>In Stock</th><th>Active</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600 }}>{item.masterItem.name}</td>
                  <td style={{ color: "var(--text-muted)" }}>${Number(item.masterItem.basePrice).toFixed(2)}</td>
                  <td style={{ color: item.priceOverride ? "var(--accent)" : "var(--text-muted)" }}>
                    {item.priceOverride ? `$${Number(item.priceOverride).toFixed(2)}` : "—"}
                  </td>
                  <td style={{ fontWeight: 700, color: "var(--accent)" }}>${Number(item.effectivePrice).toFixed(2)}</td>
                  <td style={{ color: item.availableQuantity !== null ? "var(--text)" : "var(--text-muted)" }}>
                    {item.availableQuantity !== null ? item.availableQuantity : "∞"}
                  </td>
                  <td>
                    <button onClick={() => handlePatch(item, { is_in_stock: !item.isInStock })} style={{ background: "none", border: "none", cursor: "pointer" }}>
                      {item.isInStock ? <ToggleRight size={22} color="#22c55e" /> : <ToggleLeft size={22} color="#ef4444" />}
                    </button>
                  </td>
                  <td>
                    <button onClick={() => handlePatch(item, { is_active: !item.isActive })} style={{ background: "none", border: "none", cursor: "pointer" }}>
                      {item.isActive ? <ToggleRight size={22} color="#22c55e" /> : <ToggleLeft size={22} color="#ef4444" />}
                    </button>
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditItem(item); setForm({ masterItemId: String(item.masterItem.id), priceOverride: item.priceOverride ? String(item.priceOverride) : "", availableQuantity: item.availableQuantity !== null ? String(item.availableQuantity) : "", isInStock: item.isInStock, isActive: item.isActive }); }}>
                      <Pencil size={13} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={upsertModal} onClose={() => setUpsertModal(false)} title="Upsert Branch Menu Item">
        <form onSubmit={handleUpsert} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div><label>Master Item ID</label><input type="number" value={form.masterItemId} onChange={e => setForm({ ...form, masterItemId: e.target.value })} placeholder="e.g. 1" required /></div>
          <div><label>Price Override ($) — leave blank to use base price</label><input type="number" step="0.01" value={form.priceOverride} onChange={e => setForm({ ...form, priceOverride: e.target.value })} placeholder="e.g. 5.00" /></div>
          <div><label>Available Quantity — leave blank for infinite</label><input type="number" value={form.availableQuantity} onChange={e => setForm({ ...form, availableQuantity: e.target.value })} placeholder="e.g. 50" /></div>
          <div style={{ display: "flex", gap: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={form.isInStock} onChange={e => setForm({ ...form, isInStock: e.target.checked })} style={{ width: "auto" }} />
              In Stock
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} style={{ width: "auto" }} />
              Active
            </label>
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving} style={{ justifyContent: "center" }}>{saving ? "Saving..." : "Upsert Item"}</button>
        </form>
      </Modal>

      <Modal open={!!editItem} onClose={() => setEditItem(null)} title={`Edit: ${editItem?.masterItem.name}`}>
        <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div><label>Price Override ($) — leave blank to use base price</label><input type="number" step="0.01" value={form.priceOverride} onChange={e => setForm({ ...form, priceOverride: e.target.value })} /></div>
          <div><label>Available Quantity — leave blank for infinite</label><input type="number" value={form.availableQuantity} onChange={e => setForm({ ...form, availableQuantity: e.target.value })} placeholder="e.g. 50" /></div>
          <div style={{ display: "flex", gap: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={form.isInStock} onChange={e => setForm({ ...form, isInStock: e.target.checked })} style={{ width: "auto" }} />
              In Stock
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} style={{ width: "auto" }} />
              Active
            </label>
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving} style={{ justifyContent: "center" }}>{saving ? "Saving..." : "Save Changes"}</button>
        </form>
      </Modal>
    </div>
  );
}
