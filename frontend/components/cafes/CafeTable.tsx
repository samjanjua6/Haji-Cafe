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
  onArchive: (cafe: Cafe) => void;
  onRestore: (cafe: Cafe) => void;
  readOnly?: boolean;
}

export default function CafeTable({ cafes, loading, onEdit, onArchive, onRestore, readOnly }: CafeTableProps) {
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
              <tr key={cafe.id} style={{ opacity: cafe.isArchived ? 0.6 : 1 }}>
                <td style={{ color: "var(--text-muted)", fontFamily: "monospace", fontSize: 13, width: 60 }}>#{cafe.id}</td>
                <td style={{ fontWeight: 600 }}>
                  {cafe.name}
                  {cafe.isArchived && (
                    <span style={{ marginLeft: 8, fontSize: 11, padding: "2px 6px", background: "rgba(100,116,139,0.1)", color: "var(--text-muted)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>Archived</span>
                  )}
                </td>
                <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{new Date(cafe.createdAt).toLocaleDateString()}</td>
                <td>
                  <div style={{ display: "flex", gap: 8 }}>
                    {!cafe.isArchived && (
                      <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/cafes/${cafe.id}`)}>
                        <ChevronRight size={14} /> View
                      </button>
                    )}
                    {!readOnly && (
                      <>
                        {cafe.isArchived ? (
                          <button className="btn btn-primary btn-sm" onClick={() => onRestore(cafe)}>
                            Restore
                          </button>
                        ) : (
                          <>
                            <button className="btn btn-ghost btn-sm" onClick={() => onEdit(cafe)}>
                              <Pencil size={14} /> Edit
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => onArchive(cafe)}>
                              <Trash2 size={14} /> Delete
                            </button>
                          </>
                        )}
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
