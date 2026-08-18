"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Clock, User as UserIcon, AlertCircle } from "lucide-react";

interface AuditLog {
  id: number;
  user_id: number;
  action: string;
  details: string | null;
  created_at: string;
  cafe_id: number | null;
  branch_id: number | null;
  user_email: string | null;
  branch_name: string | null;
}

export function AuditLogTable({ cafeId, cafeName }: { cafeId: number, cafeName: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<AuditLog[]>(`/cafes/${cafeId}/audit-logs`)
      .then(setLogs)
      .catch((err) => console.error("Failed to load audit logs", err))
      .finally(() => setLoading(false));
  }, [cafeId]);

  if (loading) {
    return <div style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading audit logs...</div>;
  }

  if (logs.length === 0) {
    return <div style={{ color: "var(--text-muted)", fontSize: 14 }}>No recent actions found.</div>;
  }

  return (
    <div className="card" style={{ marginTop: 24, overflowX: "auto" }}>
      <h3 style={{ margin: "0 0 16px", fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <Clock size={18} color="var(--accent)" />
        Recent Activity - {cafeName || `Café #${cafeId}`}
      </h3>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
            <th style={{ padding: "12px 8px", color: "var(--text-muted)", fontWeight: 600 }}>Action</th>
            <th style={{ padding: "12px 8px", color: "var(--text-muted)", fontWeight: 600 }}>User</th>
            <th style={{ padding: "12px 8px", color: "var(--text-muted)", fontWeight: 600 }}>Branch</th>
            <th style={{ padding: "12px 8px", color: "var(--text-muted)", fontWeight: 600 }}>Details</th>
            <th style={{ padding: "12px 8px", color: "var(--text-muted)", fontWeight: 600 }}>Time</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
              <td style={{ padding: "12px 8px" }}>
                <span style={{
                  background: "var(--accent-light, #f0fdf4)",
                  color: "var(--accent-dark, #166534)",
                  padding: "4px 8px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600
                }}>
                  {log.action
                    .toLowerCase()
                    .split('_')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ')}
                </span>
              </td>
              <td style={{ padding: "12px 8px", display: "flex", alignItems: "center", gap: 6 }}>
                <UserIcon size={14} color="var(--text-muted)" />
                {log.user_email || `User #${log.user_id}`}
              </td>
              <td style={{ padding: "12px 8px", color: "var(--text-muted)" }}>
                {log.branch_name || (log.branch_id ? `Branch #${log.branch_id}` : "-")}
              </td>
              <td style={{ padding: "12px 8px", maxWidth: 300, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {log.details || "-"}
              </td>
              <td style={{ padding: "12px 8px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                {new Date(log.created_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
