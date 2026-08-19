"use client";
import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import { api } from "@/lib/api";
import { Cafe } from "@/types/cafe";
import toast from "react-hot-toast";

interface ArchiveCafeModalProps {
  cafe: Cafe | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ArchiveCafeModal({ cafe, onClose, onSuccess }: ArchiveCafeModalProps) {
  const [impact, setImpact] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirmName, setConfirmName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (cafe) {
      setLoading(true);
      setImpact(null);
      setConfirmName("");
      api.get(`/cafes/${cafe.id}/impact`)
        .then((res: any) => setImpact(res.data))
        .catch((err: any) => toast.error("Failed to load impact stats"))
        .finally(() => setLoading(false));
    }
  }, [cafe]);

  if (!cafe) return null;

  const handleArchive = async () => {
    if (confirmName !== cafe.name) return;
    setSubmitting(true);
    try {
      await api.delete(`/cafes/${cafe.id}`);
      toast.success("Café archived successfully.");
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to archive café");
    } finally {
      setSubmitting(false);
    }
  };

  const hasActiveOrders = impact?.activeOrders > 0;
  const isMatch = confirmName === cafe.name;

  return (
    <Modal open={!!cafe} onClose={onClose} title="Archive Café">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {loading ? (
          <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)" }}>Loading impact analysis...</div>
        ) : (
          <>
            <div style={{ background: "var(--bg-surface)", padding: 16, borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
              <p style={{ margin: "0 0 12px 0", fontWeight: 600 }}>Archiving "{cafe.name}" will hide it from the platform.</p>
              <ul style={{ margin: 0, paddingLeft: 20, color: "var(--text-muted)", fontSize: 14 }}>
                <li><strong>{impact?.branches}</strong> branches will be hidden</li>
                <li><strong>{impact?.staff}</strong> staff members will lose access</li>
                <li><strong>{impact?.menuItems}</strong> menu items will be hidden</li>
                <li><strong>{impact?.orders}</strong> historical orders will be preserved but hidden</li>
              </ul>
            </div>

            {hasActiveOrders && (
              <div style={{ background: "rgba(220, 38, 38, 0.1)", color: "#dc2626", padding: 12, borderRadius: "var(--radius-md)", border: "1px solid rgba(220, 38, 38, 0.2)", fontSize: 14 }}>
                <strong>Cannot Archive:</strong> There are {impact.activeOrders} active orders in progress. You must complete or cancel them before archiving this café.
              </div>
            )}

            {!hasActiveOrders && (
              <>
                <p style={{ margin: 0, fontSize: 14 }}>
                  Please type <strong>{cafe.name}</strong> to confirm.
                </p>
                <input
                  type="text"
                  className="input"
                  placeholder={cafe.name}
                  value={confirmName}
                  onChange={e => setConfirmName(e.target.value)}
                  disabled={submitting}
                />
              </>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
              <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                disabled={submitting || hasActiveOrders || !isMatch}
                onClick={handleArchive}
              >
                {submitting ? "Archiving..." : "Archive Café"}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
