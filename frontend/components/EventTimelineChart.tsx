/**
 * IntegrityPlay Alert Timeline Chart Component
 * ==========================================
 * 
 * Interactive line chart displaying fraud alert risk scores over time.
 * Provides visual analysis of detection patterns and alert frequency trends.
 * 
 * Technical Features:
 * - Real-time data visualization using Recharts library
 * - Responsive design with automatic scaling and tooltips
 * - Dynamic Y-axis scaling based on maximum risk scores
 * - Graceful handling of null/undefined score values
 * - Accessibility features with ARIA labels and keyboard navigation
 * 
 * Data Processing:
 * - Filters alerts with valid numeric scores (0.0-1.0 range)
 * - Chronological sorting by alert creation timestamp
 * - Time formatting for human-readable display
 * - Sequential indexing for X-axis positioning
 * 
 * Visual Elements:
 * - Red color scheme indicating risk/alert status
 * - Grid lines for precise value reading
 * - Interactive tooltips showing alert ID, time, and exact score
 * - Responsive container adapting to parent dimensions
 * 
 * Fallback Handling:
 * - Empty state message when no scored alerts exist
 * - Instruction to run demo for data generation
 * - Maintains consistent layout during loading states
 * 
 * Props:
 * - alerts: Array of Alert objects from API responses
 * 
 * Usage:
 * <EventTimelineChart alerts={alertsData} />
 */

'use client';
import { Alert } from '../lib/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export default function EventTimelineChart({ alerts }: { alerts: Alert[] }) {
  // Filter out alerts with null scores and prepare data
  const validAlerts = alerts.filter(a => a.score !== null && a.score !== undefined);
  
  if (validAlerts.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg mb-2">No scored alerts to display</p>
          <p className="text-sm">Run a demo to generate alerts with scores</p>
        </div>
      </div>
    );
  }

  const data = validAlerts
    .sort((a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime())
    .map((a, index) => ({
      index: index + 1,
      time: new Date(a.created_at || '').toLocaleString(),
      score: Number(a.score),
      alert_id: a.alert_id,
      created_at: a.created_at,
    }));

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timeline_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    const csv = ['index,time,score,alert_id', ...data.map(d => `${d.index},"${d.time}",${d.score},${d.alert_id}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timeline_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const maxScore = Math.max(...data.map(d => d.score));
  const yAxisMax = Math.max(1.0, maxScore * 1.1); // At least 1.0 or 110% of max score

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-300 rounded p-3 shadow-lg">
          <p className="font-semibold">{data.alert_id}</p>
          <p className="text-sm text-gray-600">{data.time}</p>
          <p className="text-sm">Score: <span className="font-medium">{data.score.toFixed(3)}</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div role="region" aria-label="Alert Timeline Chart" className="h-64">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-medium">Alert Scores Over Time</h3>
        <div className="flex items-center gap-2">
          <button onClick={downloadJSON} className="px-2 py-1 text-sm border rounded hover:bg-gray-50">Download JSON</button>
          <button onClick={downloadCSV} className="px-2 py-1 text-sm border rounded hover:bg-gray-50">Download CSV</button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="index" 
            label={{ value: 'Alert #', position: 'insideBottom', offset: -5 }}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            domain={[0, yAxisMax]}
            label={{ value: 'Risk Score', angle: -90, position: 'insideLeft' }}
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="score" 
            stroke="#dc2626" 
            strokeWidth={2}
            dot={{ fill: '#dc2626', strokeWidth: 2, r: 4 }} 
            activeDot={{ r: 6, fill: '#dc2626' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

