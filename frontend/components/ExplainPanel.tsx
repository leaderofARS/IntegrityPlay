"use client";
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function ExplainPanel({ alertId }: { alertId: string }) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    api.get(`/api/alerts/${alertId}/explanation`)
      .then((res) => { if (mounted) setData(res.data); })
      .catch((e) => { if (mounted) setError(e?.message || 'Failed to load explanation'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [alertId]);

  if (loading) return <div className="text-sm text-gray-600">Loading explanation…</div>;
  if (error) {
    if (!toast) setToast(error);
    return <div className="text-sm text-red-600">{error}</div>;
  }
  if (!data || data.status === 'unavailable') {
    if (!toast) setToast('Explanation temporarily unavailable');
    return <div className="text-sm text-gray-600">Explanation unavailable.</div>;
  }

  const fi = data.feature_importance || {};
  const top = Object.entries(fi)
    .sort((a: any, b: any) => Math.abs(b[1] as number) - Math.abs(a[1] as number))
    .slice(0, 5);

  return (
    <div className="space-y-3">
      {toast && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-3 py-2 rounded shadow-lg text-sm" role="alert">
          {toast}
        </div>
      )}
      <div>
        <h3 className="font-semibold">Summary</h3>
        <p className="text-sm text-gray-700">Confidence: {Math.round(((data.confidence_score ?? data.confidence ?? 0) as number) * 100)}%</p>
        {data.decision_rationale && (
          <p className="text-sm text-gray-700 mt-1">{data.decision_rationale}</p>
        )}
      </div>
      <div>
        <h3 className="font-semibold">Top Features</h3>
        <ul className="list-disc list-inside text-sm text-gray-700">
          {top.map(([k, v]) => (
            <li key={k}>{k}: {(v as number).toFixed(3)}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
