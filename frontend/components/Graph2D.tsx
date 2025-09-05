"use client";
import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { api } from '../lib/api';

export default function Graph2D({ alertId }: { alertId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cy: cytoscape.Core | null = null;
    const run = async () => {
      try {
        const res = await api.get(`/api/alerts/${alertId}`);
        const alert = res.data;
        const accounts: string[] = alert.signals ? Object.keys(alert.signals) : (alert.cluster_accounts || []);
        const uniq = Array.from(new Set(accounts));
        const nodes = uniq.map((id) => ({ data: { id, label: id } }));
        const edges: any[] = [];
        for (let i = 0; i < uniq.length - 1; i++) edges.push({ data: { id: `${uniq[i]}_${uniq[i+1]}`, source: uniq[i], target: uniq[i+1] } });
        cy = cytoscape({
          container: containerRef.current!,
          elements: { nodes, edges },
          style: [
            { selector: 'node', style: { 'background-color': '#2563eb', 'label': 'data(label)', 'color': '#111827', 'font-size': 10 } },
            { selector: 'edge', style: { 'line-color': '#9ca3af', 'width': 1 } }
          ],
          layout: { name: 'cose', fit: true }
        });
      } catch (e: any) {
        setError(e?.message || 'Failed to render graph');
      }
    };
    run();
    return () => { if (cy) cy.destroy(); };
  }, [alertId]);

  if (error) return <div className="text-sm text-red-600">{error}</div>;
  return <div ref={containerRef} className="h-80 border rounded" />;
}

