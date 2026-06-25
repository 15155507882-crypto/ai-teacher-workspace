'use client';
import { AdminShell } from '@/components/admin-shell';
import { AppButton, AppCard } from '@/components/ui/base';
import { useEffect, useState } from 'react';

interface Dept {
  id: number;
  name: string;
  parent_id: number;
  sort_order: number;
  status: string;
  children?: Dept[];
}

export default function AdminDeptPage() {
  const [depts, setDepts] = useState<Dept[]>([]);
  const [editing, setEditing] = useState<Dept | null>(null);
  const [fName, setFName] = useState('');
  const [fParent, setFParent] = useState(0);
  const [fSort, setFSort] = useState(0);
  const [msg, setMsg] = useState('');
  const fetcher = (url: string, opts?: any) =>
    fetch(url, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        'Content-Type': 'application/json',
      },
      ...opts,
    }).then((r) => r.json());
  useEffect(() => {
    fetcher('/api/admin/departments/tree?school_id=1').then((j) => {
      if (j.code === 0) setDepts(j.data);
    });
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const json = editing
      ? await fetcher(`/api/admin/departments/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify({ name: fName, parent_id: fParent, sort_order: fSort }),
        })
      : await fetcher('/api/admin/departments', {
          method: 'POST',
          body: JSON.stringify({
            school_id: 1,
            name: fName,
            parent_id: fParent,
            sort_order: fSort,
          }),
        });
    if (json.code === 0) {
      setMsg(editing ? '更新成功' : '创建成功');
      setEditing(null);
      setFName('');
      setFParent(0);
      setFSort(0);
      fetcher('/api/admin/departments/tree?school_id=1').then((j) => {
        if (j.code === 0) setDepts(j.data);
      });
    } else setMsg(json.message);
  };

  const render = (items: Dept[], level = 0) =>
    items.map((d) => (
      <div key={d.id}>
        <div
          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
          style={{ marginLeft: level * 20 }}
        >
          <div>
            <span className="font-medium text-sm">{d.name}</span>
            <span
              className={`ml-2 text-xs ${d.status === 'active' ? 'text-green-600' : 'text-red-500'}`}
            >
              {d.status}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditing(d);
                setFName(d.name);
                setFParent(d.parent_id);
                setFSort(d.sort_order);
              }}
              className="text-xs text-blue-600"
            >
              编辑
            </button>
          </div>
        </div>
        {d.children && render(d.children, level + 1)}
      </div>
    ));

  return (
    <AdminShell>
      {msg && <div className="mb-4 text-sm text-green-600">{msg}</div>}
      <AppCard className="p-4 mb-4">
        <form onSubmit={save} className="space-y-3">
          <h3 className="font-medium text-sm">{editing ? '编辑' : '新增'}教研组</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500">名称</label>
              <input
                value={fName}
                onChange={(e) => setFName(e.target.value)}
                className="w-full rounded border px-2 py-1.5 text-sm"
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">上级ID</label>
              <input
                type="number"
                value={fParent}
                onChange={(e) => setFParent(parseInt(e.target.value) || 0)}
                className="w-full rounded border px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">排序</label>
              <input
                type="number"
                value={fSort}
                onChange={(e) => setFSort(parseInt(e.target.value) || 0)}
                className="w-full rounded border px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <AppButton size="sm" type="submit">
              {editing ? '更新' : '创建'}
            </AppButton>
            {editing && (
              <AppButton
                size="sm"
                variant="secondary"
                onClick={() => {
                  setEditing(null);
                  setFName('');
                }}
              >
                取消
              </AppButton>
            )}
          </div>
        </form>
      </AppCard>
      <AppCard className="p-4">{render(depts)}</AppCard>
    </AdminShell>
  );
}
