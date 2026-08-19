"use client";

import { Users } from "lucide-react";
import { User } from "@/types/auth";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";

interface UserTableProps {
  users: User[];
  loading: boolean;
  onRoleChange: (userId: number, roleName: string) => void;
  onAssignScope: (userId: number) => void;
  onRemoveScope: (userId: number, scopeId: number) => void;
}

const ROLE_COLORS: Record<string, { bg: string, color: string }> = {
  SUPER_ADMIN: { bg: "var(--danger-glow)", color: "var(--danger)" },
  CAFE_OWNER: { bg: "var(--warning-glow)", color: "var(--warning)" },
  BRANCH_MANAGER: { bg: "var(--info-glow)", color: "var(--info)" },
  STAFF: { bg: "var(--success-glow)", color: "var(--success)" }
};

export default function UserTable({ users, loading, onRoleChange, onAssignScope, onRemoveScope }: UserTableProps) {
  return (
    <div className="card table-wrap">
      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users found"
          subtitle="Users who register on the platform will appear here."
        />
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Role</th>
              <th>Assignments</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const roleStyle = ROLE_COLORS[u.role.name] || { bg: "var(--accent-muted)", color: "var(--text-muted)" };
              return (
                <tr key={u.id}>
                  <td style={{ color: "var(--text-muted)", fontFamily: "monospace", fontSize: 13 }}>{u.id}</td>
                  <td style={{ fontWeight: 500 }}>{u.email}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{
                        background: roleStyle.bg,
                        color: roleStyle.color,
                        padding: "3px 10px",
                        borderRadius: 99,
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                      }}>
                        {u.role.name.replace("_", " ")}
                      </span>
                      <select
                        value={u.role.name}
                        onChange={e => onRoleChange(u.id, e.target.value)}
                        style={{ width: "auto", padding: "4px 8px", fontSize: 12 }}
                      >
                        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        <option value="CAFE_OWNER">CAFE_OWNER</option>
                        <option value="BRANCH_MANAGER">BRANCH_MANAGER</option>
                        <option value="STAFF">STAFF</option>
                      </select>
                    </div>
                  </td>
                  <td>
                    {u.userScopes.length === 0 ? (
                      <span style={{ color: "var(--text-faint)", fontSize: 12 }}>None</span>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {u.userScopes.map(s => (
                          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{
                              background: "var(--bg-surface)",
                              border: "1px solid var(--border)",
                              padding: "2px 8px",
                              borderRadius: 6,
                              fontSize: 12,
                              color: "var(--text-muted)"
                            }}>
                              {s.cafe ? `☕ ${s.cafe.name}` : ""}
                              {s.branch ? `🏪 ${s.branch.name}` : ""}
                            </span>
                            <button
                              onClick={() => onRemoveScope(u.id, s.id)}
                              style={{ background: "transparent", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: 14, lineHeight: 1 }}
                            >×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => onAssignScope(u.id)}>
                      Assign
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
