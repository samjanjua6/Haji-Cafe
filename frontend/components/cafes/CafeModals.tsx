"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { Cafe } from "@/types/cafe";

interface CafeModalsProps {
  createOpen: boolean;
  setCreateOpen: (open: boolean) => void;
  editCafe: Cafe | null;
  setEditCafe: (cafe: Cafe | null) => void;
  onSuccess: () => void;
}

export default function CafeModals({
  createOpen,
  setCreateOpen,
  editCafe,
  setEditCafe,
  onSuccess,
}: CafeModalsProps) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync editCafe name when modal opens
  // A cleaner way is to handle it in the parent or use useEffect, 
  // but for simplicity, we'll keep the input controlled locally.

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/cafes", { name });
      toast.success("Café created!");
      setCreateOpen(false);
      setName("");
      onSuccess();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCafe) return;
    setSaving(true);
    try {
      await api.put(`/cafes/${editCafe.id}`, { name });
      toast.success("Café updated!");
      setEditCafe(null);
      setName("");
      onSuccess();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create New Café">
        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label>Café Name</label>
            <input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Haji Cafe Downtown" 
              required 
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving} style={{ justifyContent: "center" }}>
            {saving ? "Creating..." : "Create Café"}
          </button>
        </form>
      </Modal>

      <Modal open={!!editCafe} onClose={() => setEditCafe(null)} title={`Edit: ${editCafe?.name}`}>
        <form onSubmit={handleEdit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label>Café Name</label>
            <input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Café name" 
              required 
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving} style={{ justifyContent: "center" }}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </Modal>
    </>
  );
}
