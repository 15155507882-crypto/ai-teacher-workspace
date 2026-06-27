'use client';
import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin-shell';
import { AdminPageHeader, AdminDialog } from '@/components/admin-ui';

const DEFAULT_URLS: Record<string, string> = {
  deepseek: 'https://api.deepseek.com/v1',
  openai: 'https://api.openai.com/v1',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
};

const STATUS_COLORS: Record<string, string> = {
  success: 'bg-green-50 text-green-700',
  failed: 'bg-red-50 text-red-600',
  unknown: 'bg-slate-50 text-slate-400',
};

interface Provider {
  id: number;
  name: string;
  provider_type: string;
  api_key_last4: string | null;
  api_key_masked: string;
  base_url: string;
  default_model: string;
  models: string;
  enabled: boolean;
  is_active: boolean;
  remark: string;
  last_test_status: string;
  last_test_message: string;
  last_test_at: string | null;
}

export default function AiConfigV2Page() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [form, setForm] = useState({
    name: '',
    provider_type: 'deepseek',
    api_key: '',
    base_url: '',
    default_model: '',
    models: '',
    enabled: true,
    is_active: false,
    remark: '',
  });

  async function api(url: string, opts?: RequestInit) {
    const token = localStorage.getItem('accessToken') || '';
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (opts?.method && opts.method !== 'GET') headers['Content-Type'] = 'application/json';
    const res = await fetch(url, {
      ...opts,
      headers: { ...headers, ...(opts?.headers as Record<string, string>) },
    });
    return res.json();
  }

  function loadList() {
    api('/api/admin/ai-configs').then((j) => {
      if (j.code === 0) setProviders(j.data || []);
    });
  }

  useEffect(() => {
    loadList();
    setLoading(false);
  }, []);

  function openNew() {
    setEditing(null);
    setForm({
      name: '',
      provider_type: 'deepseek',
      api_key: '',
      base_url: DEFAULT_URLS.deepseek,
      default_model: 'deepseek-chat',
      models: 'deepseek-chat',
      enabled: true,
      is_active: false,
      remark: '',
    });
    setDialogOpen(true);
  }

  function openEdit(p: Provider) {
    setEditing(p);
    setForm({
      name: p.name,
      provider_type: p.provider_type,
      api_key: '',
      base_url: p.base_url,
      default_model: p.default_model,
      models: p.models || '',
      enabled: p.enabled,
      is_active: p.is_active,
      remark: p.remark || '',
    });
    setDialogOpen(true);
  }

  async function save() {
    setMsg('');
    const body: any = { ...form, api_key: form.api_key || undefined };
    const j = editing
      ? await api(`/api/admin/ai-configs/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        })
      : await api('/api/admin/ai-configs', { method: 'POST', body: JSON.stringify(body) });
    if (j.code === 0) {
      setDialogOpen(false);
      loadList();
      setMsg('✅ 保存成功');
    } else setMsg(j.message || '保存失败');
  }

  async function testConn(p: Provider) {
    setMsg('');
    const j = await api(`/api/admin/ai-configs/${p.id}/test`, { method: 'POST' });
    setMsg(j.data?.success ? '✅ 连接成功' : `❌ ${j.data?.message || '连接失败'}`);
    loadList();
  }

  async function activate(p: Provider) {
    if (!p.enabled) {
      setMsg('已停用的Provider无法设为当前使用');
      return;
    }
    if (p.is_active) return;
    const j = await api(`/api/admin/ai-configs/${p.id}/activate`, { method: 'POST' });
    if (j.code === 0) {
      loadList();
      setMsg('✅ 已设为当前使用');
    } else setMsg(j.message || '操作失败');
  }

  async function toggleEnable(p: Provider) {
    if (
      p.enabled &&
      p.is_active &&
      !confirm('当前Provider正在使用，停用后AI功能将不可用，确认停用？')
    )
      return;
    const j = await api(`/api/admin/ai-configs/${p.id}/${p.enabled ? 'disable' : 'enable'}`, {
      method: 'POST',
    });
    if (j.code === 0) {
      loadList();
      setMsg(p.enabled ? '已停用' : '已启用');
    } else setMsg(j.message || '操作失败');
  }

  async function remove(p: Provider) {
    const warn = p.is_active
      ? `「${p.name}」是当前使用的Provider，删除后AI功能将不可用，确认删除？`
      : `确认删除「${p.name}」？`;
    if (!confirm(warn)) return;
    const j = await api(`/api/admin/ai-configs/${p.id}`, { method: 'DELETE' });
    if (j.code === 0) {
      loadList();
      setMsg('已删除');
    } else setMsg(j.message || '删除失败');
  }

  function handleProvTypeChange(type: string) {
    setForm({ ...form, provider_type: type, base_url: DEFAULT_URLS[type] || '' });
  }

  if (loading)
    return (
      <AdminShell>
        <div className="p-6 text-slate-400">加载中...</div>
      </AdminShell>
    );

  return (
    <AdminShell>
      <div className="p-6">
        <AdminPageHeader
          title="🤖 AI 配置"
          subtitle="配置系统使用的大模型 Provider，可同时配置多个，但同一时间只能启用一个当前使用 Provider。"
          action={
            <button
              onClick={openNew}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + 新增 Provider
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
        {providers.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            暂未配置 AI Provider，请点击「新增 Provider」完成配置。
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {providers.map((p) => (
            <div
              key={p.id}
              className={`bg-white rounded-xl border p-5 ${p.is_active ? 'border-green-300 ring-1 ring-green-200' : p.enabled ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-800">{p.name}</h3>
                  <p className="text-sm text-slate-400">{p.provider_type}</p>
                </div>
                <div className="flex gap-1">
                  {p.is_active && (
                    <span className="inline-flex rounded-md px-2 py-0.5 text-sm font-medium bg-green-50 text-green-700">
                      当前使用
                    </span>
                  )}
                  {!p.enabled && (
                    <span className="inline-flex rounded-md px-2 py-0.5 text-sm font-medium bg-slate-100 text-slate-500">
                      已停用
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-y-2 text-sm mb-4">
                <div>
                  <span className="text-slate-400">API Key:</span>{' '}
                  <span className="text-slate-700">{p.api_key_masked}</span>
                </div>
                <div>
                  <span className="text-slate-400">模型:</span>{' '}
                  <span className="text-slate-700">{p.default_model || '—'}</span>
                </div>
                <div className="col-span-2 truncate">
                  <span className="text-slate-400">URL:</span>{' '}
                  <span className="text-slate-600 text-sm">{p.base_url || '—'}</span>
                </div>
                {p.models && (
                  <div className="col-span-2">
                    <span className="text-slate-400">可用模型:</span>{' '}
                    <span className="text-slate-600 text-sm">{p.models}</span>
                  </div>
                )}
                {p.remark && (
                  <div className="col-span-2">
                    <span className="text-slate-400">备注:</span>{' '}
                    <span className="text-slate-600 text-sm">{p.remark}</span>
                  </div>
                )}
              </div>
              {p.last_test_status !== 'unknown' && (
                <div
                  className={`text-sm p-2 rounded-lg mb-3 ${STATUS_COLORS[p.last_test_status] || ''}`}
                >
                  {p.last_test_status === 'success' ? '✅' : '❌'} {p.last_test_message}
                  {p.last_test_at && (
                    <span className="text-slate-400 ml-2">
                      {new Date(p.last_test_at).toLocaleString('zh-CN')}
                    </span>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => testConn(p)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
                >
                  🔍 测试连接
                </button>
                {!p.is_active && (
                  <button
                    onClick={() => activate(p)}
                    className="px-3 py-1.5 text-sm rounded-lg border border-green-200 text-green-600 hover:bg-green-50"
                  >
                    ⭐ 设为当前使用
                  </button>
                )}
                <button
                  onClick={() => openEdit(p)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
                >
                  ✏️ 编辑
                </button>
                <button
                  onClick={() => toggleEnable(p)}
                  className={`px-3 py-1.5 text-sm rounded-lg border hover:bg-slate-50 ${p.enabled ? 'border-orange-200 text-orange-600' : 'border-green-200 text-green-600'}`}
                >
                  {p.enabled ? '⏸ 停用' : '▶️ 启用'}
                </button>
                <button
                  onClick={() => remove(p)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                >
                  🗑 删除
                </button>
              </div>
            </div>
          ))}
        </div>
        <AdminDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title={editing ? '编辑 Provider' : '新增 Provider'}
          width="max-w-lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">配置名称 *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="如 DeepSeek"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Provider 类型
                </label>
                <select
                  value={form.provider_type}
                  onChange={(e) => handleProvTypeChange(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="deepseek">DeepSeek</option>
                  <option value="openai">OpenAI</option>
                  <option value="qwen">通义千问</option>
                  <option value="custom">自定义</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  API Key {!editing && '*'}
                </label>
                <input
                  type="password"
                  value={form.api_key}
                  onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder={editing ? '已配置，留空则不修改' : '请输入 API Key'}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Base URL *</label>
                <input
                  value={form.base_url}
                  onChange={(e) => setForm({ ...form, base_url: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">默认模型 *</label>
                <input
                  value={form.default_model}
                  onChange={(e) => setForm({ ...form, default_model: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="deepseek-chat"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  可用模型列表
                </label>
                <input
                  value={form.models}
                  onChange={(e) => setForm({ ...form, models: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="逗号分隔"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">备注</label>
                <input
                  value={form.remark}
                  onChange={(e) => setForm({ ...form, remark: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                  />{' '}
                  启用
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  />{' '}
                  设为当前使用
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDialogOpen(false)}
                className="px-4 py-2 text-sm rounded-lg border"
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
      </div>
    </AdminShell>
  );
}
