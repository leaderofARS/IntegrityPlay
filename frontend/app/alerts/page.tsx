'use client';
import { useQuery } from '@tanstack/react-query';
import { api, AlertListResponse } from '../../lib/api';
import AlertsExplorer from '../../components/AlertsExplorer';

export default function AlertsPage() {
  const { data } = useQuery<AlertListResponse>({
    queryKey: ['alerts', 'list'],
    queryFn: async () => (await api.get('/api/alerts?page=1&page_size=200')).data,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    refetchInterval: 2000,
  });
  return (
    <div className="space-y-4">
      <AlertsExplorer initialAlerts={data?.items || []} />
    </div>
  );
}

