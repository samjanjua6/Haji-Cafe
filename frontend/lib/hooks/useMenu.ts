import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export const useMasterMenu = (cafeId: number) => {
  return useQuery({
    queryKey: ['masterMenu', cafeId],
    queryFn: async () => {
      const { data } = await api.get(`/cafes/${cafeId}/menu`);
      return data;
    },
    enabled: !!cafeId,
  });
};

export const useCategories = (cafeId: number) => {
  return useQuery({
    queryKey: ['categories', cafeId],
    queryFn: async () => {
      const { data } = await api.get(`/cafes/${cafeId}/categories`);
      return data;
    },
    enabled: !!cafeId,
  });
};

export const useCreateMasterItem = (cafeId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; description?: string; base_price: number; category_id?: number }) => {
      const { data } = await api.post(`/cafes/${cafeId}/menu`, payload);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['masterMenu', cafeId] }),
  });
};

export const useUpdateMasterItem = (cafeId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, ...payload }: { itemId: number; name?: string; description?: string; base_price?: number; category_id?: number }) => {
      const { data } = await api.put(`/cafes/${cafeId}/menu/${itemId}`, payload);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['masterMenu', cafeId] }),
  });
};

export const useDeleteMasterItem = (cafeId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: number) => {
      const { data } = await api.delete(`/cafes/${cafeId}/menu/${itemId}`);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['masterMenu', cafeId] }),
  });
};

export const useCreateCategory = (cafeId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string }) => {
      const { data } = await api.post(`/cafes/${cafeId}/categories`, payload);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories', cafeId] }),
  });
};

export const useBranchMenu = (branchId: number) => {
  return useQuery({
    queryKey: ['branchMenu', branchId],
    queryFn: async () => {
      const { data } = await api.get(`/branches/${branchId}/menu`);
      return data;
    },
    enabled: !!branchId,
  });
};

export const useAddBranchItem = (branchId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { master_item_id: number; price_override?: number; available_quantity?: number; is_in_stock?: boolean; is_active?: boolean }) => {
      const { data } = await api.post(`/branches/${branchId}/menu`, payload);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['branchMenu', branchId] }),
  });
};

export const usePatchBranchItem = (branchId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, ...payload }: { itemId: number; price_override?: number; available_quantity?: number; is_in_stock?: boolean; is_active?: boolean }) => {
      const { data } = await api.patch(`/branches/${branchId}/menu/${itemId}`, payload);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['branchMenu', branchId] }),
  });
};
