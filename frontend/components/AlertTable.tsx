import Link from 'next/link';
import { Alert } from '../lib/api';

type Props = { alerts: Alert[]; loading?: boolean };

export default function AlertTable({ alerts, loading }: Props) {
  return (
    <div>
      <table className="w-full text-left">
        <thead>
          <tr className="text-gray-500 text-sm">
            <th className="py-2">Alert ID</th>
            <th>Score</th>
            <th>Anchored</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td className="py-2" colSpan={4}>Loading…</td>
            </tr>
          )}
          {alerts.map((a) => (
            <tr key={a.alert_id} className="border-t hover:bg-gray-50 focus-within:bg-gray-50">
              <td className="py-2">
                <Link href={`/alerts/${a.alert_id}`} className="text-primary-700 underline">
                  {a.alert_id}
                </Link>
              </td>
              <td>{a.score?.toFixed(2)}</td>
              <td>{a.anchored ? 'Yes' : 'No'}</td>
              <td>{a.created_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {alerts.length === 0 && !loading && <div className="text-sm text-gray-600">No alerts yet.</div>}
    </div>
  );
}

