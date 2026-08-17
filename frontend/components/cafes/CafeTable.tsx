"use client";

import { Store, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Cafe } from "@/types/cafe";

interface CafeTableProps {
  cafes: Cafe[];
  loading: boolean;
  onEdit: (cafe: Cafe) => void;
  onDelete: (cafe: Cafe) => void;
}

export default function CafeTable({ cafes, loading, onEdit, onDelete }: CafeTableProps) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="card table-wrap">
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading...</div>
      </div>
    );
  }

  if (cafes.length === 0) {
    return (
      <div className="card table-wrap">
        <div style={{ padding: 60, textAlign: "center" }}>
          <Store size={40} style={{ color: "var(--text-muted)", margin: "0 auto 12px" }} />
          <div style={{ color: "var(--text-muted)" }}>No cafés yet. Create your first one.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card table-wrap">
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
          {cafes.map((cafe) => (
            <tr key={cafe.id}>
              <td style={{ color: "var(--text-muted)", width: 60 }}>#{cafe.id}</td>
              <td style={{ fontWeight: 600 }}>{cafe.name}</td>
              <td style={{ color: "var(--text-muted)" }}>{new Date(cafe.createdAt).toLocaleDateString()}</td>
              <td>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/cafes/${cafe.id}`)}>
                    <ChevronRight size={14} /> View
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => onEdit(cafe)}>
                    <Pencil size={14} /> Edit
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => onDelete(cafe)}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
