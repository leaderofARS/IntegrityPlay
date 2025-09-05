"use client";
import { useState } from 'react';
import { api } from '../../../lib/api';

export default function SebiDemoPage() {
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState('');

  const [taskId, setTaskId] = useState<string | null>(null);

  const run = async () => {
    try {
      setRunning(true);
      setMsg('Starting SEBI storyline...');
      const res = await api.post('/api/demo/sebi_storyline', {});
      setTaskId(res.data.task_id);
      setMsg(`Started task ${res.data.task_id}. Streaming logs...`);
      // open ws
      const ws = new WebSocket((process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000').replace(/^http/i,'ws') + `/ws/tasks/${res.data.task_id}`);
      ws.onmessage = (ev) => {
        setMsg((prev) => (prev ? prev + '\n' : '') + ev.data);
      };
    } catch (e: any) {
      setMsg(e?.message || 'Failed to start');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="bg-white rounded p-6 shadow-sm space-y-4">
      <h1 className="text-2xl font-semibold">SEBI Storyline</h1>
      <p className="text-gray-600">Runs layered scenarios (layering, wash trading, custody shuffle, benign) with explanations and evidence.</p>
      <button onClick={run} disabled={running} className="px-4 py-2 bg-primary-600 text-white rounded">
        {running ? 'Starting…' : 'Run Storyline'}
      </button>
      {msg && (
        <pre className="bg-gray-50 border rounded p-3 text-xs text-gray-800 whitespace-pre-wrap max-h-64 overflow-auto">{msg}</pre>
      )}
      <div>
        <a href="/alerts" className="text-primary-700 underline">Go to Alerts →</a>
      </div>
    </div>
  );
}

