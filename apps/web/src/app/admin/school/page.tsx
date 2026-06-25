'use client';
import { AdminShell } from '@/components/admin-shell';
import { AppButton, AppCard } from '@/components/ui/base';
import { useEffect, useState } from 'react';

export default function AdminSchoolPage() {
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    fetch('/api/admin/school', {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.data) {
          setName(j.data.name);
          setShortName(j.data.short_name);
        }
      });
  }, []);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/admin/school', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify({ name, short_name: shortName }),
    });
    const json = await res.json();
    setMsg(json.code === 0 ? '保存成功' : json.message);
    setLoading(false);
  };
  return (
    <AdminShell>
      <AppCard className="p-6 max-w-lg">
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-normal)] mb-1">
              学校全称
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-normal)] mb-1">
              学校简称
            </label>
            <input
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              required
            />
          </div>
          {msg && (
            <div className={`text-sm ${msg.includes('成功') ? 'text-green-600' : 'text-red-600'}`}>
              {msg}
            </div>
          )}
          <AppButton type="submit" disabled={loading}>
            {loading ? '保存中...' : '保存'}
          </AppButton>
        </form>
      </AppCard>
    </AdminShell>
  );
}
