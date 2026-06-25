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

interface Teacher {
  id: number;
  name: string;
  mobile: string;
  employee_no: string | null;
  department_id: number;
  role: string;
  status: string;
  last_login_at: string | null;
  created_at: string;
}

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [filtered, setFiltered] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resetPwdOpen, setResetPwdOpen] = useState(false);
  const [resignOpen, setResignOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [target, setTarget] = useState<Teacher | null>(null);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    employee_no: '',
    department_id: 1,
    role: 'teacher',
    status: 'active',
    password: '',
  });
  const [pwdForm, setPwdForm] = useState({ password: '', confirm: '' });

  const t = () => localStorage.getItem('accessToken') || '';
  const fetcher = (url: string, opts?: any) =>
    fetch(url, {
      headers: { Authorization: `Bearer ${t()}`, 'Content-Type': 'application/json' },
      ...opts,
    }).then((r) => r.json());

  useEffect(() => {
    fetchTeachers();
  }, []);
  useEffect(() => {
    let list = teachers;
    if (keyword)
      list = list.filter(
        (t) =>
          t.name.includes(keyword) || t.mobile.includes(keyword) || t.employee_no?.includes(keyword)
      );
    if (statusFilter) list = list.filter((t) => t.status === statusFilter);
    if (roleFilter) list = list.filter((t) => t.role === roleFilter);
    setFiltered(list);
  }, [keyword, statusFilter, roleFilter, teachers]);

  const fetchTeachers = async () => {
    setLoading(true);
    const j = await fetcher('/api/admin/teachers?size=200');
    if (j.code === 0) setTeachers(j.data.items || []);
    setLoading(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm({
      name: '',
      mobile: '',
      employee_no: '',
      department_id: 1,
      role: 'teacher',
      status: 'active',
      password: '',
    });
    setDialogOpen(true);
  };
  const openEdit = (t: Teacher) => {
    setEditing(t);
    setForm({
      name: t.name,
      mobile: t.mobile,
      employee_no: t.employee_no || '',
      department_id: t.department_id,
      role: t.role,
      status: t.status,
      password: '',
    });
    setDialogOpen(true);
  };

  const save = async () => {
    const j = editing
      ? await fetcher(`/api/admin/teachers/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: form.name,
            department_id: form.department_id,
            employee_no: form.employee_no,
            role: form.role,
          }),
        })
      : await fetcher('/api/admin/teachers', {
          method: 'POST',
          body: JSON.stringify({ school_id: 1, ...form }),
        });
    if (j.code === 0) {
      setDialogOpen(false);
      fetchTeachers();
      setMsg(editing ? '更新成功' : '创建成功');
    } else setMsg(j.message || '操作失败');
  };

  const resetPwd = async () => {
    if (!target || pwdForm.password !== pwdForm.confirm) {
      setMsg('两次密码不一致');
      return;
    }
    const j = await fetcher(`/api/admin/teachers/${target.id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ password: pwdForm.password }),
    });
    if (j.code === 0) {
      setResetPwdOpen(false);
      setMsg('密码已重置');
    } else setMsg(j.message || '操作失败');
  };

  const handleResign = async () => {
    if (!target) return;
    const j = await fetcher(`/api/admin/teachers/${target.id}/resign`, {
      method: 'POST',
      body: JSON.stringify({ reason: '管理员操作' }),
    });
    if (j.code === 0) {
      setResignOpen(false);
      fetchTeachers();
      setMsg('已设为离职');
    } else setMsg(j.message || '操作失败');
  };

  const handleRestore = async (id: number) => {
    const j = await fetcher(`/api/admin/teachers/${id}/restore`, {
      method: 'POST',
      body: JSON.stringify({ reason: '管理员操作' }),
    });
    if (j.code === 0) {
      fetchTeachers();
      setMsg('已恢复');
    } else setMsg(j.message || '操作失败');
  };

  return (
    <AdminShell>
      <div className="p-6">
        <AdminPageHeader
          title="教师管理"
          action={
            <button
              onClick={openNew}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + 新增教师
            </button>
          }
        />
        {msg && <div className="mb-3 text-sm p-3 rounded-lg bg-blue-50 text-blue-700">{msg}</div>}

        <AdminFilterBar>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索姓名/手机号/编号..."
            className="w-56 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">全部状态</option>
            <option value="active">在职</option>
            <option value="resigned">离职</option>
            <option value="disabled">停用</option>
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">全部角色</option>
            <option value="teacher">教师</option>
            <option value="admin">管理员</option>
          </select>
          <span className="text-xs text-slate-400 self-center ml-auto">{filtered.length} 人</span>
        </AdminFilterBar>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="p-3 text-left">姓名</th>
                  <th className="p-3 text-left">手机号</th>
                  <th className="p-3 text-left">编号</th>
                  <th className="p-3 text-left">角色</th>
                  <th className="p-3 text-left">状态</th>
                  <th className="p-3 text-left">最近登录</th>
                  <th className="p-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="p-3 font-medium text-slate-800">{t.name}</td>
                    <td className="p-3 text-slate-500">{t.mobile}</td>
                    <td className="p-3 text-slate-400">{t.employee_no || '—'}</td>
                    <td className="p-3">
                      <AdminStatusTag status={t.role} />
                    </td>
                    <td className="p-3">
                      <AdminStatusTag status={t.status} />
                    </td>
                    <td className="p-3 text-xs text-slate-400">
                      {t.last_login_at ? new Date(t.last_login_at).toLocaleString('zh-CN') : '—'}
                    </td>
                    <td className="p-3 text-right space-x-1">
                      <button
                        onClick={() => openEdit(t)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => {
                          setTarget(t);
                          setPwdForm({ password: '', confirm: '' });
                          setResetPwdOpen(true);
                        }}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        密码
                      </button>
                      {t.status === 'active' && (
                        <button
                          onClick={() => {
                            setTarget(t);
                            setResignOpen(true);
                          }}
                          className="text-xs text-orange-500 hover:underline"
                        >
                          离职
                        </button>
                      )}
                      {t.status === 'resigned' && (
                        <button
                          onClick={() => handleRestore(t.id)}
                          className="text-xs text-green-600 hover:underline"
                        >
                          恢复
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      {keyword || statusFilter || roleFilter ? '无匹配结果' : '暂无教师'}
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
          title={editing ? '编辑教师' : '新增教师'}
          width="max-w-xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">姓名</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">手机号</label>
                <input
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  disabled={!!editing}
                />
              </div>
              {!editing && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">初始密码</label>
                  <input
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">编号</label>
                <input
                  value={form.employee_no}
                  onChange={(e) => setForm({ ...form, employee_no: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">组织</label>
                <input
                  type="number"
                  value={form.department_id}
                  onChange={(e) =>
                    setForm({ ...form, department_id: parseInt(e.target.value) || 1 })
                  }
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">角色</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="teacher">教师</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDialogOpen(false)}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200"
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

        {/* Reset Password Dialog */}
        <AdminDialog
          open={resetPwdOpen}
          onClose={() => setResetPwdOpen(false)}
          title={`重置密码 — ${target?.name}`}
          width="max-w-sm"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">新密码</label>
              <input
                type="password"
                value={pwdForm.password}
                onChange={(e) => setPwdForm({ ...pwdForm, password: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">确认密码</label>
              <input
                type="password"
                value={pwdForm.confirm}
                onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <p className="text-xs text-slate-400">重置后教师需使用新密码登录</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setResetPwdOpen(false)}
                className="px-4 py-2 text-sm rounded-lg border"
              >
                取消
              </button>
              <button
                onClick={resetPwd}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                确认
              </button>
            </div>
          </div>
        </AdminDialog>

        {/* Resign Dialog */}
        <AdminDeleteDialog
          open={resignOpen}
          onClose={() => setResignOpen(false)}
          onConfirm={handleResign}
          title={`确认将「${target?.name}」设为离职？`}
          description="离职后该教师不能登录，资料不删除，首页不显示，管理员仍可查看历史资料。"
        />
      </div>
    </AdminShell>
  );
}
