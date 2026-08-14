import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface AuditLog {
  id: number;
  userId: number;
  action: string;
  details: string;
  createdAt: string;
}

export function useAuditLogs(cafeId: number | null | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['auditLogs', cafeId],
    queryFn: async () => {
      const response = await api.get<AuditLog[]>(`/cafes/${cafeId}/audit-logs`);
      return response.data;
    },
    enabled: !!cafeId,
  });

  return {
    logs: data || [],
    isLoading,
    error,
  };
}
