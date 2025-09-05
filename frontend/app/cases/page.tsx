"use client";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import Link from 'next/link';
import { useState } from 'react';

export default function CasesPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['cases','list'],
    queryFn: async () => (await api.get('/api/cases')).data,
  });
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const create = useMutation({
    mutationFn: async () => (await api.post('/api/cases', { title, priority })).data,
    onSuccess: () => { setTitle(''); qc.invalidateQueries({ queryKey: ['cases','list'] }); }
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Cases</h1>
      <div className="bg-white rounded p-4 shadow-sm">
        <div className="flex items-end gap-3">
          <div>
            <label className="text-sm text-gray-600">Title</label>
            <input value={title} onChange={(e)=>setTitle(e.target.value)} className="border rounded px-3 py-2 w-64" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Priority</label>
            <select value={priority} onChange={(e)=>setPriority(e.target.value)} className="border rounded px-3 py-2">
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </div>
          <button onClick={()=>create.mutate()} className="px-3 py-2 bg-primary-600 text-white rounded">Create</button>
        </div>
      </div>
      <div className="bg-white rounded p-4 shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="text-sm text-gray-500">
              <th className="py-2">Case ID</th>
              <th>Title</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Assignee</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items || []).map((c: any) => (
              <tr key={c.case_id} className="border-t">
                <td className="py-2"><Link href={`/cases/${c.case_id}`} className="text-primary-700 underline">{c.case_id}</Link></td>
                <td>{c.title}</td>
                <td>{c.status}</td>
                <td>{c.priority}</td>
                <td>{c.assignee || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

