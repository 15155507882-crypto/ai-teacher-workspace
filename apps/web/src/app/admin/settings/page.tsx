'use client';
import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin-shell';
import { AdminPageHeader, AdminDialog } from '@/components/admin-ui';

interface SemesterEntry {
  name: string;
  year?: string;
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
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (options?.method && options.method !== 'GET') {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string>) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
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
  const [msg, setMsg] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState<SemesterEntry>({ name: '', year: '', start: '', end: '' });

  useEffect(() => {
    api('/api/admin/school/settings')
      .then((j) => {
        const data = j.data !== undefined ? j.data : j;
        // 兼容旧数据：semesters 可能没有 year 字段
        if (data.semesters) {
          data.semesters = data.semesters.map((s: SemesterEntry) => ({
            ...s,
            year: s.year || '',
          }));
        }
        setSettings(data || {});
      })
      .catch((e) => setMsg('加载失败: ' + (e.message || '未知错误')))
      .finally(() => setLoading(false));
  }, []);

  async function saveSettings(newSettings: SchoolSettings) {
    setMsg('');
    try {
      const j = await api('/api/admin/school/settings', {
        method: 'PUT',
        body: JSON.stringify(newSettings),
      });
      if (j.code === undefined || j.code === 0) {
        setSettings(newSettings);
        setMsg('✅ 已保存');
      } else {
        setMsg(j.message || '保存失败');
      }
    } catch (e: any) {
      setMsg('保存失败: ' + (e.message || '未知错误'));
    }
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
    const newYears = [...years];
    if (!newYears.includes(form.year)) {
      newYears.push(form.year);
    }
    saveSettings({ ...settings, academic_years: newYears, semesters: newSemesters });
    setDialogOpen(false);
  }

  async function handleDelete(index: number) {
    if (!confirm('确定删除该条目？')) return;
    const newSemesters = semesters.filter((_, i) => i !== index);
    saveSettings({ ...settings, semesters: newSemesters });
  }

  async function toggleCurrent(year: string, semester: string) {
    // 如果已是当前则取消，否则设为当前
    const isCurrent = settings.current_year === year && settings.current_semester === semester;
    saveSettings({
      ...settings,
      current_year: isCurrent ? '' : year,
      current_semester: isCurrent ? '' : semester,
    });
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

        {/* 表格 */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-slate-500 font-medium w-16">序号</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">学年学期名</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">时间段</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium w-24">状态</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium w-20">当前生效</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium w-24">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {semesters.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    暂无数据，点击右上角「新增」添加
                  </td>
                </tr>
              )}
              {semesters.map((sem, i) => {
                const isCurrent =
                  sem.year === settings.current_year && sem.name === settings.current_semester;
                return (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {sem.year || '未设学年'} {sem.name}
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
                      <button
                        onClick={() => toggleCurrent(sem.year || '', sem.name)}
                        className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${
                          isCurrent ? 'bg-blue-600' : 'bg-slate-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                            isCurrent ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
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
                );
              })}
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
              value={form.year || ''}
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
