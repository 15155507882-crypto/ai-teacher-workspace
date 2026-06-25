'use client';
import { AdminShell } from '@/components/admin-shell';
import { AppButton, AppCard, AppTag } from '@/components/ui/base';
import { useEffect, useState } from 'react';

interface Teacher {
  id: number;
  name: string;
  mobile: string;
  employee_no: string | null;
  department_id: number;
  role: string;
  status: string;
  last_login_at: string | null;
}

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [filtered, setFiltered] = useState<Teacher[]>([]);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetcher = (url: string, opts?: any) =>
    fetch(url, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        'Content-Type': 'application/json',
      },
      ...opts,
    }).then((r) => r.json());

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    setError('');
    try {
      const j = await fetcher('/api/admin/teachers?size=200');
      if (j.code === 0) {
        setTeachers(j.data.items || []);
        setFiltered(j.data.items || []);
      } else setError(j.message);
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let list = teachers;
    if (keyword)
      list = list.filter(
        (t) =>
          t.name.includes(keyword) ||
          t.mobile.includes(keyword) ||
          (t.employee_no && t.employee_no.includes(keyword))
      );
    if (statusFilter) list = list.filter((t) => t.status === statusFilter);
    if (roleFilter) list = list.filter((t) => t.role === roleFilter);
    setFiltered(list);
  }, [keyword, statusFilter, roleFilter, teachers]);

  const handleResign = async (id: number) => {
    if (!confirm('确认将该教师设为离职？')) return;
    const j = await fetcher(`/api/admin/teachers/${id}/resign`, {
      method: 'POST',
      body: JSON.stringify({ reason: '管理员操作' }),
    });
    setMsg(j.code === 0 ? '操作成功' : j.message);
    if (j.code === 0) fetchTeachers();
  };

  const handleRestore = async (id: number) => {
    if (!confirm('确认恢复该教师？')) return;
    const j = await fetcher(`/api/admin/teachers/${id}/restore`, {
      method: 'POST',
      body: JSON.stringify({ reason: '管理员操作' }),
    });
    setMsg(j.code === 0 ? '已恢复' : j.message);
    if (j.code === 0) fetchTeachers();
  };

  return (
    <AdminShell>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-section-title text-[var(--color-text-strong)]">教师管理</h2>
          <AppButton size="sm">+ 新增教师</AppButton>
        </div>

        {msg && <div className="mb-3 text-sm p-3 rounded-lg bg-green-50 text-green-700">{msg}</div>}
        {error && (
          <div className="mb-3 text-sm p-3 rounded-lg bg-red-50 text-red-600 flex items-center gap-2">
            ⚠️ {error}{' '}
            <button onClick={fetchTeachers} className="underline text-sm">
              重试
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索姓名/手机号/编号..."
            className="w-64 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-normal)]"
          >
            <option value="">全部状态</option>
            <option value="active">在职</option>
            <option value="resigned">离职</option>
            <option value="disabled">停用</option>
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-normal)]"
          >
            <option value="">全部角色</option>
            <option value="teacher">教师</option>
            <option value="admin">管理员</option>
          </select>
          <span className="text-caption text-[var(--color-text-muted)] self-center ml-auto">
            {filtered.length} 人
          </span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-[var(--color-bg-muted)] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <AppCard className="p-12 text-center">
            <div className="text-3xl mb-3">📭</div>
            <p className="text-body text-[var(--color-text-muted)] mb-2">
              {keyword || statusFilter || roleFilter ? '没有符合条件的教师' : '暂无教师数据'}
            </p>
            {keyword || statusFilter || roleFilter ? (
              <AppButton
                variant="secondary"
                size="sm"
                onClick={() => {
                  setKeyword('');
                  setStatusFilter('');
                  setRoleFilter('');
                }}
              >
                清除筛选
              </AppButton>
            ) : (
              <AppButton size="sm">新增第一位教师</AppButton>
            )}
          </AppCard>
        ) : (
          <AppCard className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-bg-muted)] text-[var(--color-text-muted)] text-tiny">
                <tr>
                  <th className="p-3 text-left font-medium">姓名</th>
                  <th className="p-3 text-left font-medium">手机号</th>
                  <th className="p-3 text-left font-medium">编号</th>
                  <th className="p-3 text-left font-medium">角色</th>
                  <th className="p-3 text-left font-medium">状态</th>
                  <th className="p-3 text-left font-medium">最近登录</th>
                  <th className="p-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr
                    key={t.id}
                    className="border-t border-[var(--color-border)] hover:bg-[var(--color-bg-app)] transition-colors"
                  >
                    <td className="p-3 font-medium text-[var(--color-text-strong)]">{t.name}</td>
                    <td className="p-3 text-[var(--color-text-normal)]">{t.mobile}</td>
                    <td className="p-3 text-[var(--color-text-muted)]">{t.employee_no || '—'}</td>
                    <td className="p-3">
                      {t.role === 'admin' ? (
                        <AppTag color="blue">管理员</AppTag>
                      ) : (
                        <AppTag>教师</AppTag>
                      )}
                    </td>
                    <td className="p-3">
                      <AppTag
                        color={
                          t.status === 'active'
                            ? 'green'
                            : t.status === 'resigned'
                              ? 'orange'
                              : 'red'
                        }
                      >
                        {t.status === 'active' ? '在职' : t.status === 'resigned' ? '离职' : '停用'}
                      </AppTag>
                    </td>
                    <td className="p-3 text-tiny text-[var(--color-text-muted)]">
                      {t.last_login_at ? new Date(t.last_login_at).toLocaleString('zh-CN') : '—'}
                    </td>
                    <td className="p-3 text-right">
                      {t.status === 'active' ? (
                        <AppButton size="sm" variant="ghost" onClick={() => handleResign(t.id)}>
                          离职
                        </AppButton>
                      ) : t.status === 'resigned' ? (
                        <AppButton size="sm" variant="ghost" onClick={() => handleRestore(t.id)}>
                          恢复
                        </AppButton>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AppCard>
        )}
      </div>
    </AdminShell>
  );
}
