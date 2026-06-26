'use client';
import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin-shell';
import { AdminDialog, AdminDeleteDialog, AdminStatusTag, AdminPageHeader } from '@/components/admin-ui';
import { Pagination } from '@/components/ui/pagination';

interface Group { id: number; name: string; code: string | null; parent_id: number; sort_order: number; is_home_visible: boolean; status: string; remark: string | null; }

export default function AdminHomeGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [teacherOpen, setTeacherOpen] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [form, setForm] = useState({ name: '', code: '', parent_id: 0, sort_order: 0, is_home_visible: true, status: 'active', remark: '' });
  const [msg, setMsg] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [search, setSearch] = useState('');
  const [allTeachers, setAllTeachers] = useState<any[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<number[]>([]);
  const [teacherSearch, setTeacherSearch] = useState('');

  const token = () => localStorage.getItem('accessToken') || '';
  async function api(url: string, opts?: RequestInit) {
    const res = await fetch(url, { ...opts, headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json', ...opts?.headers } });
    return res.json();
  }

  useEffect(() => {
    fetchGroups();
    api('/api/admin/teachers?status=active&size=200').then(j => { if (j.code === 0) setAllTeachers(j.data.items || []); });
  }, []);

  async function fetchGroups() { setLoading(true); const j = await api('/api/admin/home-groups'); if (j.code === 0) setGroups(j.data || []); setLoading(false); }

  function openNew() { setEditing(null); setForm({ name: '', code: '', parent_id: 0, sort_order: 0, is_home_visible: true, status: 'active', remark: '' }); setDialogOpen(true); }
  function openEdit(g: Group) { setEditing(g); setForm({ name: g.name, code: g.code || '', parent_id: g.parent_id, sort_order: g.sort_order, is_home_visible: g.is_home_visible, status: g.status, remark: g.remark || '' }); setDialogOpen(true); }

  async function save() {
    const data = editing ? { ...form } : { ...form, code: 'HG' + Date.now().toString(36).toUpperCase() };
    const j = editing ? await api(`/api/admin/home-groups/${editing.id}`, { method: 'PUT', body: JSON.stringify(data) }) : await api('/api/admin/home-groups', { method: 'POST', body: JSON.stringify(data) });
    if (j.code === 0) { setDialogOpen(false); fetchGroups(); setMsg(editing ? '更新成功' : '创建成功'); }
    else setMsg(j.message || '保存失败');
  }

  async function toggleStatus(g: Group) { const j = await api(`/api/admin/home-groups/${g.id}/toggle`, { method: 'POST' }); if (j.code === 0) fetchGroups(); }
  async function handleDelete() { if (!editing) return; const j = await api(`/api/admin/home-groups/${editing.id}`, { method: 'DELETE' }); if (j.code === 0) { setDeleteOpen(false); fetchGroups(); setMsg('已删除'); } }

  function openTeachers(g: Group) { setEditing(g); setTeacherSearch(''); setSelectedTeachers(allTeachers.filter((t: any) => t.department_id === g.id).map((t: any) => t.id)); setTeacherOpen(true); }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    const items = lines.slice(1).map(line => {
      const v = line.split(',');
      return { name: v[0]?.trim(), sort_order: parseInt(v[1]) || 0, is_home_visible: v[2]?.trim() !== '否', status: v[3]?.trim() || 'active', remark: v[4]?.trim() };
    }).filter((i: any) => i.name);
    if (!confirm(`确认导入 ${items.length} 个备课组？`)) return;
    for (const item of items) { await api('/api/admin/home-groups', { method: 'POST', body: JSON.stringify({ ...item, code: 'HG' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5) }) }); }
    fetchGroups(); setMsg(`导入 ${items.length} 个完成`);
    e.target.value = '';
  }

  const filtered = groups.filter(g => search ? (g.name.includes(search) || g.code?.includes(search)) : true);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <AdminShell>
      <div className="p-6">
        <AdminPageHeader title="备课组" action={<div className="flex gap-2"><label className="rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700 cursor-pointer">📤 导入<input type="file" className="hidden" accept=".csv" onChange={handleImport} /></label><button onClick={openNew} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">+ 新增</button></div>} />
        {msg && <div className={`mb-3 text-sm p-3 rounded-lg ${msg.includes('成功')||msg.includes('完成') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{msg}</div>}
        <div className="mb-4"><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="搜索名称..." className="w-56 rounded-lg border px-3 py-2 text-sm" /></div>
        {loading ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}</div> : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="p-3 text-left w-14">序号</th><th className="p-3 text-left">名称</th><th className="p-3 text-left">上级</th><th className="p-3 text-left">排序</th><th className="p-3 text-left">首页</th><th className="p-3 text-left">状态</th><th className="p-3 text-left">备注</th><th className="p-3 text-right">操作</th></tr></thead>
              <tbody>{paged.map((g, i) => (
                <tr key={g.id} className="border-t hover:bg-slate-50">
                  <td className="p-3 text-slate-400 text-sm">{(page - 1) * pageSize + i + 1}</td>
                  <td className="p-3 font-medium text-slate-800">{g.name}</td>
                  <td className="p-3 text-slate-500">{g.parent_id ? groups.find(x => x.id === g.parent_id)?.name || '' : '顶级'}</td>
                  <td className="p-3 text-slate-500">{g.sort_order}</td>
                  <td className="p-3">{g.is_home_visible ? <span className="text-green-600 text-xs">可见</span> : <span className="text-slate-400 text-xs">隐藏</span>}</td>
                  <td className="p-3">{g.status === "active" ? <span className="inline-flex rounded-md px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700">启用</span> : <span className="inline-flex rounded-md px-2 py-0.5 text-xs font-medium bg-orange-50 text-orange-700">停用</span>}</td>
                  <td className="p-3 text-xs text-slate-400 max-w-[120px] truncate">{g.remark || '—'}</td>
                  <td className="p-3 text-right space-x-1">
                    <button onClick={() => openTeachers(g)} className="text-xs text-blue-500 hover:underline">老师</button>
                    <button onClick={() => openEdit(g)} className="text-xs text-blue-600 hover:underline">编辑</button>
                    <button onClick={() => toggleStatus(g)} className="text-xs text-orange-500 hover:underline">{g.status === 'active' ? '停用' : '启用'}</button>
                    <button onClick={() => { setEditing(g); setDeleteOpen(true); }} className="text-xs text-red-400 hover:underline">删除</button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
            {filtered.length === 0 && <div className="p-12 text-center text-slate-400">暂无备课组</div>}
          </div>
        )}
        <Pagination page={page} pageSize={pageSize} total={filtered.length} onChange={setPage} />

        <AdminDialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={editing ? '编辑' : '新增'} width="max-w-lg">
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">名称 *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">上级目录</label><select value={form.parent_id} onChange={e => setForm({ ...form, parent_id: parseInt(e.target.value) || 0 })} className="w-full rounded-lg border px-3 py-2 text-sm"><option value={0}>顶级</option>{groups.filter(g => g.id !== editing?.id).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">排序</label><input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} className="w-full rounded-lg border px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">状态</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm"><option value="active">启用</option><option value="disabled">停用</option></select></div>
            </div>
            <div className="flex items-center gap-2"><input type="checkbox" checked={form.is_home_visible} onChange={e => setForm({ ...form, is_home_visible: e.target.checked })} /><label className="text-sm text-slate-600">首页显示</label></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">备注</label><input value={form.remark} onChange={e => setForm({ ...form, remark: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" /></div>
            <div className="flex justify-end gap-2 pt-2"><button onClick={() => setDialogOpen(false)} className="px-4 py-2 text-sm rounded-lg border">取消</button><button onClick={save} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">保存</button></div>
          </div>
        </AdminDialog>

        <AdminDialog open={teacherOpen} onClose={() => setTeacherOpen(false)} title={`教师分配 — ${editing?.name || ''}`} width="max-w-xl">
          <input value={teacherSearch} onChange={e => setTeacherSearch(e.target.value)} placeholder="搜索教师姓名/手机号..." className="w-full rounded-lg border px-3 py-2 text-sm mb-3" />
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {allTeachers.filter((t: any) => t.status === 'active').filter((t: any) => !teacherSearch || t.name.includes(teacherSearch) || t.mobile.includes(teacherSearch)).map((t: any) => (
              <label key={t.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" checked={selectedTeachers.includes(t.id)} onChange={() => { setSelectedTeachers(prev => prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]); }} />
                <span className="text-sm">{t.name}</span><span className="text-xs text-slate-400">{t.mobile}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-4"><button onClick={() => setTeacherOpen(false)} className="px-4 py-2 text-sm rounded-lg border">取消</button><button onClick={async () => { for (const tid of selectedTeachers) { await api(`/api/admin/teachers/${tid}`, { method: 'PUT', body: JSON.stringify({ department_id: editing!.id }) }); } setTeacherOpen(false); fetchGroups(); setMsg('已更新教师分配'); }} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">保存</button></div>
        </AdminDialog>

        <AdminDeleteDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} title={`删除「${editing?.name}」？`} description="删除后不可恢复" />
      </div>
    </AdminShell>
  );
}
