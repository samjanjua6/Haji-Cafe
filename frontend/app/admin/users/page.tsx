"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";
import toast from "react-hot-toast";

interface Scope {
  id: number;
  cafeId: number | null;
  branchId: number | null;
  cafe?: { id: number; name: string };
  branch?: { id: number; name: string };
}

interface User {
  id: number;
  email: string;
  role: { id: number; name: string };
  userScopes: Scope[];
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.isLoggedIn()) { router.push("/"); return; }
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await api.get<User[]>("/admin/users");
      setUsers(data);
    } catch (e: any) {
      toast.error("Failed to load users: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: number, roleName: string) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role_name: roleName });
      toast.success("Role updated successfully");
      fetchUsers();
    } catch (e: any) {
      toast.error("Failed to update role: " + e.message);
    }
  };

  const assignScope = async (userId: number) => {
    const cafeId = prompt("Enter Cafe ID (or leave blank if assigning to a branch):");
    const branchId = prompt("Enter Branch ID (or leave blank if assigning to a cafe):");
    
    if (!cafeId && !branchId) return;

    try {
      await api.post(`/admin/users/${userId}/scopes`, { 
        cafe_id: cafeId ? parseInt(cafeId) : null, 
        branch_id: branchId ? parseInt(branchId) : null 
      });
      toast.success("Assigned successfully");
      fetchUsers();
    } catch (e: any) {
      toast.error("Failed to assign scope: " + e.message);
    }
  };

  const removeScope = async (userId: number, scopeId: number) => {
    if (!confirm("Remove this assignment?")) return;
    try {
      await api.delete(`/admin/users/${userId}/scopes/${scopeId}`);
      toast.success("Removed successfully");
      fetchUsers();
    } catch (e: any) {
      toast.error("Failed to remove scope: " + e.message);
    }
  };

  if (loading) return <div style={{ padding: 20 }}>Loading users...</div>;

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2>User Management</h2>
        <button className="btn btn-ghost" onClick={() => router.push("/dashboard")}>Back to Dashboard</button>
      </div>

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
                  onChange={e => handleRoleChange(u.id, e.target.value)}
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
                      onClick={() => removeScope(u.id, s.id)}
                      style={{ background: "transparent", border: "none", color: "red", cursor: "pointer", fontSize: 12 }}
                    >×</button>
                  </div>
                ))}
              </td>
              <td style={{ padding: 12 }}>
                <button className="btn btn-sm" style={{ background: "var(--bg-base)" }} onClick={() => assignScope(u.id)}>
                  Assign
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
