"use client";
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Network3D({ alertId }: { alertId: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    api.get(`/api/alerts/${alertId}/viz3d`, { responseType: 'text' })
      .then((res) => { if (mounted) setHtml(res.data); })
      .catch((e) => { if (mounted) setError(e?.message || 'Failed to load viz'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [alertId]);

  if (loading) return <div className="text-sm text-gray-600">Loading 3D network…</div>;
  if (error) {
    if (!toast) setToast(error);
    return <div className="text-sm text-red-600">{error}</div>;
  }
  if (!html) {
    if (!toast) setToast('3D visualization temporarily unavailable');
    return <div className="text-sm text-gray-600">Visualization unavailable.</div>;
  }

  return (
    <div className="border rounded" style={{ height: 480 }}>
      {toast && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-3 py-2 rounded shadow-lg text-sm" role="alert">
          {toast}
        </div>
      )}
      <iframe
        title="3D Network"
        srcDoc={html}
        className="w-full h-full"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}
