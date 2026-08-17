"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { BranchMenuItem } from "@/types/menu";
import BranchMenuTable from "@/components/menu/BranchMenuTable";
import BranchMenuModals, { BranchMenuFormState } from "@/components/menu/BranchMenuModals";

export default function BranchMenuPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const router = useRouter();
  
  const [items, setItems] = useState<BranchMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [upsertModal, setUpsertModal] = useState(false);
  const [editItem, setEditItem] = useState<BranchMenuItem | null>(null);
  
  const [form, setForm] = useState<BranchMenuFormState>({ 
    masterItemId: "", 
    priceOverride: "", 
    availableQuantity: "0", 
    isInfinite: true, 
    isInStock: true, 
    isActive: true 
  });

  const load = async () => {
    try {
      const data = await api.get<BranchMenuItem[]>(`/branches/${branchId}/menu`);
      setItems(data);
    } catch (e: any) { 
      toast.error(e.message); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { load(); }, [branchId]);

  const handlePatch = async (item: BranchMenuItem, patch: Record<string, unknown>) => {
    try {
      await api.patch(`/branches/${branchId}/menu/${item.id}`, patch);
      toast.success("Updated!"); 
      load();
    } catch (e: any) { 
      toast.error(e.message); 
    }
  };

  const handleEditClick = (item: BranchMenuItem) => {
    setEditItem(item); 
    setForm({ 
      masterItemId: String(item.masterItem.id), 
      priceOverride: item.priceOverride ? String(item.priceOverride) : "", 
      availableQuantity: item.availableQuantity !== null ? String(item.availableQuantity) : "0", 
      isInfinite: item.availableQuantity === null, 
      isInStock: item.isInStock, 
      isActive: item.isActive 
    });
  };

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
        <button className="btn btn-primary" onClick={() => { 
          setForm({ masterItemId: "", priceOverride: "", availableQuantity: "0", isInfinite: true, isInStock: true, isActive: true }); 
          setUpsertModal(true); 
        }}>
          <Plus size={16} /> Upsert Item
        </button>
      </div>

      <BranchMenuTable 
        items={items}
        loading={loading}
        onEdit={handleEditClick}
        onPatch={handlePatch}
      />

      <BranchMenuModals 
        branchId={branchId}
        upsertModal={upsertModal}
        setUpsertModal={setUpsertModal}
        editItem={editItem}
        setEditItem={setEditItem}
        form={form}
        setForm={setForm}
        onSuccess={load}
      />
    </div>
  );
}
