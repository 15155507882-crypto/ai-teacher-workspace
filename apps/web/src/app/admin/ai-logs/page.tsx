'use client';
import { AdminShell } from '@/components/admin-shell';
import { useEffect, useState } from 'react';

export default function AdminAILogsPage() {
  const [actions, setActions] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/admin/ai-actions?size=100', {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.code === 0) setActions(j.data.items || []);
      });
  }, []);
  return (
    <AdminShell title="AI 操作日志">
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-bg-muted)] text-left">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">类型</th>
              <th className="p-3">状态</th>
              <th className="p-3">耗时</th>
              <th className="p-3">时间</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((a) => (
              <tr key={a.id} className="border-t hover:bg-gray-50">
                <td className="p-3">{a.id}</td>
                <td className="p-3">
                  <span className="text-xs bg-blue-100 text-blue-700 rounded px-1.5 py-0.5">
                    {a.action_type}
                  </span>
                </td>
                <td className="p-3">
                  <span
                    className={`text-xs rounded px-1.5 py-0.5 ${a.status === 'completed' ? 'bg-green-100 text-green-700' : a.status === 'reverted' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}
                  >
                    {a.status}
                  </span>
                </td>
                <td className="p-3 text-gray-500">{a.duration_ms}ms</td>
                <td className="p-3 text-gray-400 text-xs">
                  {new Date(a.created_at).toLocaleString('zh-CN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {actions.length === 0 && <div className="p-8 text-center text-gray-400">暂无记录</div>}
      </div>
    </AdminShell>
  );
}
