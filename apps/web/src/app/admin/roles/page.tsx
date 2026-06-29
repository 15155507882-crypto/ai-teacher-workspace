'use client';
import { useState } from 'react';
import { AdminShell } from '@/components/admin-shell';
import {
  AdminDialog,
  AdminDeleteDialog,
  AdminStatusTag,
  AdminPageHeader,
} from '@/components/admin-ui';

interface Role {
  code: string;
  name: string;
  desc: string;
  builtin: boolean;
  status: string;
}
const MOCK_ROLES: Role[] = [
  {
    code: 'super_admin',
    name: '超级管理员',
    desc: '系统最高权限，不可删除',
    builtin: true,
    status: 'active',
  },
  {
    code: 'school_admin',
    name: '学校管理员',
    desc: '管理学校、组织、教师和后台',
    builtin: true,
    status: 'active',
  },
  {
    code: 'teacher',
    name: '教师',
    desc: '查看全校资料，编辑本人资料',
    builtin: true,
    status: 'active',
  },
];

const permissionGroups = [
  { key: 'home', name: '首页权限', perms: ['查看首页', '查看教师空间', '查看任意教师资料'] },
  {
    key: 'content',
    name: '资料权限',
    perms: [
      '新增资料',
      '编辑本人资料',
      '删除本人资料',
      '删除他人资料',
      '查看资料详情',
      '下载资料',
      '导出PDF',
    ],
  },
  {
    key: 'group',
    name: '集体备课权限',
    perms: ['查看集体备课', '新增集体备课', '参与集体备课', '删除集体备课'],
  },
  {
    key: 'admin',
    name: '后台权限',
    perms: ['进入后台', '学校管理', '组织管理', '教师管理', '角色管理', 'AI日志'],
  },
];

export default function AdminRolesPage() {
  const [roles] = useState<Role[]>(MOCK_ROLES);
  const [editOpen, setEditOpen] = useState(false);
  const [permOpen, setPermOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [target, setTarget] = useState<Role | null>(null);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ name: '', code: '', desc: '' });
  const [perms, setPerms] = useState<Record<string, boolean>>({});

  const openEdit = (r: Role) => {
    setEditing(r);
    setForm({ name: r.name, code: r.code, desc: r.desc });
    setEditOpen(true);
  };
  const openPerms = (r: Role) => {
    setEditing(r);
    setPermOpen(true);
  };
  const openDelete = (r: Role) => {
    if (r.builtin) {
      setMsg('系统内置角色不允许删除');
      return;
    }
    setTarget(r);
    setDeleteOpen(true);
  };

  return (
    <AdminShell>
      <div className="p-8">
        <AdminPageHeader
          title="角色管理"
          action={
            <button
              onClick={() => {
                setEditing(null);
                setForm({ name: '', code: '', desc: '' });
                setEditOpen(true);
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + 新增角色
            </button>
          }
        />
        {msg && <div className="mb-4 text-sm p-3 rounded-xl bg-blue-50 text-blue-700">{msg}</div>}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(31,45,78,0.07)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-base">
              <thead className="bg-[#f7faff] text-sm font-semibold text-[#6e7fa7] whitespace-nowrap">
                <tr>
                  <th className="px-5 py-4 text-left">名称</th>
                  <th className="px-5 py-4 text-left">编码</th>
                  <th className="px-5 py-4 text-left">说明</th>
                  <th className="px-5 py-4 text-left">内置</th>
                  <th className="px-5 py-4 text-left">状态</th>
                  <th className="px-5 py-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roles.map((r) => (
                  <tr key={r.code} className="transition hover:bg-[#f7faff]">
                    <td className="px-5 py-4 font-semibold text-[#10234f]">{r.name}</td>
                    <td className="px-5 py-4 text-[#53688f] font-mono text-sm">{r.code}</td>
                    <td className="px-5 py-4 text-[#53688f] text-sm">{r.desc}</td>
                    <td className="px-5 py-4">
                      {r.builtin ? (
                        <span className="text-sm text-amber-600 font-medium">系统内置</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <AdminStatusTag status={r.status} />
                    </td>
                    <td className="px-5 py-4 text-right space-x-3">
                      <button
                        onClick={() => openEdit(r)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => openPerms(r)}
                        className="text-sm font-medium text-purple-600 hover:text-purple-700 underline-offset-2 hover:underline"
                      >
                        权限
                      </button>
                      <button
                        onClick={() => openDelete(r)}
                        className="text-sm font-medium text-red-500 hover:text-red-600 underline-offset-2 hover:underline"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Role Form Dialog */}
        <AdminDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          title={editing ? '编辑角色' : '新增角色'}
          width="max-w-md"
        >
          <div className="p-3 rounded-lg bg-amber-50 text-amber-700 text-sm mb-4">
            ⚠️ 角色管理接口待接入，当前为 Mock 数据
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">角色名称</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">角色编码</label>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">说明</label>
              <input
                value={form.desc}
                onChange={(e) => setForm({ ...form, desc: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditOpen(false)}
                className="px-4 py-2 text-sm rounded-lg border"
              >
                取消
              </button>
              {!editing && (
                <button
                  onClick={() => {
                    setForm({ name: '', code: '', desc: '' });
                    setMsg('Mock: 已保存，继续添加');
                  }}
                  className="px-4 py-2 text-sm rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50"
                >
                  保存并继续
                </button>
              )}
              <button
                onClick={() => {
                  setEditOpen(false);
                  setMsg('Mock: 保存成功（接口待接入）');
                }}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        </AdminDialog>

        {/* Permission Dialog */}
        <AdminDialog
          open={permOpen}
          onClose={() => setPermOpen(false)}
          title={`权限配置 — ${editing?.name || ''}`}
          width="max-w-2xl"
        >
          <div className="p-3 rounded-lg bg-amber-50 text-amber-700 text-sm mb-4">
            ⚠️ 权限配置接口待接入
          </div>
          <div className="grid grid-cols-2 gap-4">
            {permissionGroups.map((g) => (
              <div key={g.key} className="border border-slate-200 rounded-lg p-3">
                <h4 className="text-sm font-medium text-slate-700 mb-2">{g.name}</h4>
                <div className="space-y-1.5">
                  {g.perms.map((p) => (
                    <label
                      key={p}
                      className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer"
                    >
                      <input type="checkbox" className="rounded" /> {p}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <button
              onClick={() => setPermOpen(false)}
              className="px-4 py-2 text-sm rounded-lg border"
            >
              取消
            </button>
            <button
              onClick={() => {
                setPermOpen(false);
                setMsg('Mock: 权限已保存（接口待接入）');
              }}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              保存
            </button>
          </div>
        </AdminDialog>

        {/* Delete Dialog */}
        <AdminDeleteDialog
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onConfirm={() => {
            setDeleteOpen(false);
            setMsg('Mock: 已删除（接口待接入）');
          }}
          title={`删除「${target?.name}」？`}
          description="删除后不可恢复。系统内置角色不允许删除。"
        />
      </div>
    </AdminShell>
  );
}
