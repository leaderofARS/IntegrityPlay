'use client';
import { api, Alert } from '../lib/api';
import { useState } from 'react';
import ExplainPanel from './ExplainPanel';
import Network3D from './Network3D';
import Graph2D from './Graph2D';

export default function AlertDetailTabs({ alert }: { alert: Alert }) {
  const [view, setView] = useState<'simple' | 'technical' | 'explain' | 'network' | 'graph2d'>('simple');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<null | { verified: boolean; reason?: string }>(null);

  return (
    <div className="bg-white rounded p-4 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <button
          className={`px-3 py-1 rounded ${view === 'simple' ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}
          onClick={() => setView('simple')}
        >
          Simple English
        </button>
        <button
          className={`px-3 py-1 rounded ${view === 'technical' ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}
          onClick={() => setView('technical')}
        >
          Technical
        </button>
        <button
          className={`px-3 py-1 rounded ${view === 'explain' ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}
          onClick={() => setView('explain')}
        >
          Explain
        </button>
        <button
          className={`px-3 py-1 rounded ${view === 'network' ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}
          onClick={() => setView('network')}
        >
          3D Network
        </button>
        <button
          className={`px-3 py-1 rounded ${view === 'graph2d' ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}
          onClick={() => setView('graph2d')}
        >
          2D Graph
        </button>
      </div>

      {view === 'simple' && (
        <div>
          <p className="text-gray-700">This alert indicates unusual trading behavior that may be consistent with wash trading.</p>
        </div>
      )}
      {view === 'technical' && (
        <div className="grid gap-3">
          <div>
            <h3 className="font-semibold mb-1">Signals</h3>
            <pre className="bg-gray-50 p-2 rounded overflow-auto text-sm">{JSON.stringify(alert.signals || {}, null, 2)}</pre>
          </div>
          <div>
            <h3 className="font-semibold mb-1">Rule Flags</h3>
            <pre className="bg-gray-50 p-2 rounded overflow-auto text-sm">{JSON.stringify(alert.rule_flags || {}, null, 2)}</pre>
          </div>
        </div>
      )}
      {view === 'explain' && (
        <ExplainPanel alertId={alert.alert_id} />
      )}
      {view === 'network' && (
        <Network3D alertId={alert.alert_id} />
      )}
      {view === 'graph2d' && (
        <Graph2D alertId={alert.alert_id} />
      )}

      <div className="mt-4 flex items-center gap-3">
        <a
          href={`/api/backend/alerts/${alert.alert_id}/download`}
          className="px-3 py-2 bg-primary-600 text-white rounded"
        >
          Download Judge Pack
        </a>
        <button
          onClick={() => {
            const blob = new Blob([JSON.stringify(alert, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${alert.alert_id}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
          }}
          className="px-3 py-2 border rounded"
        >
          Download JSON
        </button>
        <button
          onClick={async () => {
            setVerifying(true);
            setVerifyResult(null);
            try {
              const res = await api.get(`/api/alerts/${alert.alert_id}/verify_chain`);
              setVerifyResult({ verified: !!res.data?.verified });
            } catch (e: any) {
              const reason = e?.response?.data?.reason || e?.response?.data?.detail || e?.message || 'Verification failed';
              setVerifyResult({ verified: false, reason });
            } finally {
              setVerifying(false);
            }
          }}
          className="px-3 py-2 border rounded"
        >
          {verifying ? 'Verifying…' : 'Verify HMAC Chain'}
        </button>
        {verifyResult && (
          <span className={`px-2 py-1 rounded text-sm ${verifyResult.verified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {verifyResult.verified ? 'Verified ✓' : `Not verified${verifyResult.reason ? `: ${verifyResult.reason}` : ''}`}
          </span>
        )}
      </div>
    </div>
  );
}

