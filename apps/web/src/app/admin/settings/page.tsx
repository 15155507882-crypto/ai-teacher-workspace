'use client';
import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin-shell';
import { AdminPageHeader } from '@/components/admin-ui';

interface SchoolSettings {
  academic_years?: string[];
  current_year?: string;
  semesters?: { name: string; start: string; end: string }[];
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

export default function SchoolSettingsPage() {
  const [settings, setSettings] = useState<SchoolSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api('/api/admin/school/settings')
      .then((j) => {
        // Handle both wrapped {code:0, data:...} and unwrapped responses
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

  async function save() {
    setSaving(true);
    setMsg('');
    const j = await api('/api/admin/school/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    if (j.code === undefined || j.code === 0) setMsg('✅ 设置已保存');
    else setMsg(j.message || '保存失败');
    setSaving(false);
  }

  const years = settings.academic_years || [];
  const semesters = settings.semesters || [];

  function addYear() {
    setSettings({ ...settings, academic_years: [...years, ''] });
  }
  function updateYear(i: number, val: string) {
    const arr = [...years];
    arr[i] = val;
    setSettings({ ...settings, academic_years: arr });
  }
  function removeYear(i: number) {
    setSettings({ ...settings, academic_years: years.filter((_, idx) => idx !== i) });
  }

  function addSemester() {
    setSettings({ ...settings, semesters: [...semesters, { name: '', start: '', end: '' }] });
  }
  function updateSemester(i: number, field: keyof (typeof semesters)[0], val: string) {
    const arr = semesters.map((s, idx) => (idx === i ? { ...s, [field]: val } : s));
    setSettings({ ...settings, semesters: arr });
  }
  function removeSemester(i: number) {
    setSettings({ ...settings, semesters: semesters.filter((_, idx) => idx !== i) });
  }

  if (loading)
    return (
      <AdminShell>
        <div className="p-6 text-sm text-slate-400">加载中...</div>
      </AdminShell>
    );

  return (
    <AdminShell>
      <div className="p-6 max-w-3xl">
        <AdminPageHeader title="⚙️ 系统设置" />
        <p className="text-sm text-slate-500 -mt-3 mb-5">配置学年和学期的起始时间</p>
        {msg && (
          <div
            className={`mb-4 text-sm p-3 rounded-lg ${msg.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}
          >
            {msg}
          </div>
        )}

        {/* 当前学年/学期 */}
        <div className="bg-white rounded-xl border p-5 mb-5 space-y-4">
          <h3 className="font-semibold text-slate-800">当前生效</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">当前学年</label>
              <select
                value={settings.current_year || ''}
                onChange={(e) => setSettings({ ...settings, current_year: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="">-- 请选择 --</option>
                {years.map(
                  (y) =>
                    y && (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    )
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">当前学期</label>
              <select
                value={settings.current_semester || ''}
                onChange={(e) => setSettings({ ...settings, current_semester: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="">-- 请选择 --</option>
                {semesters.map(
                  (s) =>
                    s.name && (
                      <option key={s.name} value={s.name}>
                        {s.name}
                      </option>
                    )
                )}
              </select>
            </div>
          </div>
        </div>

        {/* 学年列表 */}
        <div className="bg-white rounded-xl border p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800">学年列表</h3>
            <button onClick={addYear} className="text-sm text-blue-600 hover:underline">
              + 添加学年
            </button>
          </div>
          <div className="space-y-2">
            {years.map((year, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  value={year}
                  onChange={(e) => updateYear(i, e.target.value)}
                  placeholder="如 2025-2026"
                  className="flex-1 rounded-lg border px-3 py-2 text-sm"
                />
                <button
                  onClick={() => removeYear(i)}
                  className="text-red-400 text-sm hover:text-red-600"
                >
                  删除
                </button>
              </div>
            ))}
            {years.length === 0 && <p className="text-sm text-slate-400">暂无学年，点击添加</p>}
          </div>
        </div>

        {/* 学期列表 */}
        <div className="bg-white rounded-xl border p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800">学期设置</h3>
            <button onClick={addSemester} className="text-sm text-blue-600 hover:underline">
              + 添加学期
            </button>
          </div>
          <div className="space-y-3">
            {semesters.map((sem, i) => (
              <div key={i} className="flex gap-2 items-center flex-wrap">
                <input
                  value={sem.name}
                  onChange={(e) => updateSemester(i, 'name', e.target.value)}
                  placeholder="学期名称 (如 第一学期)"
                  className="w-32 rounded-lg border px-3 py-2 text-sm"
                />
                <span className="text-xs text-slate-400">起</span>
                <input
                  type="date"
                  value={sem.start}
                  onChange={(e) => updateSemester(i, 'start', e.target.value)}
                  className="rounded-lg border px-3 py-2 text-sm"
                />
                <span className="text-xs text-slate-400">止</span>
                <input
                  type="date"
                  value={sem.end}
                  onChange={(e) => updateSemester(i, 'end', e.target.value)}
                  className="rounded-lg border px-3 py-2 text-sm"
                />
                <button
                  onClick={() => removeSemester(i)}
                  className="text-red-400 text-sm hover:text-red-600"
                >
                  删除
                </button>
              </div>
            ))}
            {semesters.length === 0 && <p className="text-sm text-slate-400">暂无学期，点击添加</p>}
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存设置'}
        </button>
      </div>
    </AdminShell>
  );
}
