"use client";
import { useEffect, useMemo, useState } from 'react';
import { Alert } from '../lib/api';
import { alertStream } from '../lib/websocket';
import AlertTable from './AlertTable';
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ScatterChart,
  Scatter,
} from 'recharts';
import { useRouter } from 'next/navigation';
import JSZip from 'jszip';

export default function AlertsExplorer({ initialAlerts }: { initialAlerts: Alert[] }) {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts || []);
  const [connected, setConnected] = useState(false);

  // Filters
  const [query, setQuery] = useState('');
  const [anchoredOnly, setAnchoredOnly] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const [topN, setTopN] = useState(50);

  // Realtime subscribe
  useEffect(() => {
    alertStream.connect();
    const id = setInterval(() => setConnected(alertStream.getConnectionStatus().connected), 1000);
    alertStream.onAlert((a) => {
      setAlerts((prev) => {
        const exists = prev.some((x) => x.alert_id === a.alert_id);
        const merged = exists ? prev.map((x) => (x.alert_id === a.alert_id ? a : x)) : [a, ...prev];
        // keep latest 200
        return merged.slice(0, 200);
      });
    });
    return () => clearInterval(id);
  }, []);

  // Keep alerts in sync when parent-provided initialAlerts updates (react-query refetch)
  useEffect(() => {
    if (!initialAlerts) return;
    setAlerts((prev) => {
      // update existing rows with fresher data
      const updated = prev.map((x) => {
        const newer = initialAlerts.find((i) => i.alert_id === x.alert_id);
        return newer ? { ...x, ...newer } as Alert : x;
      });
      // add any new rows from initialAlerts
      const ids = new Set(updated.map((x) => x.alert_id));
      const additions = initialAlerts.filter((i) => !ids.has(i.alert_id));
      const merged = [...additions, ...updated];
      // ensure most recent first (based on created_at) and cap length
      merged.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
      return merged.slice(0, 200);
    });
  }, [initialAlerts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (alerts || [])
      .filter((a) => (anchoredOnly ? !!a.anchored : true))
      .filter((a) => (a.score == null ? false : a.score >= minScore))
      .filter((a) => (q ? a.alert_id.toLowerCase().includes(q) : true))
      .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
  }, [alerts, query, anchoredOnly, minScore]);

  const kpis = useMemo(() => {
    const total = filtered.length;
    const anchored = filtered.filter((a) => a.anchored).length;
    const avg = filtered.reduce((s, a) => s + (a.score || 0), 0) / Math.max(1, total);
    return { total, anchored, avg: Number.isFinite(avg) ? avg : 0 };
  }, [filtered]);

  const chartData = useMemo(() => {
    return filtered
      .filter((a) => a.score != null)
      .slice()
      .sort((a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime())
      .map((a, i) => ({
        idx: i + 1,
        score: Number(a.score),
        t: new Date(a.created_at || '').toLocaleString(),
        alert_id: a.alert_id,
      }));
  }, [filtered]);

  const onPointClick = (d: any) => {
    if (d && d.alert_id) router.push(`/alerts/${d.alert_id}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Alerts Explorer</h1>
        <span className={`px-2 py-1 rounded text-xs ${connected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
          {connected ? 'Realtime: Connected' : 'Realtime: Offline'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="col-span-1 md:col-span-2 bg-white rounded p-3 shadow-sm">
          <label className="text-sm text-gray-600">Search by Alert ID</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., ALERT-7df4a806"
            className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring"
          />
          <div className="mt-3 flex items-center gap-3">
            <label className="text-sm text-gray-600">Min Score</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={minScore}
              onChange={(e) => setMinScore(parseFloat(e.target.value))}
              className="w-40"
            />
            <span className="text-sm font-medium">{minScore.toFixed(2)}</span>
          </div>
          <div className="mt-2">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={anchoredOnly} onChange={(e) => setAnchoredOnly(e.target.checked)} />
              Anchored only
            </label>
          </div>
        </div>

        <div className="bg-white rounded p-3 shadow-sm">
          <div className="text-sm text-gray-500">Total</div>
          <div className="text-2xl font-semibold">{kpis.total}</div>
        </div>
        <div className="bg-white rounded p-3 shadow-sm">
          <div className="text-sm text-gray-500">Anchored</div>
          <div className="text-2xl font-semibold">{kpis.anchored}</div>
        </div>
        <div className="bg-white rounded p-3 shadow-sm">
          <div className="text-sm text-gray-500">Avg Score</div>
          <div className="text-2xl font-semibold">{kpis.avg.toFixed(2)}</div>
        </div>
      </div>

      <div className="bg-white rounded p-4 shadow-sm">
        <h3 className="text-lg font-medium mb-2">Scores Over Time</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="idx" name="Index" label={{ value: 'Alert #', position: 'insideBottom', offset: -5 }} />
              <YAxis dataKey="score" domain={[0, 1]} label={{ value: 'Score', angle: -90, position: 'insideLeft' }} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value: any, name: any, props: any) => [value, 'Score']} labelFormatter={(label: any) => `Point ${label}`} />
              <Scatter data={chartData} fill="#dc2626" onClick={(e) => onPointClick(e.payload)} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-medium">Results</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `alerts_filtered_${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              }}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
            >
              Download Filtered (JSON)
            </button>
            <button
              onClick={() => {
                const headers = ['alert_id','score','anchored','evidence_path','created_at'];
                const rows = filtered.map(a => [a.alert_id, a.score ?? '', a.anchored ? 'Yes':'No', a.evidence_path ?? '', a.created_at ?? '']);
                const csv = [headers.join(','), ...rows.map(r => r.map(x => typeof x === 'string' && x.includes(',') ? '"'+x.replace(/"/g,'""')+'"' : x).join(','))].join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `alerts_filtered_${Date.now()}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              }}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
            >
              Download Filtered (CSV)
            </button>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Top N</label>
              <input type="number" min={1} value={topN} onChange={(e)=>setTopN(parseInt(e.target.value||'0')||1)} className="w-20 border rounded px-2 py-1" />
              <button
                onClick={() => {
                  const top = filtered.filter(a => a.score != null).slice().sort((a,b)=> (b.score||0)-(a.score||0)).slice(0, Math.max(1, topN));
                  const blob = new Blob([JSON.stringify(top, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `alerts_top_${topN}_${Date.now()}.json`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                }}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
              >
                Download Top N (JSON)
              </button>
              <button
                onClick={() => {
                  const top = filtered.filter(a => a.score != null).slice().sort((a,b)=> (b.score||0)-(a.score||0)).slice(0, Math.max(1, topN));
                  const headers = ['alert_id','score','anchored','evidence_path','created_at'];
                  const rows = top.map(a => [a.alert_id, a.score ?? '', a.anchored ? 'Yes':'No', a.evidence_path ?? '', a.created_at ?? '']);
                  const csv = [headers.join(','), ...rows.map(r => r.map(x => typeof x === 'string' && x.includes(',') ? '"'+x.replace(/"/g,'""')+'"' : x).join(','))].join('\n');
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `alerts_top_${topN}_${Date.now()}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                }}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
              >
                Download Top N (CSV)
              </button>
            </div>
            <button
              onClick={async () => {
                const zip = new JSZip();
                const headers = ['alert_id','score','anchored','evidence_path','created_at'];
                const rows = filtered.map(a => [a.alert_id, a.score ?? '', a.anchored ? 'Yes':'No', a.evidence_path ?? '', a.created_at ?? '']);
                const csv = [headers.join(','), ...rows.map(r => r.map(x => typeof x === 'string' && x.includes(',') ? '"'+x.replace(/"/g,'""')+'"' : x).join(','))].join('\n');
                zip.file('alerts_filtered.json', JSON.stringify(filtered, null, 2));
                zip.file('alerts_filtered.csv', csv);
                const chartJson = JSON.stringify(chartData, null, 2);
                const chartCsv = ['index,time,score,alert_id', ...chartData.map(d => `${d.idx},"${d.t}",${d.score},${d.alert_id}`)].join('\n');
                zip.file('chart.json', chartJson);
                zip.file('chart.csv', chartCsv);
                const blob = await zip.generateAsync({ type: 'blob' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `export_pack_${Date.now()}.zip`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              }}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
            >
              Export Pack (ZIP)
            </button>
          </div>
        </div>
        <AlertTable alerts={filtered} />
      </div>
    </div>
  );
}
