import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export const useCafes = () => {
  return useQuery({
    queryKey: ['cafes'],
    queryFn: async () => {
      const { data } = await api.get('/cafes');
      return data;
    },
  });
};

export const useCafe = (cafeId: number) => {
  return useQuery({
    queryKey: ['cafes', cafeId],
    queryFn: async () => {
      const { data } = await api.get(`/cafes/${cafeId}`);
      return data;
    },
    enabled: !!cafeId,
  });
};

export const useBranches = (cafeId: number) => {
  return useQuery({
    queryKey: ['branches', cafeId],
    queryFn: async () => {
      const { data } = await api.get(`/cafes/${cafeId}/branches`);
      return data;
    },
    enabled: !!cafeId,
  });
};

export const useStaff = (cafeId: number) => {
  return useQuery({
    queryKey: ['staff', cafeId],
    queryFn: async () => {
      const { data } = await api.get(`/cafes/${cafeId}/staff`);
      return data;
    },
    enabled: !!cafeId,
  });
};

export const useCreateCafe = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string }) => {
      const { data } = await api.post('/cafes', payload);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cafes'] }),
  });
};

export const useCreateBranch = (cafeId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; address?: string; city?: string }) => {
      const { data } = await api.post(`/cafes/${cafeId}/branches`, payload);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['branches', cafeId] }),
  });
};

export const useUpdateBranch = (cafeId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ branchId, ...payload }: { branchId: number; name?: string; address?: string; city?: string }) => {
      const { data } = await api.put(`/cafes/${cafeId}/branches/${branchId}`, payload);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['branches', cafeId] }),
  });
};

export const useDeleteBranch = (cafeId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (branchId: number) => {
      const { data } = await api.delete(`/cafes/${cafeId}/branches/${branchId}`);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['branches', cafeId] }),
  });
};

export const useScheduleMeeting = (cafeId: number) => {
  return useMutation({
    mutationFn: async (payload: { title: string; start_time: string; end_time: string; attendee_emails: string[]; description?: string }) => {
      const { data } = await api.post(`/cafes/${cafeId}/meetings`, payload);
      return data;
    },
  });
};
