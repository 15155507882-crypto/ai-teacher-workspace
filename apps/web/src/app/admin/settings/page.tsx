'use client';
import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin-shell';
import { AdminPageHeader, AdminDialog } from '@/components/admin-ui';

interface SemesterEntry {
  name: string;
  year: string;
  start: string;
  end: string;
}

interface SchoolSettings {
  academic_years?: string[];
  current_year?: string;
  semesters?: SemesterEntry[];
  current_semester?: string;
}

async function api(url: string, options?: RequestInit) {
  const token = localStorage.getItem('accessToken') || '';
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  return res.json();
}

function getStatus(sem: SemesterEntry, currentYear?: string, currentSemester?: string) {
  const today = new Date().toISOString().split('T')[0];
  if (sem.year === currentYear && sem.name === currentSemester) return 'using';
  if (sem.end && sem.end < today) return 'expired';
  if (sem.start && sem.start > today) return 'upcoming';
  return 'normal';
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  using: { label: '使用中', cls: 'bg-green-50 text-green-700' },
  expired: { label: '过期', cls: 'bg-gray-100 text-gray-500' },
  upcoming: { label: '未到', cls: 'bg-blue-50 text-blue-600' },
  normal: { label: '未生效', cls: 'bg-slate-50 text-slate-500' },
};

function StatusTag({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] || STATUS_MAP.normal;
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

export default function SchoolSettingsPage() {
  const [settings, setSettings] = useState<SchoolSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState<SemesterEntry>({
    name: '',
    year: '',
    start: '',
    end: '',
  });

  useEffect(() => {
    api('/api/admin/school/settings')
      .then((j) => {
        const data = j.data !== undefined ? j.data : j;
        if (j.code !== undefined && j.code !== 0) {
          setMsg(j.message || '加载失败');
        } else {
          setSettings(data || {});
        }
      })
      .catch(() => setMsg('加载设置失败'))
      .finally(() => setLoading(false));
  }, []);

  async function save(newSettings?: SchoolSettings) {
    const s = newSettings || settings;
    setSaving(true);
    setMsg('');
    const j = await api('/api/admin/school/settings', {
      method: 'PUT',
      body: JSON.stringify(s),
    });
    if (j.code === undefined || j.code === 0) {
      setSettings(s);
      setMsg('✅ 已保存');
    } else {
      setMsg(j.message || '保存失败');
    }
    setSaving(false);
  }

  const semesters = settings.semesters || [];
  const years = settings.academic_years || [];

  function openAdd() {
    setEditingIndex(null);
    setForm({ name: '', year: settings.current_year || years[0] || '', start: '', end: '' });
    setDialogOpen(true);
  }

  function openEdit(index: number) {
    setEditingIndex(index);
    setForm({ ...semesters[index] });
    setDialogOpen(true);
  }

  function handleSaveDialog() {
    if (!form.name || !form.year || !form.start || !form.end) {
      setMsg('请填写完整信息');
      return;
    }
    const newSemesters = [...semesters];
    if (editingIndex !== null) {
      newSemesters[editingIndex] = form;
    } else {
      newSemesters.push(form);
    }
    // 自动添加学年到列表
    const newYears = [...years];
    if (!newYears.includes(form.year)) {
      newYears.push(form.year);
    }
    const newSettings: SchoolSettings = {
      ...settings,
      academic_years: newYears,
      semesters: newSemesters,
    };
    save(newSettings);
    setDialogOpen(false);
  }

  async function handleDelete(index: number) {
    if (!confirm('确定删除该条目？')) return;
    const newSemesters = semesters.filter((_, i) => i !== index);
    const newSettings = { ...settings, semesters: newSemesters };
    save(newSettings);
  }

  async function setCurrent(year: string, semester: string) {
    const newSettings = { ...settings, current_year: year, current_semester: semester };
    save(newSettings);
  }

  if (loading)
    return (
      <AdminShell>
        <div className="p-6 text-sm text-slate-400">加载中...</div>
      </AdminShell>
    );

  return (
    <AdminShell>
      <div className="p-6">
        <AdminPageHeader
          title="📅 学年管理"
          action={
            <button
              onClick={openAdd}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + 新增
            </button>
          }
        />

        {msg && (
          <div
            className={`mb-4 text-sm p-3 rounded-lg ${msg.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}
          >
            {msg}
          </div>
        )}

        {/* 当前生效 */}
        <div className="bg-white rounded-xl border p-4 mb-5 flex items-center gap-6 flex-wrap">
          <span className="text-sm font-medium text-slate-700 shrink-0">当前生效：</span>
          <div className="flex items-center gap-2">
            <select
              value={settings.current_year || ''}
              onChange={(e) => setCurrent(e.target.value, settings.current_semester || '')}
              className="rounded-lg border px-3 py-1.5 text-sm"
            >
              <option value="">选择学年</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select
              value={settings.current_semester || ''}
              onChange={(e) => setCurrent(settings.current_year || '', e.target.value)}
              className="rounded-lg border px-3 py-1.5 text-sm"
            >
              <option value="">选择学期</option>
              {semesters
                .filter((s) => s.year === settings.current_year)
                .map((s) => (
                  <option key={s.name + s.year} value={s.name}>
                    {s.name}
                  </option>
                ))}
            </select>
          </div>
          <span className="text-xs text-slate-400">选择后自动保存</span>
        </div>

        {/* 学年学期表格 */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-slate-500 font-medium w-16">序号</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">学年学期名</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">时间段</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium w-24">状态</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium w-24">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {semesters.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    暂无数据，点击右上角「新增」添加
                  </td>
                </tr>
              )}
              {semesters.map((sem, i) => (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {sem.year}学年 {sem.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {sem.start} ~ {sem.end}
                  </td>
                  <td className="px-4 py-3">
                    <StatusTag
                      status={getStatus(sem, settings.current_year, settings.current_semester)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(i)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(i)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 新增/编辑弹窗 */}
      <AdminDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editingIndex !== null ? '编辑学年学期' : '新增学年学期'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              学年 <span className="text-red-400">*</span>
            </label>
            <input
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
              placeholder="如 2025-2026"
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              学期名 <span className="text-red-400">*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="如 第一学期"
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                开始日期 <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={form.start}
                onChange={(e) => setForm({ ...form, start: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                结束日期 <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={form.end}
                onChange={(e) => setForm({ ...form, end: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setDialogOpen(false)}
              className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              取消
            </button>
            <button
              onClick={handleSaveDialog}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              保存
            </button>
          </div>
        </div>
      </AdminDialog>
    </AdminShell>
  );
}
