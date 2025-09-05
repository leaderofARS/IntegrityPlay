'use client';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, Alert, AlertListResponse } from '../../lib/api';
import KpiCard from '../../components/KpiCard';
import EventTimelineChart from '../../components/EventTimelineChart';
import Link from 'next/link';
import { alertStream } from '../../lib/websocket';

export default function DashboardPage() {
  const { data } = useQuery<AlertListResponse>({
    queryKey: ['alerts', 1],
    queryFn: async () => (await api.get('/api/alerts?page=1&page_size=50')).data,
    staleTime: 5000,
  });

  const [liveAlerts, setLiveAlerts] = useState<Alert[]>([]);
  useEffect(() => {
    alertStream.connect();
    alertStream.onAlert((a) => setLiveAlerts((prev) => [a as Alert, ...prev].slice(0, 50)));
    return () => { alertStream.disconnect(); };
  }, []);

  const alerts = useMemo(() => {
    const base = data?.items || [];
    // Merge live alerts at the top; avoid duplicates by alert_id
    const seen = new Set(base.map(a => a.alert_id));
    const merged = [...liveAlerts.filter(a => !seen.has(a.alert_id)), ...base];
    return merged;
  }, [data, liveAlerts]);

  const [rt, setRt] = useState<{ eps: number; p50_ms: number; p95_ms: number }>({ eps: 0, p50_ms: 0, p95_ms: 0 });
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const m = await api.get('/api/metrics');
        setRt(m.data);
      } catch {}
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const [connected, setConnected] = useState<boolean>(false);
  useEffect(() => {
    const id = setInterval(() => {
      const s = alertStream.getConnectionStatus();
      setConnected(s.connected);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <span className={`px-2 py-1 rounded text-xs ${connected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
          {connected ? 'Realtime: Connected' : 'Realtime: Offline'}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">Ingest: <span className="font-medium">{rt.eps.toFixed(2)} EPS</span> · Latency p50 <span className="font-medium">{rt.p50_ms.toFixed(1)} ms</span>, p95 <span className="font-medium">{rt.p95_ms.toFixed(1)} ms</span></div>
        <Link href="/demo/sebi" className="px-3 py-2 border rounded">SEBI Storyline ▶</Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard title="Total Alerts" value={alerts.length.toString()} />
        <KpiCard title="Anchored Evidence" value={alerts.filter(a => a.anchored).length.toString()} />
        <KpiCard title="Avg Score" value={(alerts.reduce((s, a) => s + (a.score || 0), 0) / Math.max(1, alerts.length)).toFixed(2)} />
      </div>
      <div className="bg-white rounded p-4 shadow-sm">
        <EventTimelineChart alerts={alerts} />
      </div>
      <div className="bg-white rounded p-4 shadow-sm">
        <h3 className="text-lg font-medium mb-2">Rule Counters</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-3 border rounded"><div className="text-sm text-gray-500">Cancel-to-Order</div><div className="text-xl font-semibold">{(rt as any).rules?.cancel_to_order ?? 0}</div></div>
          <div className="p-3 border rounded"><div className="text-sm text-gray-500">OTR Spikes</div><div className="text-xl font-semibold">{(rt as any).rules?.otr_spikes ?? 0}</div></div>
          <div className="p-3 border rounded"><div className="text-sm text-gray-500">Quote Stuffing</div><div className="text-xl font-semibold">{(rt as any).rules?.quote_stuffing ?? 0}</div></div>
          <div className="p-3 border rounded"><div className="text-sm text-gray-500">Layering</div><div className="text-xl font-semibold">{(rt as any).rules?.layering ?? 0}</div></div>
          <div className="p-3 border rounded"><div className="text-sm text-gray-500">Wash Trades</div><div className="text-xl font-semibold">{(rt as any).rules?.wash_trades ?? 0}</div></div>
        </div>
      </div>
      <div>
        <Link href="/alerts" className="text-primary-700 underline">View Alerts →</Link>
      </div>
    </div>
  );
}

