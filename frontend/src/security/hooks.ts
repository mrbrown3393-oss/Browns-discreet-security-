import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/context';
import { api } from '../auth/api';

export function useSecurityQuery<T>(resource: string, enabled = true) {
  const { user } = useAuth();
  return useQuery({ queryKey: ['security', user?.id, resource], queryFn: () => api<T>(`/${resource}`), enabled: !!user && enabled, retry: 1, staleTime: 10000, refetchInterval: resource === 'dashboard' || resource === 'alerts' ? 30000 : false });
}
export function useSecurityMutation<T = unknown>() {
  const client = useQueryClient();
  return useMutation({ mutationFn: ({ path, body = {} }: { path: string; body?: unknown }) => api<T>(`/${path}`, body), onSuccess: () => client.invalidateQueries({ queryKey: ['security'] }) });
}