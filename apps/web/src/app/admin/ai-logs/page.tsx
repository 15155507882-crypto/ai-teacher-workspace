'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ActionRecord {
  id: number;
  action_type: string;
  target_type: string;
  status: string;
  duration_ms: number;
  input_snapshot: any;
  output_snapshot: any;
  error_message: string | null;
  reverted_at: string | null;
  created_at: string;
}

export default function AdminAILogsPage() {
  const router = useRouter();
  const [actions, setActions] = useState<ActionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const getToken = () => localStorage.getItem('accessToken');

  useEffect(() => {
    const t = localStorage.getItem('teacher');
    const teacher = t ? JSON.parse(t) : null;
    if (!teacher || teacher.role !== 'admin') {
      router.push('/home');
      return;
    }
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/ai-actions?size=100', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.code === 0) setActions(json.data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center">加载中...</div>;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-2 text-xl font-bold">AI 操作日志</h1>
      <p className="mb-4 text-sm text-gray-500">所有 AI 执行记录（含 Dry Run 预览和撤销）</p>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-2">ID</th>
              <th className="p-2">类型</th>
              <th className="p-2">状态</th>
              <th className="p-2">耗时</th>
              <th className="p-2">输入</th>
              <th className="p-2">输出</th>
              <th className="p-2">时间</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((a) => (
              <tr key={a.id} className="border-t hover:bg-gray-50">
                <td className="p-2">{a.id}</td>
                <td className="p-2">
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
                    {a.action_type}
                  </span>
                </td>
                <td className="p-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs ${
                      a.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : a.status === 'reverted'
                          ? 'bg-orange-100 text-orange-700'
                          : a.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100'
                    }`}
                  >
                    {a.status}
                  </span>
                  {a.reverted_at && <span className="ml-1 text-xs text-orange-500">已撤销</span>}
                </td>
                <td className="p-2 text-gray-500">{a.duration_ms}ms</td>
                <td className="p-2 max-w-[200px] truncate text-xs text-gray-500">
                  {a.input_snapshot ? JSON.stringify(a.input_snapshot).slice(0, 80) : '—'}
                </td>
                <td className="p-2 max-w-[200px] truncate text-xs text-gray-500">
                  {a.output_snapshot ? JSON.stringify(a.output_snapshot).slice(0, 80) : '—'}
                </td>
                <td className="p-2 text-xs text-gray-400">
                  {new Date(a.created_at).toLocaleString('zh-CN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {actions.length === 0 && <div className="p-8 text-center text-gray-400">暂无操作记录</div>}
      </div>
    </div>
  );
}
