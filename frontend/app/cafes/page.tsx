"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Store, Pencil, Trash2, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";
import Modal from "@/components/Modal";
import toast from "react-hot-toast";

interface Cafe { id: number; name: string; createdAt: string; }

export default function CafesPage() {
  const router = useRouter();
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editCafe, setEditCafe] = useState<Cafe | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post("/cafes", { name });
      toast.success("Café created!"); setCreateOpen(false); setName(""); load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editCafe) return; setSaving(true);
    try {
      await api.put(`/cafes/${editCafe.id}`, { name });
      toast.success("Café updated!"); setEditCafe(null); setName(""); load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const handleDelete = async (cafe: Cafe) => {
    if (!confirm(`Delete "${cafe.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/cafes/${cafe.id}`);
      toast.success("Café deleted!"); load();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Cafés</div>
          <div className="page-subtitle">Manage your café brands</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setName(""); setCreateOpen(true); }}>
          <Plus size={16} /> New Café
        </button>
      </div>

      <div className="card table-wrap">
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading...</div>
        ) : cafes.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <Store size={40} style={{ color: "var(--text-muted)", margin: "0 auto 12px" }} />
            <div style={{ color: "var(--text-muted)" }}>No cafés yet. Create your first one.</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cafes.map(cafe => (
                <tr key={cafe.id}>
                  <td style={{ color: "var(--text-muted)", width: 60 }}>#{cafe.id}</td>
                  <td style={{ fontWeight: 600 }}>{cafe.name}</td>
                  <td style={{ color: "var(--text-muted)" }}>{new Date(cafe.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/cafes/${cafe.id}`)}>
                        <ChevronRight size={14} /> View
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditCafe(cafe); setName(cafe.name); }}>
                        <Pencil size={14} /> Edit
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(cafe)}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create New Café">
        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div><label>Café Name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Haji Cafe Downtown" required /></div>
          <button className="btn btn-primary" type="submit" disabled={saving} style={{ justifyContent: "center" }}>
            {saving ? "Creating..." : "Create Café"}
          </button>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editCafe} onClose={() => setEditCafe(null)} title={`Edit: ${editCafe?.name}`}>
        <form onSubmit={handleEdit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div><label>Café Name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Café name" required /></div>
          <button className="btn btn-primary" type="submit" disabled={saving} style={{ justifyContent: "center" }}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
