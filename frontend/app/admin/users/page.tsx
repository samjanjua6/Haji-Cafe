"use client";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { User } from "@/types/auth";
import UserTable from "@/components/admin/UserTable";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function AdminUsersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading: loading } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get<User[]>("/admin/users")
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, roleName }: { userId: number, roleName: string }) => 
      api.put(`/admin/users/${userId}/role`, { role_name: roleName }),
    onSuccess: () => {
      toast.success("Role updated successfully");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: any) => toast.error(e.message)
  });

  const assignScopeMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: number, data: any }) => 
      api.post(`/admin/users/${userId}/scopes`, data),
    onSuccess: () => {
      toast.success("Assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: any) => toast.error(e.message)
  });

  const removeScopeMutation = useMutation({
    mutationFn: ({ userId, scopeId }: { userId: number, scopeId: number }) => 
      api.delete(`/admin/users/${userId}/scopes/${scopeId}`),
    onSuccess: () => {
      toast.success("Removed successfully");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: any) => toast.error(e.message)
  });

  const handleRoleChange = (userId: number, roleName: string) => {
    roleMutation.mutate({ userId, roleName });
  };

  const assignScope = (userId: number) => {
    const cafeId = prompt("Enter Cafe ID (or leave blank if assigning to a branch):");
    const branchId = prompt("Enter Branch ID (or leave blank if assigning to a cafe):");
    
    if (!cafeId && !branchId) return;

    assignScopeMutation.mutate({
      userId,
      data: { 
        cafe_id: cafeId ? parseInt(cafeId) : null, 
        branch_id: branchId ? parseInt(branchId) : null 
      }
    });
  };

  const removeScope = (userId: number, scopeId: number) => {
    if (!confirm("Remove this assignment?")) return;
    removeScopeMutation.mutate({ userId, scopeId });
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
