'use client';
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { AdminShell } from '@/components/admin-shell';
import {
  AdminDialog,
  AdminDeleteDialog,
  AdminStatusTag,
  AdminFilterBar,
  AdminPageHeader,
} from '@/components/admin-ui';
import { Pagination } from '@/components/ui/pagination';

interface Teacher {
  id: number;
  name: string;
  mobile: string;
  employee_no: string | null;
  department_id: number;
  department_ids?: string | null;
  department_name?: string;
  role: string;
  status: string;
  last_login_at: string | null;
  gender?: string;
}

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [filtered, setFiltered] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resetPwdOpen, setResetPwdOpen] = useState(false);
  const [resignOpen, setResignOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [target, setTarget] = useState<Teacher | null>(null);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    employee_no: '',
    department_id: 1,
    department_ids: [] as number[],
    gender: '',
    role: [] as string[],
    password: '',
  });
  const [pwdForm, setPwdForm] = useState({ password: '', confirm: '' });

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

  async function fetchTeachers() {
    setLoading(true);
    const [tRes, dRes] = await Promise.all([
      api('/api/admin/teachers?size=200'),
      api('/api/admin/departments/options?school_id=1'),
    ]);
    if (dRes.code === 0) setDepartments(dRes.data);
    if (tRes.code === 0) {
      const deptMap = new Map((dRes.data || []).map((d: any) => [d.id, d.name]));
      setTeachers(
        (tRes.data.items || []).map((t: Teacher) => ({
          ...t,
          department_name: deptMap.get(Number(t.department_id)) || '',
        }))
      );
    }
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm({
      name: '',
      mobile: '',
      employee_no: '',
      department_id: 1,
      department_ids: [],
      gender: '',
      role: ['teacher'],
      password: '',
    });
    setDialogOpen(true);
  }
  function openEdit(t: Teacher) {
    console.log(
      '[OPENEDIT] teacher:',
      t.id,
      'dept_ids:',
      t.department_ids,
      'dept_ids_dedup:',
      t.department_ids ? [...new Set(t.department_ids.split(',').map(Number).filter(Boolean))] : [],
      'gender:',
      t.gender,
      'role:',
      t.role
    );
    setEditing(t);
    setForm({
      name: t.name,
      mobile: t.mobile,
      employee_no: t.employee_no || '',
      department_id: Number(t.department_id) || 1,
      department_ids: t.department_ids
        ? [...new Set(t.department_ids.split(',').map(Number).filter(Boolean))]
        : [],
      gender: (t as any).gender || '',
      role: t.role ? [...new Set(t.role.split(',').filter(Boolean))] : ['teacher'],
      password: '',
    });
    setDialogOpen(true);
  }

  async function save() {
    setSaving(true);
    const payload: any = {
      name: form.name,
      department_id: form.department_id,
      department_ids:
        form.department_ids.length > 0 ? [...new Set(form.department_ids)].join(',') : null,
      employee_no: form.employee_no,
      gender: form.gender || null,
      role: form.role.join(',') || 'teacher',
    };
    console.log('[SAVE] editing:', !!editing, 'payload:', JSON.stringify(payload));
    console.log('[SAVE] form.department_ids:', form.department_ids, 'form.role:', form.role);
    const j = editing
      ? await api(`/api/admin/teachers/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      : await api('/api/admin/teachers', {
          method: 'POST',
          body: JSON.stringify({
            school_id: 1,
            ...payload,
            mobile: form.mobile,
            password: form.password || '123456',
          }),
        });
    if (j.code === 0) {
      console.log('[SAVE] success, refreshing');
      setDialogOpen(false);
      fetchTeachers();
      setMsg(editing ? '更新成功' : '创建成功');
    } else {
      console.log('[SAVE] failed:', j);
      setMsg(j.message || '保存失败');
    }
    setSaving(false);
  }

  async function saveAndContinue() {
    if (editing) return save(); // 编辑模式不支持继续添加
    setSaving(true);
    const j = await api('/api/admin/teachers', {
      method: 'POST',
      body: JSON.stringify({
        school_id: 1,
        name: form.name,
        mobile: form.mobile,
        password: form.password || '123456',
        department_id: form.department_id,
        department_ids:
          form.department_ids.length > 0 ? [...new Set(form.department_ids)].join(',') : null,
        employee_no: form.employee_no,
        gender: form.gender || null,
        role: form.role.join(',') || 'teacher',
      }),
    });
    if (j.code === 0) {
      fetchTeachers();
      setMsg('已保存，继续添加');
      // 重置表单，保留组织/角色默认值
      setForm({
        name: '',
        mobile: '',
        employee_no: '',
        department_id: form.department_id,
        department_ids: form.department_ids,
        gender: '',
        role: form.role,
        password: '',
      });
    } else setMsg(j.message || '保存失败');
    setSaving(false);
  }

  async function resetPwd() {
    if (!target || pwdForm.password !== pwdForm.confirm) {
      setMsg('两次密码不一致');
      return;
    }
    const j = await api(`/api/admin/teachers/${target.id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ password: pwdForm.password }),
    });
    if (j.code === 0) {
      setResetPwdOpen(false);
      setMsg('密码已重置');
    } else setMsg(j.message || '操作失败');
  }

  async function handleResign() {
    if (!target) return;
    const j = await api(`/api/admin/teachers/${target.id}/resign`, {
      method: 'POST',
      body: JSON.stringify({ reason: '管理员操作' }),
    });
    if (j.code === 0) {
      setResignOpen(false);
      fetchTeachers();
      setMsg('已设为离职');
    } else setMsg(j.message || '操作失败');
  }

  async function handleRestore(id: number) {
    const j = await api(`/api/admin/teachers/${id}/restore`, {
      method: 'POST',
      body: JSON.stringify({ reason: '管理员操作' }),
    });
    if (j.code === 0) {
      fetchTeachers();
      setMsg('已恢复');
    } else setMsg(j.message || '操作失败');
  }

  return (
    <AdminShell>
      <div className="p-6">
        <AdminPageHeader
          title="教师管理"
          action={
            <div className="flex gap-2">
              <a
                href={`data:text/csv;charset=utf-8,${encodeURIComponent(
                  `姓名,手机号,密码,编号,性别,组织,角色\n${
                    departments.length > 0
                      ? departments
                          .slice(0, 3)
                          .map((d) => `, , , , ,${d.name},教师`)
                          .join('\n')
                      : '张老师,13800000101,123456,TC001,,请填写组织名称,教师'
                  }\n`
                )}`}
                download="教师导入模板.csv"
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                📥 下载模板
              </a>
              <label className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 cursor-pointer">
                📤 批量导入
                <input
                  type="file"
                  className="hidden"
                  accept=".csv,.xlsx,.xls"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    // Parse CSV or Excel to array of rows
                    const rows: string[][] = file.name.endsWith('.csv')
                      ? (await file.text())
                          .split('\n')
                          .filter((l: string) => l.trim())
                          .map((l: string) => l.split(','))
                      : await (async () => {
                          const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), {
                            type: 'array',
                          });
                          return XLSX.utils.sheet_to_json<string[]>(wb.Sheets[wb.SheetNames[0]], {
                            header: 1,
                          });
                        })();
                    if (rows.length < 2) {
                      setMsg('文件为空或格式不正确');
                      return;
                    }
                    const headers = rows[0].map((h: string) => String(h).trim());
                    // Build header index map for flexible column order
                    const headerMap: Record<string, number> = {};
                    headers.forEach((h: string, i: number) => {
                      headerMap[h] = i;
                    });

                    // Role mapping: Chinese → English
                    const roleMap: Record<string, string> = {
                      教师: 'teacher',
                      管理员: 'admin',
                      teacher: 'teacher',
                      admin: 'admin',
                    };
                    // Gender mapping: Chinese → English
                    const genderMap: Record<string, string> = {
                      男: 'male',
                      女: 'female',
                      male: 'male',
                      female: 'female',
                    };

                    // Department name → ID lookup
                    const deptMap = new Map(departments.map((d) => [d.name, d.id]));

                    const teachers = rows
                      .slice(1)
                      .map((vals) => {
                        const get = (key: string) => {
                          const idx = headerMap[key];
                          return idx !== undefined ? String(vals[idx] || '').trim() : '';
                        };
                        // Resolve department: try name first, fallback to numeric ID
                        const deptRaw = get('组织') || get('组织ID') || get('组织id') || '';
                        const deptNames = deptRaw
                          .split('/')
                          .map((s) => s.trim())
                          .filter(Boolean);
                        let department_id = 1;
                        if (deptNames.length > 0) {
                          // Try name match
                          for (const name of deptNames) {
                            const id =
                              deptMap.get(name) ||
                              departments.find((d) => d.name.includes(name))?.id;
                            if (id) {
                              department_id = id;
                              break;
                            }
                          }
                          // Fallback: numeric
                          if (!deptMap.get(deptNames[0]) && /^\d+$/.test(deptNames[0])) {
                            department_id = parseInt(deptNames[0]) || 1;
                          }
                        }
                        const roleRaw = get('角色') || 'teacher';
                        const role = roleMap[roleRaw] || 'teacher';
                        const genderRaw = get('性别') || '';
                        const gender = genderMap[genderRaw] || null;
                        return {
                          name: get('姓名') || '',
                          mobile: get('手机号') || '',
                          password: get('密码') || '123456',
                          employee_no: get('编号') || '',
                          gender,
                          department_id,
                          role,
                          school_id: 1,
                        };
                      })
                      .filter((t) => t.name && t.mobile);
                    if (!confirm(`确认导入 ${teachers.length} 名教师？`)) return;
                    const r = await api('/api/admin/teachers/batch-import', {
                      method: 'POST',
                      body: JSON.stringify({ teachers }),
                    });
                    if (r.code === 0) {
                      setMsg(
                        `导入完成: 成功${r.data.results.filter((x: any) => x.status === '成功').length}人, 跳过${r.data.results.filter((x: any) => x.status === '跳过').length}人`
                      );
                      fetchTeachers();
                    } else setMsg(r.message || '导入失败');
                    e.target.value = '';
                  }}
                />
              </label>
              <button
                onClick={openNew}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                + 新增教师
              </button>
            </div>
          }
        />
        {msg && (
          <div
            className={`mb-3 text-sm p-3 rounded-lg ${msg.includes('成功') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}
          >
            {msg}
          </div>
        )}

        <AdminFilterBar>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索姓名/手机号/编号..."
            className="w-56 rounded-lg border px-3 py-2 text-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">全部状态</option>
            <option value="active">在职</option>
            <option value="resigned">离职</option>
            <option value="disabled">停用</option>
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">全部角色</option>
            <option value="teacher">教师</option>
            <option value="admin">管理员</option>
          </select>
          <span className="text-sm text-slate-400 self-center ml-auto">{filtered.length} 人</span>
        </AdminFilterBar>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-base">
              <thead className="bg-slate-50 text-sm text-slate-500 whitespace-nowrap">
                <tr>
                  <th className="p-3 text-left w-14">序号</th>
                  <th className="p-3 text-left">姓名</th>
                  <th className="p-3 text-left">手机号</th>
                  <th className="p-3 text-left">性别</th>
                  <th className="p-3 text-left">角色</th>
                  <th className="p-3 text-left">组织</th>
                  <th className="p-3 text-left">编号</th>
                  <th className="p-3 text-left">状态</th>
                  <th className="p-3 text-left">最近登录</th>
                  <th className="p-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice((page - 1) * pageSize, page * pageSize).map((t, i) => {
                  const deptMap = new Map(departments.map((d) => [d.id, d.name]));
                  const roleMap: Record<string, string> = { teacher: '教师', admin: '管理员' };
                  const roles = (t.role || '')
                    .split(',')
                    .map((r) => roleMap[r.trim()] || r.trim())
                    .filter(Boolean);
                  // 合并 department_name 和 department_ids 显示
                  const deptNames: string[] = [];
                  if (t.department_name) deptNames.push(t.department_name);
                  if (t.department_ids) {
                    t.department_ids.split(',').forEach((idStr) => {
                      const did = Number(idStr.trim());
                      if (did && did !== t.department_id) {
                        const name = deptMap.get(did);
                        if (name && !deptNames.includes(name)) deptNames.push(name);
                      }
                    });
                  }
                  return (
                    <tr key={t.id} className="border-t hover:bg-slate-50">
                      <td className="p-3 text-sm text-slate-400">
                        {(page - 1) * pageSize + i + 1}
                      </td>
                      <td className="p-3 font-medium text-slate-800">{t.name}</td>
                      <td className="p-3 text-slate-500">{t.mobile}</td>
                      <td className="p-3 text-slate-500 text-sm">
                        {(t as any).gender === 'male'
                          ? '男'
                          : (t as any).gender === 'female'
                            ? '女'
                            : '—'}
                      </td>
                      <td className="p-3">
                        <span className="text-sm px-2 py-0.5 rounded-md bg-slate-50 text-slate-600">
                          {roles.join(' / ') || '—'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 text-sm">{deptNames.join(' / ') || '—'}</td>
                      <td className="p-3 text-slate-400">{t.employee_no || '—'}</td>
                      <td className="p-3">
                        <AdminStatusTag status={t.status} />
                      </td>
                      <td className="p-3 text-sm text-slate-400">
                        {t.last_login_at ? new Date(t.last_login_at).toLocaleString('zh-CN') : '—'}
                      </td>
                      <td className="p-3 text-right space-x-1">
                        <button
                          onClick={() => openEdit(t)}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => {
                            setTarget(t);
                            setPwdForm({ password: '', confirm: '' });
                            setResetPwdOpen(true);
                          }}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          密码
                        </button>
                        {t.status === 'active' && (
                          <button
                            onClick={() => {
                              setTarget(t);
                              setResignOpen(true);
                            }}
                            className="text-sm text-orange-500 hover:underline"
                          >
                            离职
                          </button>
                        )}
                        {t.status === 'resigned' && (
                          <button
                            onClick={() => handleRestore(t.id)}
                            className="text-sm text-green-600 hover:underline"
                          >
                            恢复
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      暂无数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pageSize={pageSize} total={filtered.length} onChange={setPage} />

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
                  <label className="block text-sm font-medium text-slate-700 mb-1">密码</label>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">性别</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="">--</option>
                  <option value="male">男</option>
                  <option value="female">女</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  组织（可多选）
                </label>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                  {departments.map((d) => (
                    <label
                      key={d.id}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${
                        form.department_ids.includes(d.id)
                          ? 'border-blue-400 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={form.department_ids.includes(d.id)}
                        onChange={() => {
                          setForm((prev) => {
                            const isChecked = prev.department_ids.includes(d.id);
                            const newIds = isChecked
                              ? prev.department_ids.filter((id) => id !== d.id)
                              : [...prev.department_ids, d.id];
                            return {
                              ...prev,
                              department_ids: newIds,
                              department_id: newIds.length > 0 ? newIds[0] : 1,
                            };
                          });
                        }}
                      />
                      {d.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  角色（可多选）
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'teacher', label: '教师' },
                    { value: 'admin', label: '管理员' },
                  ].map((r) => (
                    <label
                      key={r.value}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${
                        form.role.includes(r.value)
                          ? 'border-blue-400 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={form.role.includes(r.value)}
                        onChange={() => {
                          setForm((prev) => ({
                            ...prev,
                            role: prev.role.includes(r.value)
                              ? prev.role.filter((v) => v !== r.value)
                              : [...prev.role, r.value],
                          }));
                        }}
                      />
                      {r.label}
                    </label>
                  ))}
                </div>
              </div>
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
                  disabled={saving}
                  className="px-4 py-2 text-sm rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                >
                  {saving ? '保存中...' : '保存并继续'}
                </button>
              )}
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </AdminDialog>

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
            <p className="text-sm text-slate-400">重置后需使用新密码登录</p>
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
