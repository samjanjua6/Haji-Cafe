import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { User, UserRole, UserScope } from '@/types/admin';

export const useAdminUsers = () => {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const { data } = await api.get<User[]>('/admin/users');
      return data;
    },
  });
};

export const useUpdateRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: UserRole }) => {
      const { data } = await api.put<User>(`/admin/users/${userId}/role`, { role });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
};

export const useAddScope = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, scope }: { userId: number; scope: { cafe_id?: number; branch_id?: number } }) => {
      const { data } = await api.post<UserScope>(`/admin/users/${userId}/scopes`, scope);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
};

export const useRemoveScope = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, scopeId }: { userId: number; scopeId: number }) => {
      await api.delete(`/admin/users/${userId}/scopes/${scopeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
};
