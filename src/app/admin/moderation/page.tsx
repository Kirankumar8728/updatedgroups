'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminModerationPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/groups?adminMode=true&pageSize=100')
      .then(res => res.json())
      .then(data => {
        setGroups(data.groups || []);
        setLoading(false);
      });
  }, []);

  const toggleSelectAll = () => {
    if (selectedIds.size === groups.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(groups.map(g => g.id)));
    }
  };

  const toggleSelectGroup = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkExpire = async () => {
    if (selectedIds.size === 0) return;
    await fetch('/api/admin/groups/bulk-expire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupIds: Array.from(selectedIds) })
    });
    window.location.reload();
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Admin Moderation</h1>
      <button 
        onClick={handleBulkExpire}
        disabled={selectedIds.size === 0}
        className="bg-red-600 text-white px-4 py-2 rounded mb-4 disabled:bg-gray-400"
      >
        Mark Selected as Expired ({selectedIds.size})
      </button>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th><input type="checkbox" checked={selectedIds.size === groups.length && groups.length > 0} onChange={toggleSelectAll} /></th>
            <th>Title</th>
            <th>Platform</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group: any) => (
            <tr key={group.id} className="border-b">
              <td><input type="checkbox" checked={selectedIds.has(group.id)} onChange={() => toggleSelectGroup(group.id)} /></td>
              <td>{group.title}</td>
              <td>{group.platform}</td>
              <td>{group.isActive ? 'Active' : 'Expired'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
