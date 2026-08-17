"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";
import toast from "react-hot-toast";
import { User } from "@/types/auth";
import UserTable from "@/components/admin/UserTable";

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

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2>User Management</h2>
        <button className="btn btn-ghost" onClick={() => router.push("/dashboard")}>Back to Dashboard</button>
      </div>

      <UserTable 
        users={users} 
        loading={loading}
        onRoleChange={handleRoleChange}
        onAssignScope={assignScope}
        onRemoveScope={removeScope}
      />
    </div>
  );
}
