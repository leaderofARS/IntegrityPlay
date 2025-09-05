"use client";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useParams } from 'next/navigation';
import { useState } from 'react';

export default function CaseDetailPage() {
  const { case_id } = useParams<{ case_id: string }>();
  const qc = useQueryClient();
  const { data, refetch } = useQuery({
    queryKey: ['cases', case_id],
    queryFn: async () => (await api.get(`/api/cases/${case_id}`)).data,
  });
  const [assignee, setAssignee] = useState('');
  const [comment, setComment] = useState('');
  const [alertId, setAlertId] = useState('');
  const assign = useMutation({
    mutationFn: async () => (await api.post(`/api/cases/${case_id}/assign`, { assignee })).data,
    onSuccess: () => { setAssignee(''); refetch(); }
  });
  const addComment = useMutation({
    mutationFn: async () => (await api.post(`/api/cases/${case_id}/comment`, { text: comment })).data,
    onSuccess: () => { setComment(''); refetch(); }
  });
  const linkAlert = useMutation({
    mutationFn: async () => (await api.post(`/api/cases/${case_id}/link_alert/${alertId}`)).data,
    onSuccess: () => { setAlertId(''); refetch(); }
  });

  if (!data) return <div className="p-4">Loading…</div>;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{data.case_id} — {data.title}</h1>
      <div className="bg-white rounded p-4 shadow-sm">
        <p>Status: <span className="font-medium">{data.status}</span></p>
        <p>Priority: <span className="font-medium">{data.priority}</span></p>
        <p>Assignee: <span className="font-medium">{data.assignee || '-'}</span></p>
        <div className="mt-3 flex items-end gap-2">
          <input value={assignee} onChange={(e)=>setAssignee(e.target.value)} placeholder="Assign to…" className="border rounded px-3 py-2" />
          <button onClick={()=>assign.mutate()} className="px-3 py-2 border rounded">Assign</button>
        </div>
      </div>

      <div className="bg-white rounded p-4 shadow-sm">
        <h3 className="font-semibold mb-2">Linked Alerts</h3>
        <ul className="list-disc ml-6">
          {(data.links || []).map((l: any, i: number) => (<li key={i}>{l.alert_id}</li>))}
        </ul>
        <div className="mt-3 flex items-end gap-2">
          <input value={alertId} onChange={(e)=>setAlertId(e.target.value)} placeholder="ALERT-…" className="border rounded px-3 py-2" />
          <button onClick={()=>linkAlert.mutate()} className="px-3 py-2 border rounded">Link Alert</button>
        </div>
      </div>

      <div className="bg-white rounded p-4 shadow-sm">
        <h3 className="font-semibold mb-2">Comments</h3>
        <ul className="space-y-1">
          {(data.comments || []).map((c: any) => (
            <li key={c.id} className="text-sm"><span className="text-gray-500">{c.created_at}:</span> {c.text}</li>
          ))}
        </ul>
        <div className="mt-3 flex items-end gap-2">
          <input value={comment} onChange={(e)=>setComment(e.target.value)} placeholder="Add a comment…" className="border rounded px-3 py-2 w-96" />
          <button onClick={()=>addComment.mutate()} className="px-3 py-2 border rounded">Add</button>
        </div>
      </div>

      <div>
        <a href={`/api/cases/${data.case_id}/report`} className="text-primary-700 underline">Download Report (HTML)</a>
      </div>
    </div>
  );
}

