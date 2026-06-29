'use client';
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { AdminShell } from '@/components/admin-shell';
import {
  AdminDialog,
  AdminDeleteDialog,
  AdminStatusTag,
  AdminPageHeader,
} from '@/components/admin-ui';
import { Pagination } from '@/components/ui/pagination';

interface Group {
  id: number;
  name: string;
  code: string | null;
  parent_id: number;
  sort_order: number;
  is_home_visible: boolean;
  status: string;
  remark: string | null;
  teacher_ids?: number[];
  teachers?: { id: number; name: string }[];
  teacher_count?: number;
}

export default function AdminHomeGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [teacherOpen, setTeacherOpen] = useState(false);
  const [viewTeachersOpen, setViewTeachersOpen] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [form, setForm] = useState({
    name: '',
    code: '',
    parent_id: 0,
    sort_order: 0,
    is_home_visible: true,
    status: 'active',
    remark: '',
  });
  const [msg, setMsg] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [search, setSearch] = useState('');
  const [allTeachers, setAllTeachers] = useState<any[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<number[]>([]);
  const [teacherSearch, setTeacherSearch] = useState('');

  const token = () => localStorage.getItem('accessToken') || '';
  async function api(url: string, opts?: RequestInit) {
    try {
      const res = await fetch(url, {
        ...opts,
        headers: {
          Authorization: `Bearer ${token()}`,
          'Content-Type': 'application/json',
          ...opts?.headers,
        },
      });
      return res.json();
    } catch (e: any) {
      return { code: -1, message: '服务连接失败，请检查后端服务是否启动' };
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchGroups();
      await fetchTeachers();
      setLoading(false);
    })();
  }, []);

  async function fetchTeachers() {
    try {
      const j = await api('/api/admin/teachers?status=active&size=200');
      if (j.code === 0 && j.data?.items) setAllTeachers(j.data.items);
    } catch (e) {
      console.error('fetchTeachers error', e);
    }
  }

  async function fetchGroups() {
    setLoading(true);
    const j = await api('/api/admin/home-groups');
    if (j.code === 0) setGroups(j.data || []);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm({
      name: '',
      code: '',
      parent_id: 0,
      sort_order: 0,
      is_home_visible: true,
      status: 'active',
      remark: '',
    });
    setDialogOpen(true);
  }
  function openEdit(g: Group) {
    setEditing(g);
    setForm({
      name: g.name,
      code: g.code || '',
      parent_id: g.parent_id,
      sort_order: g.sort_order,
      is_home_visible: g.is_home_visible,
      status: g.status,
      remark: g.remark || '',
    });
    setDialogOpen(true);
  }

  async function save() {
    const data = editing
      ? { ...form }
      : { ...form, code: 'HG' + Date.now().toString(36).toUpperCase() };
    const j = editing
      ? await api(`/api/admin/home-groups/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        })
      : await api('/api/admin/home-groups', { method: 'POST', body: JSON.stringify(data) });
    if (j.code === 0) {
      setDialogOpen(false);
      fetchGroups();
      setMsg(editing ? '更新成功' : '创建成功');
    } else setMsg(j.message || '保存失败');
  }

  async function saveAndContinue() {
    if (editing) return save();
    const data = { ...form, code: 'HG' + Date.now().toString(36).toUpperCase() };
    const j = await api('/api/admin/home-groups', { method: 'POST', body: JSON.stringify(data) });
    if (j.code === 0) {
      fetchGroups();
      setMsg('已保存，继续添加');
      setForm({
        name: '',
        code: '',
        parent_id: form.parent_id,
        sort_order: form.sort_order + 1,
        is_home_visible: form.is_home_visible,
        status: 'active',
        remark: '',
      });
    } else setMsg(j.message || '保存失败');
  }

  async function toggleStatus(g: Group) {
    const j = await api(`/api/admin/home-groups/${g.id}/toggle`, { method: 'POST' });
    if (j.code === 0) fetchGroups();
  }
  async function handleDelete() {
    if (!editing) return;
    const j = await api(`/api/admin/home-groups/${editing.id}`, { method: 'DELETE' });
    if (j.code === 0) {
      setDeleteOpen(false);
      fetchGroups();
      setMsg('已删除');
    }
  }

  function openTeachers(g: Group) {
    const ids = (g.teacher_ids || g.teachers?.map((t) => Number(t.id)) || []).map(Number);
    console.log('[OPEN-TEACHERS-INIT]', {
      groupId: g.id,
      groupName: g.name,
      teacher_ids: g.teacher_ids,
      teachers: g.teachers,
      normalizedIds: ids,
    });
    setEditing(g);
    setTeacherSearch('');
    setSelectedTeachers(ids);
    setTeacherOpen(true);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg('正在处理文件...');
    try {
      // Parse CSV or Excel
      const rows: string[][] = file.name.endsWith('.csv')
        ? (await file.text())
            .split('\n')
            .filter((l: string) => l.trim())
            .map((l: string) => l.split(','))
        : await (async () => {
            const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' });
            return XLSX.utils.sheet_to_json<string[]>(wb.Sheets[wb.SheetNames[0]], { header: 1 });
          })();
      if (rows.length < 2) {
        setMsg('文件为空或格式不正确');
        e.target.value = '';
        return;
      }

      // 第一行为表头（备课组名称）
      const columns = rows[0].map((h: string) => String(h).trim()).filter(Boolean);
      if (columns.length === 0) {
        setMsg('未检测到有效的备课组表头');
        e.target.value = '';
        return;
      }

      // 后续行为教师姓名
      const dataRows = rows
        .slice(1)
        .map((vals) => columns.map((_, i) => String(vals[i] || '').trim()));

      // 统计
      const teacherNames = new Set<string>();
      for (const row of dataRows) {
        for (const name of row) {
          if (name) teacherNames.add(name);
        }
      }

      const confirmMsg =
        `检测到 ${columns.length} 个备课组（${columns.join('、')}），` +
        `共 ${teacherNames.size} 个不同的教师姓名。` +
        `\n\n确认导入？`;

      if (!window.confirm(confirmMsg)) {
        e.target.value = '';
        return;
      }

      setMsg('正在导入...');
      const r = await api('/api/admin/home-groups/batch-import', {
        method: 'POST',
        body: JSON.stringify({ columns, rows: dataRows }),
      });

      if (r.code === 0 && r.data) {
        const d = r.data;
        let msg = `导入完成: ${d.groupsProcessed} 个备课组`;
        if (d.totalAssigned > 0) msg += `，分配 ${d.totalAssigned} 名教师`;
        if (d.totalNotFound > 0) msg += `，${d.totalNotFound} 名教师未找到`;
        setMsg(msg);
        fetchGroups();
      } else {
        setMsg(r.message || '导入失败');
      }
    } catch (err: any) {
      setMsg('导入失败: ' + (err.message || '未知错误'));
    }
    e.target.value = '';
  }

  const filtered = groups.filter((g) =>
    search ? g.name.includes(search) || g.code?.includes(search) : true
  );
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <AdminShell>
      <div className="p-8">
        <AdminPageHeader
          title="备课组"
          action={
            <div className="flex gap-2">
              <a
                href={`data:text/csv;charset=utf-8,${encodeURIComponent(
                  (() => {
                    const names = groups.filter((g) => g.status === 'active').map((g) => g.name);
                    if (names.length === 0) names.push('语文组', '数学组', '英语组');
                    // Header row = 备课组名称
                    const header = names.join(',');
                    // 2 example rows
                    const example1 = names.map(() => '教师姓名').join(',');
                    const example2 = names.map(() => '').join(',');
                    return `${header}\n${example1}\n${example2}`;
                  })()
                )}`}
                download="备课组导入模板.csv"
                className="h-11 inline-flex items-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-[#53688f] hover:bg-[#f7faff] transition"
              >
                📥 下载模板
              </a>
              <label className="h-11 inline-flex items-center rounded-xl bg-green-600 px-4 text-sm font-medium text-white hover:bg-green-700 cursor-pointer shadow-sm transition">
                📤 批量导入
                <input
                  type="file"
                  className="hidden"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleImport}
                />
              </label>
              <button
                onClick={openNew}
                className="h-11 inline-flex items-center rounded-xl bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 shadow-sm transition"
              >
                + 新增
              </button>
            </div>
          }
        />
        {msg && (
          <div
            className={`mb-4 text-sm p-3 rounded-xl ${msg.includes('成功') || msg.includes('完成') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}
          >
            {msg}
          </div>
        )}
        <div className="mb-4">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="搜索名称..."
            className="h-11 w-56 rounded-xl border border-slate-200 bg-white px-4 text-sm shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
          />
        </div>
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(31,45,78,0.07)] p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-[#f7faff] rounded-xl animate-pulse mb-3 last:mb-0" />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(31,45,78,0.07)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-base">
                <thead className="bg-[#f7faff] text-sm font-semibold text-[#6e7fa7] whitespace-nowrap">
                  <tr>
                    <th className="px-5 py-4 text-left w-24">序号</th>
                    <th className="px-5 py-4 text-left">名称</th>
                    <th className="px-5 py-4 text-left">上级</th>
                    <th className="px-5 py-4 text-left">排序</th>
                    <th className="px-5 py-4 text-left">首页</th>
                    <th className="px-5 py-4 text-left">状态</th>
                    <th className="px-5 py-4 text-left">备注</th>
                    <th className="px-5 py-4 text-left">绑定老师</th>
                    <th className="px-5 py-4 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paged.map((g, i) => (
                    <tr key={g.id} className="transition hover:bg-[#f7faff]">
                      <td className="px-5 py-4 text-sm font-medium text-[#8ba0c5]">
                        {(page - 1) * pageSize + i + 1}
                      </td>
                      <td className="px-5 py-4 font-semibold text-[#10234f]">{g.name}</td>
                      <td className="px-5 py-4 text-[#53688f]">
                        {g.parent_id
                          ? groups.find((x) => x.id === g.parent_id)?.name || ''
                          : '顶级'}
                      </td>
                      <td className="px-5 py-4 text-[#53688f]">{g.sort_order}</td>
                      <td className="px-5 py-4">
                        {g.is_home_visible ? (
                          <span className="text-green-600 text-sm font-medium">可见</span>
                        ) : (
                          <span className="text-[#8ba0c5] text-sm">隐藏</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {g.status === 'active' ? (
                          <span className="inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold bg-green-50 text-green-700">
                            启用
                          </span>
                        ) : (
                          <span className="inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold bg-orange-50 text-orange-700">
                            停用
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm text-[#8ba0c5] max-w-[120px] truncate">
                        {g.remark || '—'}
                      </td>
                      <td className="px-5 py-4 text-sm max-w-[180px]">
                        {g.teachers?.length ? (
                          <button
                            onClick={() => {
                              setEditing(g);
                              setViewTeachersOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-700 font-medium hover:underline underline-offset-2 text-left"
                          >
                            {g.teachers.length <= 3
                              ? g.teachers.map((t) => t.name).join('、')
                              : `${g.teachers
                                  .slice(0, 2)
                                  .map((t) => t.name)
                                  .join('、')} 等 ${g.teachers.length} 人`}
                          </button>
                        ) : (
                          <span className="text-slate-400">暂无老师</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right space-x-3">
                        <button
                          onClick={() => openTeachers(g)}
                          className="text-sm font-medium text-blue-500 hover:text-blue-600 underline-offset-2 hover:underline"
                        >
                          老师
                        </button>
                        <button
                          onClick={() => openEdit(g)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => toggleStatus(g)}
                          className="text-sm text-orange-500 hover:underline"
                        >
                          {g.status === 'active' ? '停用' : '启用'}
                        </button>
                        <button
                          onClick={() => {
                            setEditing(g);
                            setDeleteOpen(true);
                          }}
                          className="text-sm text-red-400 hover:underline"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="p-12 text-center text-slate-400">暂无备课组</div>
              )}
            </div>
          </div>
        )}
        <Pagination page={page} pageSize={pageSize} total={filtered.length} onChange={setPage} />

        <AdminDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title={editing ? '编辑' : '新增'}
          width="max-w-lg"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">名称 *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">上级目录</label>
                <select
                  value={form.parent_id}
                  onChange={(e) => setForm({ ...form, parent_id: parseInt(e.target.value) || 0 })}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                >
                  <option value={0}>顶级</option>
                  {groups
                    .filter((g) => g.id !== editing?.id)
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">排序</label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">状态</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="active">启用</option>
                  <option value="disabled">停用</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_home_visible}
                onChange={(e) => setForm({ ...form, is_home_visible: e.target.checked })}
              />
              <label className="text-sm text-slate-600">首页显示</label>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">备注</label>
              <input
                value={form.remark}
                onChange={(e) => setForm({ ...form, remark: e.target.value })}
                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDialogOpen(false)}
                className="px-4 py-2 text-sm rounded-lg border"
              >
                取消
              </button>
              {!editing && (
                <button
                  onClick={saveAndContinue}
                  className="px-4 py-2 text-sm rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50"
                >
                  保存并继续
                </button>
              )}
              <button
                onClick={save}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        </AdminDialog>

        <AdminDialog
          open={teacherOpen}
          onClose={() => setTeacherOpen(false)}
          title={`教师分配 — ${editing?.name || ''}`}
          width="max-w-xl"
        >
          <input
            value={teacherSearch}
            onChange={(e) => setTeacherSearch(e.target.value)}
            placeholder="搜索教师姓名/手机号..."
            className="w-full rounded-lg border px-3 py-2 text-sm mb-3"
          />
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {allTeachers
              .filter((t: any) => t.status === 'active')
              .filter(
                (t: any) =>
                  !teacherSearch ||
                  t.name.includes(teacherSearch) ||
                  t.mobile.includes(teacherSearch)
              )
              .map((t: any) => (
                <label
                  key={t.id}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedTeachers.includes(Number(t.id))}
                    onChange={() => {
                      const tid = Number(t.id);
                      console.log('[CHECKBOX-RENDER]', {
                        teacherId: tid,
                        selectedTeachers,
                        checked: selectedTeachers.includes(tid),
                      });
                      setSelectedTeachers((prev) =>
                        prev.includes(Number(t.id))
                          ? prev.filter((id) => id !== Number(t.id))
                          : [...prev, Number(t.id)]
                      );
                    }}
                  />
                  <span className="text-sm">{t.name}</span>
                  <span className="text-sm text-slate-400">{t.mobile}</span>
                </label>
              ))}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={() => setTeacherOpen(false)}
              className="px-4 py-2 text-sm rounded-lg border"
            >
              取消
            </button>
            <button
              onClick={async () => {
                const groupId = Number(editing!.id);
                console.log('[SAVE-TEACHERS-CLICK]', {
                  groupId,
                  selectedTeachers,
                  len: selectedTeachers.length,
                });
                console.log('[SAVE-TEACHERS-PAYLOAD]', {
                  url: `/api/admin/home-groups/${groupId}/teachers`,
                  body: { teacher_ids: selectedTeachers },
                });
                const res = await api(`/api/admin/home-groups/${groupId}/teachers`, {
                  method: 'PUT',
                  body: JSON.stringify({ teacher_ids: selectedTeachers }),
                });
                console.log('[SAVE-TEACHERS-RESPONSE]', res);
                if (res.code === 0) {
                  setTeacherOpen(false);
                  const groups = await fetchGroups();
                  console.log(
                    '[FETCH-GROUPS-AFTER-SAVE]',
                    groups?.map((g: any) => ({ id: g.id, name: g.name, tids: g.teacher_ids }))
                  );
                  setMsg('老师绑定已保存');
                } else {
                  setMsg(res.message || '保存失败');
                }
              }}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              保存
            </button>
          </div>
        </AdminDialog>

        <AdminDeleteDialog
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onConfirm={handleDelete}
          title={`删除「${editing?.name}」？`}
          description="删除后不可恢复"
        />
        {/* 查看老师名单弹窗（只读） */}
        <AdminDialog
          open={viewTeachersOpen}
          onClose={() => setViewTeachersOpen(false)}
          title={`${editing?.name || ''} - 老师名单`}
          width="max-w-sm"
        >
          {editing?.teachers?.length ? (
            <div className="space-y-1">
              {editing.teachers.map((t) => (
                <div key={t.id} className="px-3 py-1.5 bg-slate-50 rounded text-sm text-slate-700">
                  {t.name}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm">暂未绑定老师</div>
          )}
        </AdminDialog>
      </div>
    </AdminShell>
  );
}
