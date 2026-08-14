'use client'

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { User } from '@/types/auth';

export const useUser = () => {
  const { data: user, isLoading, error, refetch } = useQuery<User>({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const response = await api.get('/auth/me');
      return response.data;
    },
  });

  return { user, isLoading, error, refetch };
};
