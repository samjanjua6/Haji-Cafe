"use client";

import { User } from "@/types/auth";

interface UserTableProps {
  users: User[];
  loading: boolean;
  onRoleChange: (userId: number, roleName: string) => void;
  onAssignScope: (userId: number) => void;
  onRemoveScope: (userId: number, scopeId: number) => void;
}

export default function UserTable({ users, loading, onRoleChange, onAssignScope, onRemoveScope }: UserTableProps) {
  if (loading) return <div style={{ padding: 20 }}>Loading users...</div>;

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", background: "var(--bg-surface)", borderRadius: 8, overflow: "hidden" }}>
      <thead>
        <tr style={{ background: "rgba(255,255,255,0.05)", textAlign: "left" }}>
          <th style={{ padding: 12 }}>ID</th>
          <th style={{ padding: 12 }}>Email</th>
          <th style={{ padding: 12 }}>Role</th>
          <th style={{ padding: 12 }}>Assignments</th>
          <th style={{ padding: 12 }}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {users.map(u => (
          <tr key={u.id} style={{ borderTop: "1px solid var(--border)" }}>
            <td style={{ padding: 12 }}>{u.id}</td>
            <td style={{ padding: 12 }}>{u.email}</td>
            <td style={{ padding: 12 }}>
              <select 
                value={u.role.name} 
                onChange={e => onRoleChange(u.id, e.target.value)}
                style={{ background: "transparent", color: "inherit", border: "1px solid var(--border)", borderRadius: 4, padding: "4px 8px" }}
              >
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                <option value="CAFE_OWNER">CAFE_OWNER</option>
                <option value="BRANCH_MANAGER">BRANCH_MANAGER</option>
                <option value="STAFF">STAFF</option>
              </select>
            </td>
            <td style={{ padding: 12 }}>
              {u.userScopes.length === 0 ? <span style={{ color: "var(--text-muted)", fontSize: 12 }}>None</span> : null}
              {u.userScopes.map(s => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 4 }}>
                  <span style={{ background: "rgba(255,255,255,0.1)", padding: "2px 6px", borderRadius: 4 }}>
                    {s.cafe ? `Cafe: ${s.cafe.name}` : ""}
                    {s.branch ? `Branch: ${s.branch.name}` : ""}
                  </span>
                  <button 
                    onClick={() => onRemoveScope(u.id, s.id)}
                    style={{ background: "transparent", border: "none", color: "red", cursor: "pointer", fontSize: 12 }}
                  >×</button>
                </div>
              ))}
            </td>
            <td style={{ padding: 12 }}>
              <button className="btn btn-sm" style={{ background: "var(--bg-base)" }} onClick={() => onAssignScope(u.id)}>
                Assign
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
