"use client";

import Modal from "@/components/Modal";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { BranchMenuItem } from "@/types/menu";
import { Dispatch, SetStateAction } from "react";
import { useMutation } from "@tanstack/react-query";

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

  const upsertMutation = useMutation({
    mutationFn: (data: any) => api.post(`/branches/${branchId}/menu`, data),
    onSuccess: () => {
      toast.success("Branch menu item upserted!"); 
      setUpsertModal(false); 
      onSuccess();
    },
    onError: (e: any) => toast.error(e.message)
  });

  const editMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/branches/${branchId}/menu/${editItem!.id}`, data),
    onSuccess: () => {
      toast.success("Updated!"); 
      setEditItem(null); 
      onSuccess();
    },
    onError: (e: any) => toast.error(e.message)
  });

  const handleUpsert = (e: React.FormEvent) => {
    e.preventDefault(); 
    upsertMutation.mutate({
      master_item_id: parseInt(form.masterItemId),
      price_override: form.priceOverride ? parseFloat(form.priceOverride) : null,
      available_quantity: form.isInfinite ? null : parseInt(form.availableQuantity || "0", 10),
      is_in_stock: form.isInStock,
      is_active: form.isActive,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!editItem) return; 
    editMutation.mutate({
      price_override: form.priceOverride ? parseFloat(form.priceOverride) : null,
      available_quantity: form.isInfinite ? null : parseInt(form.availableQuantity || "0", 10),
      is_in_stock: form.isInStock,
      is_active: form.isActive,
    });
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
          <button className="btn btn-primary" type="submit" disabled={upsertMutation.isPending} style={{ justifyContent: "center" }}>
            {upsertMutation.isPending ? "Saving..." : "Upsert Item"}
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
          <button className="btn btn-primary" type="submit" disabled={editMutation.isPending} style={{ justifyContent: "center" }}>
            {editMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </Modal>
    </>
  );
}
