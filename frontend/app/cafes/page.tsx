"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { Cafe } from "@/types/cafe";
import CafeTable from "@/components/cafes/CafeTable";
import CafeModals from "@/components/cafes/CafeModals";
import ArchiveCafeModal from "@/components/cafes/ArchiveCafeModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function CafesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  
  const [createOpen, setCreateOpen] = useState(false);
  const [editCafe, setEditCafe] = useState<Cafe | null>(null);
  const [archiveCafe, setArchiveCafe] = useState<Cafe | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const { data: cafes = [], isLoading: loading } = useQuery({
    queryKey: ["cafes", showArchived],
    queryFn: () => api.get<Cafe[]>(`/cafes?include_archived=${showArchived}`)
  });

  const restoreMutation = useMutation({
    mutationFn: (id: number) => api.post(`/cafes/${id}/restore`, {}),
    onSuccess: () => {
      toast.success("Café restored!");
      queryClient.invalidateQueries({ queryKey: ["cafes"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to restore café")
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Cafés</div>
          <div className="page-subtitle">Manage your café brands</div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {user?.role === "SUPER_ADMIN" && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer", color: "var(--text-muted)" }}>
              <input 
                type="checkbox" 
                checked={showArchived} 
                onChange={e => setShowArchived(e.target.checked)} 
              />
              Show Archived
            </label>
          )}
          {user?.role === "SUPER_ADMIN" && (
            <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
              <Plus size={16} /> New Café
            </button>
          )}
        </div>
      </div>

      <CafeTable 
        cafes={cafes} 
        loading={loading} 
        onEdit={(cafe) => setEditCafe(cafe)} 
        onArchive={(cafe) => setArchiveCafe(cafe)} 
        onRestore={(cafe) => restoreMutation.mutate(cafe.id)}
        readOnly={user?.role !== "SUPER_ADMIN"}
      />

      <CafeModals 
        createOpen={createOpen}
        setCreateOpen={setCreateOpen}
        editCafe={editCafe}
        setEditCafe={setEditCafe}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["cafes"] })}
      />

      <ArchiveCafeModal
        cafe={archiveCafe}
        onClose={() => setArchiveCafe(null)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["cafes"] })}
      />
    </div>
  );
}
