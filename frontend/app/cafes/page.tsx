"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";
import toast from "react-hot-toast";
import { Cafe } from "@/types/cafe";
import CafeTable from "@/components/cafes/CafeTable";
import CafeModals from "@/components/cafes/CafeModals";

export default function CafesPage() {
  const router = useRouter();
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [createOpen, setCreateOpen] = useState(false);
  const [editCafe, setEditCafe] = useState<Cafe | null>(null);

  const load = () => {
    api.get<Cafe[]>("/cafes")
      .then(setCafes)
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!auth.isLoggedIn()) { router.push("/"); return; }
    load();
  }, []);

  const handleDelete = async (cafe: Cafe) => {
    if (!confirm(`Delete "${cafe.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/cafes/${cafe.id}`);
      toast.success("Café deleted!"); 
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Cafés</div>
          <div className="page-subtitle">Manage your café brands</div>
        </div>
        <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> New Café
        </button>
      </div>

      <CafeTable 
        cafes={cafes} 
        loading={loading} 
        onEdit={(cafe) => setEditCafe(cafe)} 
        onDelete={handleDelete} 
      />

      <CafeModals 
        createOpen={createOpen}
        setCreateOpen={setCreateOpen}
        editCafe={editCafe}
        setEditCafe={setEditCafe}
        onSuccess={load}
      />
    </div>
  );
}
