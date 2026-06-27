'use client';
import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function AdminAiConfigPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [form, setForm] = useState({
    provider_id: 1,
    api_key: '',
    base_url: '',
    default_model: '',
  });
  const [stats, setStats] = useState<any>(null);
  const [statsRange, setStatsRange] = useState('today');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const token = () => localStorage.getItem('accessToken') || '';

  async function api(url: string, opts?: RequestInit) {
    const res = await fetch(url, {
      ...opts,
      headers: {
        Authorization: `Bearer ${token()}`,
        'Content-Type': 'application/json',
        ...opts?.headers,
      },
    });
    return res.json();
  }

  useEffect(() => {
    (async () => {
      const [p, c, s] = await Promise.all([
        api('/api/admin/ai/providers'),
        api('/api/admin/ai/config'),
        api('/api/admin/ai/token-stats?range=today'),
      ]);
      if (p.code === 0) setProviders(p.data);
      if (c.code === 0 && c.data) {
        setConfig(c.data);
        setForm({
          provider_id: c.data.provider_id || 1,
          api_key: '',
          base_url: c.data.base_url || '',
          default_model: c.data.default_model || '',
        });
      }
      if (s.code === 0) setStats(s.data);
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    const j = await api('/api/admin/ai/config', {
      method: 'POST',
      body: JSON.stringify({
        provider_id: form.provider_id,
        api_key_encrypted: form.api_key,
        base_url: form.base_url,
        default_model: form.default_model,
      }),
    });
    setMsg(j.code === 0 ? '保存成功' : j.message || '保存失败');
  };

  const testConn = async () => {
    const j = await api('/api/admin/ai/test-connection', {
      method: 'POST',
      body: JSON.stringify({ configId: config?.id || 1 }),
    });
    setMsg(
      j.code === 0
        ? j.data?.success
          ? '连接成功'
          : '连接失败: ' + (j.data?.message || '')
        : '测试失败'
    );
  };

  const loadStats = async (range: string) => {
    setStatsRange(range);
    const j = await api(`/api/admin/ai/token-stats?range=${range}`);
    if (j.code === 0) setStats(j.data);
  };

  if (loading)
    return (
      <AdminShell>
        <div className="p-6 text-slate-400">加载中...</div>
      </AdminShell>
    );

  return (
    <AdminShell>
      <div className="p-6 max-w-3xl">
        <h1 className="text-xl font-bold text-slate-800 mb-6">AI 配置</h1>

        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Provider 配置</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">选择 Provider</label>
              <select
                value={form.provider_id}
                onChange={(e) => setForm({ ...form, provider_id: parseInt(e.target.value) })}
                className="w-56 rounded-lg border px-3 py-2 text-sm"
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                API Key（加密存储）
              </label>
              <Input
                type="password"
                value={form.api_key}
                onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                placeholder={
                  config?.api_key_encrypted ? '已配置（重新输入覆盖）' : '请输入 API Key'
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Base URL</label>
                <Input
                  value={form.base_url}
                  onChange={(e) => setForm({ ...form, base_url: e.target.value })}
                  placeholder="https://api.deepseek.com/v1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">默认模型</label>
                <Input
                  value={form.default_model}
                  onChange={(e) => setForm({ ...form, default_model: e.target.value })}
                  placeholder="deepseek-chat"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={save}>保存配置</Button>
              <Button variant="outline" onClick={testConn}>
                测试连接
              </Button>
            </div>
            {msg && (
              <div
                className={`text-sm ${msg.includes('成功') ? 'text-green-600' : 'text-red-500'}`}
              >
                {msg}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Token 统计</h2>
          <div className="flex gap-1 mb-4">
            {['today', 'week', 'month', 'all'].map((r) => (
              <button
                key={r}
                onClick={() => loadStats(r)}
                className={`px-3 py-1.5 text-sm rounded-lg ${statsRange === r ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                {r === 'today' ? '今日' : r === 'week' ? '本周' : r === 'month' ? '本月' : '累计'}
              </button>
            ))}
          </div>
          {stats && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {stats.total_tokens?.toLocaleString() || 0}
                </p>
                <p className="text-sm text-slate-500 mt-1">Total Tokens</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{stats.call_count || 0}</p>
                <p className="text-sm text-slate-500 mt-1">调用次数</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-purple-600">${stats.estimated_cost || '0'}</p>
                <p className="text-sm text-slate-500 mt-1">费用估算</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
