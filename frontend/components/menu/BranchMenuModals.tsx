"use client";

import Modal from "@/components/Modal";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { BranchMenuItem } from "@/types/menu";
import { Dispatch, SetStateAction, useState } from "react";

export interface BranchMenuFormState {
  masterItemId: string;
  priceOverride: string;
  availableQuantity: string;
  isInfinite: boolean;
  isInStock: boolean;
  isActive: boolean;
}

interface BranchMenuModalsProps {
  branchId: string;
  upsertModal: boolean;
  setUpsertModal: (open: boolean) => void;
  editItem: BranchMenuItem | null;
  setEditItem: (item: BranchMenuItem | null) => void;
  form: BranchMenuFormState;
  setForm: Dispatch<SetStateAction<BranchMenuFormState>>;
  onSuccess: () => void;
}

export default function BranchMenuModals({
  branchId,
  upsertModal,
  setUpsertModal,
  editItem,
  setEditItem,
  form,
  setForm,
  onSuccess,
}: BranchMenuModalsProps) {
  const [saving, setSaving] = useState(false);

  const handleUpsert = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setSaving(true);
    try {
      await api.post(`/branches/${branchId}/menu`, {
        master_item_id: parseInt(form.masterItemId),
        price_override: form.priceOverride ? parseFloat(form.priceOverride) : null,
        available_quantity: form.isInfinite ? null : parseInt(form.availableQuantity || "0", 10),
        is_in_stock: form.isInStock,
        is_active: form.isActive,
      });
      toast.success("Branch menu item upserted!"); 
      setUpsertModal(false); 
      onSuccess();
    } catch (e: any) { 
      toast.error(e.message); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!editItem) return; 
    setSaving(true);
    try {
      await api.patch(`/branches/${branchId}/menu/${editItem.id}`, {
        price_override: form.priceOverride ? parseFloat(form.priceOverride) : null,
        available_quantity: form.isInfinite ? null : parseInt(form.availableQuantity || "0", 10),
        is_in_stock: form.isInStock,
        is_active: form.isActive,
      });
      toast.success("Updated!"); 
      setEditItem(null); 
      onSuccess();
    } catch (e: any) { 
      toast.error(e.message); 
    } finally { 
      setSaving(false); 
    }
  };

  return (
    <>
      <Modal open={upsertModal} onClose={() => setUpsertModal(false)} title="Upsert Branch Menu Item">
        <form onSubmit={handleUpsert} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label>Master Item ID</label>
            <input type="number" value={form.masterItemId} onChange={e => setForm({ ...form, masterItemId: e.target.value })} placeholder="e.g. 1" required />
          </div>
          <div>
            <label>Price Override ($) — leave blank to use base price</label>
            <input type="number" step="0.01" value={form.priceOverride} onChange={e => setForm({ ...form, priceOverride: e.target.value })} placeholder="e.g. 5.00" />
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={form.isInfinite} onChange={e => setForm({ ...form, isInfinite: e.target.checked })} style={{ width: "auto" }} />
              Infinite Stock
            </label>
            {!form.isInfinite && (
              <div style={{ flex: 1 }}>
                <label>Available Quantity</label>
                <input type="number" min="0" value={form.availableQuantity} onChange={e => setForm({ ...form, availableQuantity: e.target.value })} placeholder="e.g. 50" required />
              </div>
            )}
          </div>
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
          <button className="btn btn-primary" type="submit" disabled={saving} style={{ justifyContent: "center" }}>
            {saving ? "Saving..." : "Upsert Item"}
          </button>
        </form>
      </Modal>

      <Modal open={!!editItem} onClose={() => setEditItem(null)} title={`Edit: ${editItem?.masterItem.name}`}>
        <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label>Price Override ($) — leave blank to use base price</label>
            <input type="number" step="0.01" value={form.priceOverride} onChange={e => setForm({ ...form, priceOverride: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={form.isInfinite} onChange={e => setForm({ ...form, isInfinite: e.target.checked })} style={{ width: "auto" }} />
              Infinite Stock
            </label>
            {!form.isInfinite && (
              <div style={{ flex: 1 }}>
                <label>Available Quantity</label>
                <input type="number" min="0" value={form.availableQuantity} onChange={e => setForm({ ...form, availableQuantity: e.target.value })} placeholder="e.g. 50" required />
              </div>
            )}
          </div>
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
          <button className="btn btn-primary" type="submit" disabled={saving} style={{ justifyContent: "center" }}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </Modal>
    </>
  );
}
