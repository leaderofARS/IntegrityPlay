'use client';
import { useState } from 'react';

export default function SettingsPage() {
  const [threshold, setThreshold] = useState(0.6);
  const [anchorKey, setAnchorKey] = useState('');

  return (
    <div className="bg-white rounded p-4 shadow-sm space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <div className="grid gap-3 max-w-lg">
        <label className="block">
          <span className="text-sm text-gray-600">Detector Threshold</span>
          <input
            type="number"
            step="0.01"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-600">Anchor Key</span>
          <input
            type="text"
            value={anchorKey}
            onChange={(e) => setAnchorKey(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </label>
        <button className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">Save</button>
      </div>
    </div>
  );
}

