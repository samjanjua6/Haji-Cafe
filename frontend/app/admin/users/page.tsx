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

  if (loading) return <div style={{ color: "var(--text-muted)", marginTop: 80, textAlign: "center" }}>Loading users...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">User Management</div>
          <div className="page-subtitle">Manage system access and roles</div>
        </div>
      </div>

      <div className="card table-wrap">
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
            {users.map(u => (
              <tr key={u.id}>
                <td style={{ color: "var(--text-muted)", width: 60 }}>#{u.id}</td>
                <td style={{ fontWeight: 600 }}>{u.email}</td>
                <td>
                  <select 
                    value={u.role.name} 
                    onChange={e => handleRoleChange(u.id, e.target.value)}
                    style={{ background: "var(--bg-surface)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 8px", width: "auto" }}
                  >
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  <option value="CAFE_OWNER">CAFE_OWNER</option>
                  <option value="BRANCH_MANAGER">BRANCH_MANAGER</option>
                  <option value="STAFF">STAFF</option>
                </select>
                </td>
                <td>
                  {u.userScopes.length === 0 ? <span style={{ color: "var(--text-muted)", fontSize: 13 }}>None</span> : null}
                  {u.userScopes.map(s => (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 4 }}>
                      <span style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "2px 8px", borderRadius: 999 }}>
                        {s.cafe ? `Café: ${s.cafe.name}` : ""}
                        {s.branch ? `Branch: ${s.branch.name}` : ""}
                      </span>
                      <button 
                        onClick={() => removeScope(u.id, s.id)}
                        style={{ background: "transparent", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: 14 }}
                      >×</button>
                    </div>
                  ))}
                </td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={() => assignScope(u.id)}>
                    Assign Scope
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
