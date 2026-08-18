"use client";

import { Store, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Cafe } from "@/types/cafe";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";

interface CafeTableProps {
  cafes: Cafe[];
  loading: boolean;
  onEdit: (cafe: Cafe) => void;
  onDelete: (cafe: Cafe) => void;
  readOnly?: boolean;
}

export default function CafeTable({ cafes, loading, onEdit, onDelete, readOnly }: CafeTableProps) {
  const router = useRouter();

  return (
    <div className="card table-wrap">
      {loading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : cafes.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No cafés yet"
          subtitle="Create your first café to get started managing your branches and menu."
        />
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
            {cafes.map((cafe) => (
              <tr key={cafe.id}>
                <td style={{ color: "var(--text-muted)", fontFamily: "monospace", fontSize: 13, width: 60 }}>#{cafe.id}</td>
                <td style={{ fontWeight: 600 }}>{cafe.name}</td>
                <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{new Date(cafe.createdAt).toLocaleDateString()}</td>
                <td>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/cafes/${cafe.id}`)}>
                      <ChevronRight size={14} /> View
                    </button>
                    {!readOnly && (
                      <>
                        <button className="btn btn-ghost btn-sm" onClick={() => onEdit(cafe)}>
                          <Pencil size={14} /> Edit
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => onDelete(cafe)}>
                          <Trash2 size={14} /> Delete
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
