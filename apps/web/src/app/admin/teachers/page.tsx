'use client';
import { AdminShell } from '@/components/admin-shell';
import { AppButton, AppCard } from '@/components/ui/base';
import { useEffect, useState } from 'react';

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [keyword, setKeyword] = useState('');
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
    fetcher('/api/admin/teachers?size=100').then((j) => {
      if (j.code === 0) setTeachers(j.data.items || []);
    });
  }, []);

  const resign = async (id: number) => {
    if (!confirm('确认离职？')) return;
    const j = await fetcher(`/api/admin/teachers/${id}/resign`, {
      method: 'POST',
      body: JSON.stringify({ reason: '管理员操作' }),
    });
    setMsg(j.code === 0 ? '操作成功' : j.message);
    fetcher('/api/admin/teachers?size=100').then((j) => {
      if (j.code === 0) setTeachers(j.data.items || []);
    });
  };

  const filtered = teachers.filter(
    (t) => t.name.includes(keyword) || (t.mobile && t.mobile.includes(keyword))
  );

  return (
    <AdminShell title="教师管理">
      {msg && <div className="mb-3 text-sm text-green-600">{msg}</div>}
      <input
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="搜索姓名/手机号..."
        className="w-full max-w-sm rounded-lg border px-3 py-2 text-sm mb-4"
      />
      <AppCard className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-bg-muted)]">
            <tr>
              <th className="p-3 text-left">姓名</th>
              <th className="p-3 text-left">手机号</th>
              <th className="p-3 text-left">教研组</th>
              <th className="p-3 text-left">角色</th>
              <th className="p-3 text-left">状态</th>
              <th className="p-3 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="p-3 font-medium">{t.name}</td>
                <td className="p-3 text-gray-500">{t.mobile}</td>
                <td className="p-3 text-gray-500">{t.department_id}</td>
                <td className="p-3">
                  {t.role === 'admin' ? (
                    <span className="text-xs bg-purple-100 text-purple-700 rounded px-1.5 py-0.5">
                      管理员
                    </span>
                  ) : (
                    <span className="text-xs bg-gray-100 rounded px-1.5 py-0.5">教师</span>
                  )}
                </td>
                <td className="p-3">
                  <span
                    className={`text-xs rounded px-1.5 py-0.5 ${t.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}
                  >
                    {t.status}
                  </span>
                </td>
                <td className="p-3">
                  {t.status === 'active' && (
                    <AppButton size="sm" variant="ghost" onClick={() => resign(t.id)}>
                      离职
                    </AppButton>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AppCard>
    </AdminShell>
  );
}
