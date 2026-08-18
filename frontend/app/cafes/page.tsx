"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { Cafe } from "@/types/cafe";
import CafeTable from "@/components/cafes/CafeTable";
import CafeModals from "@/components/cafes/CafeModals";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function CafesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  
  const [createOpen, setCreateOpen] = useState(false);
  const [editCafe, setEditCafe] = useState<Cafe | null>(null);

  const { data: cafes = [], isLoading: loading } = useQuery({
    queryKey: ["cafes"],
    queryFn: () => api.get<Cafe[]>("/cafes")
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/cafes/${id}`),
    onSuccess: () => {
      toast.success("Café deleted!");
      queryClient.invalidateQueries({ queryKey: ["cafes"] });
    },
    onError: (e: any) => toast.error(e.message)
  });

  const handleDelete = async (cafe: Cafe) => {
    if (!confirm(`Delete "${cafe.name}"? This cannot be undone.`)) return;
    deleteMutation.mutate(cafe.id);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Cafés</div>
          <div className="page-subtitle">Manage your café brands</div>
        </div>
        {user?.role === "SUPER_ADMIN" && (
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> New Café
          </button>
        )}
      </div>

      <CafeTable 
        cafes={cafes} 
        loading={loading} 
        onEdit={(cafe) => setEditCafe(cafe)} 
        onDelete={handleDelete} 
        readOnly={user?.role !== "SUPER_ADMIN"}
      />

      <CafeModals 
        createOpen={createOpen}
        setCreateOpen={setCreateOpen}
        editCafe={editCafe}
        setEditCafe={setEditCafe}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["cafes"] })}
      />
    </div>
  );
}
