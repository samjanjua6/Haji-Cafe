import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Order, OrderStatus } from '@/types/order';

export const useOrders = (branchId: number, status?: OrderStatus) => {
  return useQuery({
    queryKey: ['orders', branchId, status],
    queryFn: async () => {
      const { data } = await api.get<Order[]>(`/branches/${branchId}/orders`, {
        params: { status }
      });
      return data;
    },
    enabled: !!branchId,
  });
};

export const useOrder = (branchId: number, orderId: number | null) => {
  return useQuery({
    queryKey: ['order', branchId, orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const { data } = await api.get<Order>(`/branches/${branchId}/orders/${orderId}`);
      return data;
    },
    enabled: !!branchId && !!orderId,
  });
};

export const useCreateOrder = (branchId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { lines: { branch_menu_item_id: number; quantity: number }[] }) => {
      const { data } = await api.post<Order>(`/branches/${branchId}/orders`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', branchId] });
    },
  });
};

export const useUpdateOrderStatus = (branchId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: OrderStatus }) => {
      const { data } = await api.patch<Order>(`/branches/${branchId}/orders/${orderId}/status`, { status });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders', branchId] });
      queryClient.invalidateQueries({ queryKey: ['order', branchId, variables.orderId] });
    },
  });
};
