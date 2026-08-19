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

import { Card } from "@/components/Card";
import { Table, TableHead, TableBody, TableRow, TableCell } from "@/components/Table";

const ACTION_LABEL_MAP: Record<string, string> = {
  CREATE_MASTER_ITEM: "Created menu item",
  UPDATE_MASTER_ITEM: "Updated menu item",
  DELETE_MASTER_ITEM: "Deleted menu item",
  SET_MENU_ITEM: "Added item to branch menu",
  UPDATE_MENU_ITEM: "Updated branch menu item",
};

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
    <Card style={{ marginTop: 24, maxHeight: 600, overflowY: "auto", display: "flex", flexDirection: "column" }}>
      <h3 style={{ margin: "0 0 16px", fontSize: 16, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <Clock size={18} color="var(--accent)" />
        Recent Activity - {cafeName || `Café #${cafeId}`}
      </h3>
      <Table style={{ flex: 1 }}>
        <TableHead>
          <TableRow>
            <TableCell isHeader>Action</TableCell>
            <TableCell isHeader>User</TableCell>
            <TableCell isHeader>Branch</TableCell>
            <TableCell isHeader>Details</TableCell>
            <TableCell isHeader>Time</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell>
                <span style={{
                  background: "var(--success-glow)",
                  color: "var(--success)",
                  padding: "4px 8px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600
                }}>
                  {ACTION_LABEL_MAP[log.action] || log.action
                    .toLowerCase()
                    .split('_')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ')}
                </span>
              </TableCell>
              <TableCell>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <UserIcon size={14} color="var(--text-muted)" />
                  {log.user_email || `User #${log.user_id}`}
                </div>
              </TableCell>
              <TableCell style={{ color: "var(--text-muted)" }}>
                {log.branch_name || (log.branch_id ? `Branch #${log.branch_id}` : "-")}
              </TableCell>
              <TableCell style={{ maxWidth: 300, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {log.details || "-"}
              </TableCell>
              <TableCell style={{ color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                {new Date(log.created_at).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
