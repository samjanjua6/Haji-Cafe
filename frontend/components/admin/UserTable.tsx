"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { User } from "@/types/auth";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";
import Modal from "@/components/Modal";

interface UserTableProps {
  users: User[];
  loading: boolean;
  onRoleChange: (userId: number, roleName: string) => Promise<any>;
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
  const [pendingRoleChange, setPendingRoleChange] = useState<{ user: User, newRole: string } | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSelectChange = (user: User, newRole: string) => {
    if (user.role.name === newRole) return;
    setPendingRoleChange({ user, newRole });
    setConfirmText("");
  };

  const handleConfirmRoleChange = async () => {
    if (!pendingRoleChange) return;
    setIsUpdating(true);
    try {
      await onRoleChange(pendingRoleChange.user.id, pendingRoleChange.newRole);
      setPendingRoleChange(null);
    } catch (e) {
      // Error toast is handled by parent, keep modal open if they want to try again, or close it.
      // Usually better to let the user see the error and manually close.
    } finally {
      setIsUpdating(false);
    }
  };

  const isSuperAdminInvolved = pendingRoleChange?.user.role.name === "SUPER_ADMIN" || pendingRoleChange?.newRole === "SUPER_ADMIN";
  const canConfirm = !isSuperAdminInvolved || confirmText === "CONFIRM";

  return (
    <>
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
                          onChange={e => handleSelectChange(u, e.target.value)}
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

      <Modal
        open={!!pendingRoleChange}
        onClose={() => !isUpdating && setPendingRoleChange(null)}
        title={isSuperAdminInvolved ? "Security Warning: Admin Role Change" : "Confirm Role Change"}
      >
        {pendingRoleChange && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <p style={{ margin: 0, fontSize: 15, color: "var(--text-primary)", lineHeight: 1.5 }}>
              You are about to change the role for <strong>{pendingRoleChange.user.email}</strong> from <strong style={{ color: ROLE_COLORS[pendingRoleChange.user.role.name]?.color || "inherit" }}>{pendingRoleChange.user.role.name}</strong> to <strong style={{ color: ROLE_COLORS[pendingRoleChange.newRole]?.color || "inherit" }}>{pendingRoleChange.newRole}</strong>.
            </p>

            {isSuperAdminInvolved && (
              <div style={{
                background: "var(--danger-glow)",
                border: "1px solid var(--danger)",
                padding: "16px",
                borderRadius: "var(--radius-md)",
                color: "var(--danger)",
                fontSize: 14,
                lineHeight: 1.5
              }}>
                <strong>Warning: </strong>
                {pendingRoleChange.newRole === "SUPER_ADMIN" 
                  ? "This will give the user full platform access to all cafés, users, and settings. They will have complete control over the entire system."
                  : "This will revoke the user's platform admin access immediately. If they are the last admin, this action will be blocked."}
              </div>
            )}

            {pendingRoleChange.user.role.name !== "SUPER_ADMIN" && pendingRoleChange.newRole !== "SUPER_ADMIN" && (
               <div style={{ fontSize: 14, color: "var(--text-muted)" }}>
                 Note: Depending on the new role, their existing café or branch assignments may be automatically cleared to prevent orphaned permissions.
               </div>
            )}

            {isSuperAdminInvolved && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                  Type <strong>CONFIRM</strong> to proceed:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="CONFIRM"
                  disabled={isUpdating}
                  style={{
                    padding: "10px 12px",
                    background: "var(--bg-base)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                    fontSize: 14,
                  }}
                />
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 10 }}>
              <button
                className="btn btn-ghost"
                onClick={() => setPendingRoleChange(null)}
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmRoleChange}
                disabled={!canConfirm || isUpdating}
                style={isSuperAdminInvolved ? { background: "var(--danger)", color: "white" } : {}}
              >
                {isUpdating ? "Applying..." : "Confirm Change"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
