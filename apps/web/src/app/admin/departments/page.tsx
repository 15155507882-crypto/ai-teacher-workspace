'use client';
import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin-shell';
import {
  AdminDialog,
  AdminDeleteDialog,
  AdminStatusTag,
  AdminFilterBar,
  AdminPageHeader,
} from '@/components/admin-ui';

interface Dept {
  id: number;
  name: string;
  parent_id: number;
  sort_order: number;
  status: string;
  school_id: number;
}

export default function AdminDeptPage() {
  const [depts, setDepts] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Dept | null>(null);
  const [target, setTarget] = useState<Dept | null>(null);
  const [form, setForm] = useState({ name: '', parent_id: 0, sort_order: 0, status: 'active' });
  const [msg, setMsg] = useState('');

  const t = () => localStorage.getItem('accessToken') || '';
  const fetcher = (url: string, opts?: any) =>
    fetch(url, {
      headers: { Authorization: `Bearer ${t()}`, 'Content-Type': 'application/json' },
      ...opts,
    }).then((r) => r.json());

  useEffect(() => {
    fetchDepts();
  }, []);

  const fetchDepts = async () => {
    setLoading(true);
    const j = await fetcher('/api/admin/departments?school_id=1');
    if (j.code === 0) setDepts(j.data || []);
    setLoading(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', parent_id: 0, sort_order: 0, status: 'active' });
    setDialogOpen(true);
  };
  const openEdit = (d: Dept) => {
    setEditing(d);
    setForm({ name: d.name, parent_id: d.parent_id, sort_order: d.sort_order, status: d.status });
    setDialogOpen(true);
  };

  const save = async () => {
    const j = editing
      ? await fetcher(`/api/admin/departments/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        })
      : await fetcher('/api/admin/departments', {
          method: 'POST',
          body: JSON.stringify({ school_id: 1, ...form }),
        });
    if (j.code === 0) {
      setDialogOpen(false);
      fetchDepts();
      setMsg(editing ? '更新成功' : '创建成功');
    } else setMsg(j.message || '操作失败');
  };

  const confirmDelete = async () => {
    if (!target) return;
    // Check teachers first
    const teachers = await fetcher(`/api/home/teachers?school_id=1&department_id=${target.id}`);
    const activeCount = teachers.data?.items?.filter((t: any) => t.status === 'active').length || 0;
    if (activeCount > 0) {
      setMsg(`该组织下有 ${activeCount} 名在职教师，无法删除`);
      setDeleteOpen(false);
      return;
    }
    const j = await fetcher(`/api/admin/departments/${target.id}/disable`);
    if (j.code === 0) {
      setDeleteOpen(false);
      fetchDepts();
      setMsg('已停用');
    } else setMsg(j.message || '操作失败');
  };

  return (
    <AdminShell>
      <div className="p-6">
        <AdminPageHeader
          title="组织管理"
          action={
            <button
              onClick={openNew}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + 新增组织
            </button>
          }
        />
        {msg && <div className="mb-3 text-sm p-3 rounded-lg bg-blue-50 text-blue-700">{msg}</div>}

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="p-3 text-left font-medium">名称</th>
                  <th className="p-3 text-left font-medium">上级ID</th>
                  <th className="p-3 text-left font-medium">排序</th>
                  <th className="p-3 text-left font-medium">状态</th>
                  <th className="p-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {depts.map((d) => (
                  <tr key={d.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="p-3 font-medium text-slate-800">{d.name}</td>
                    <td className="p-3 text-slate-500">{d.parent_id || '—'}</td>
                    <td className="p-3 text-slate-500">{d.sort_order}</td>
                    <td className="p-3">
                      <AdminStatusTag status={d.status} />
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => openEdit(d)}
                        className="text-xs text-blue-600 hover:underline mr-2"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => {
                          setTarget(d);
                          setDeleteOpen(true);
                        }}
                        className="text-xs text-red-500 hover:underline"
                      >
                        停用
                      </button>
                    </td>
                  </tr>
                ))}
                {depts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      暂无组织
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Form Dialog */}
        <AdminDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title={editing ? '编辑组织' : '新增组织'}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">组织名称</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">上级组织ID</label>
                <input
                  type="number"
                  value={form.parent_id}
                  onChange={(e) => setForm({ ...form, parent_id: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">排序</label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">状态</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="active">启用</option>
                <option value="disabled">停用</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDialogOpen(false)}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600"
              >
                取消
              </button>
              <button
                onClick={save}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        </AdminDialog>

        {/* Delete Dialog */}
        <AdminDeleteDialog
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onConfirm={confirmDelete}
          title={`停用「${target?.name}」？`}
          description="停用后该组织将不可用于新增教师分配。"
        />
      </div>
    </AdminShell>
  );
}
