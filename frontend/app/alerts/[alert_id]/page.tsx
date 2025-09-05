'use client';
import { notFound } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, Alert } from '../../../lib/api';
import AlertDetailTabs from '../../../components/AlertDetailTabs';

export default function AlertDetailPage({ params }: { params: { alert_id: string } }) {
  const { alert_id } = params;
  const { data } = useQuery<{ alert_id: string } & Alert>({
    queryKey: ['alerts', alert_id],
    queryFn: async () => (await api.get(`/api/alerts/${alert_id}`)).data,
  });

  if (!data) {
    return (
      <div className="p-4">Loading…</div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Alert {data.alert_id}</h1>
      <AlertDetailTabs alert={data} />
    </div>
  );
}

