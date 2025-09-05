'use client';
import Link from 'next/link';
import { api } from '../lib/api';
import { useState } from 'react';

export default function HomePage() {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('');

  const runDemo = async () => {
    try {
      setRunning(true);
      setStatus('Starting demo...');
      await api.post('/api/run_demo', {
        scenario: 'wash_trade',
        speed: 5,
        duration: 10,
        no_throttle: true,
        randomize_scores: true,
      });
      setStatus('Demo started. Watch alerts on the Alerts page.');
    } catch (e: any) {
      setStatus(`Failed to start demo: ${e?.message || e}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-2">IntegrityPlay</h1>
        <p className="text-gray-600">Interactive demo: generate events, run detector, and review alerts.</p>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={runDemo}
            disabled={running}
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 focus:outline-none focus:ring"
            aria-label="Run Demo"
          >
            {running ? 'Starting…' : 'Run Demo'}
          </button>
          <Link href="/dashboard" className="text-primary-700 underline">
            Go to Dashboard →
          </Link>
        </div>
        {status && <p className="mt-2 text-sm text-gray-700">{status}</p>}
      </section>
    </div>
  );
}

