"use client";
import { useRouter, useParams } from "next/navigation";
import { Plus, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { BranchMenuItem } from "@/types/menu";
import BranchMenuTable from "@/components/menu/BranchMenuTable";
import BranchMenuModals, { BranchMenuFormState } from "@/components/menu/BranchMenuModals";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import BranchSubnav from "@/components/branches/BranchSubnav";

export default function BranchMenuPage() {
  const router = useRouter();
  const params = useParams<{ branchId: string }>();
  const queryClient = useQueryClient();
  const branchId = params.branchId;
  
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

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["branchMenu", branchId],
    queryFn: () => api.get<BranchMenuItem[]>(`/branches/${branchId}/menu`)
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, patch }: { id: number, patch: Record<string, unknown> }) => 
      api.patch(`/branches/${branchId}/menu/${id}`, patch),
    onSuccess: () => {
      toast.success("Updated!"); 
      queryClient.invalidateQueries({ queryKey: ["branchMenu", branchId] });
    },
    onError: (e: any) => toast.error(e.message)
  });

  const handlePatch = (item: BranchMenuItem, patch: Record<string, unknown>) => {
    patchMutation.mutate({ id: item.id, patch });
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
      <BranchSubnav branchId={branchId} />
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
        loading={isLoading}
        onEdit={handleEditClick}
        onPatch={handlePatch}
      />

      <BranchMenuModals 
        branchId={branchId as string}
        upsertModal={upsertModal}
        setUpsertModal={setUpsertModal}
        editItem={editItem}
        setEditItem={setEditItem}
        form={form}
        setForm={setForm}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["branchMenu", branchId] })}
      />
    </div>
  );
}
