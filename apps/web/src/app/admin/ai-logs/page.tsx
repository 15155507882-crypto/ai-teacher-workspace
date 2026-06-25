'use client';
import { AdminShell } from '@/components/admin-shell';
import { AppButton, AppCard, AppTag } from '@/components/ui/base';
import { useEffect, useState } from 'react';

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
  const [actions, setActions] = useState<ActionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ActionRecord | null>(null);

  useEffect(() => {
    fetch('/api/admin/ai-actions?size=100', {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.code === 0) setActions(j.data.items || []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell>
      <div className="p-6">
        <h2 className="text-section-title text-[var(--color-text-strong)] mb-6">AI 操作日志</h2>

        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-[var(--color-bg-muted)] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : actions.length === 0 ? (
          <AppCard className="p-12 text-center">
            <div className="text-3xl mb-3">📊</div>
            <p className="text-body text-[var(--color-text-muted)]">暂无 AI 操作记录</p>
          </AppCard>
        ) : (
          <AppCard className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-bg-muted)] text-[var(--color-text-muted)] text-tiny">
                <tr>
                  <th className="p-3 text-left">ID</th>
                  <th className="p-3 text-left">类型</th>
                  <th className="p-3 text-left">状态</th>
                  <th className="p-3 text-left">耗时</th>
                  <th className="p-3 text-left">时间</th>
                  <th className="p-3 text-right">详情</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((a) => (
                  <tr
                    key={a.id}
                    className="border-t border-[var(--color-border)] hover:bg-[var(--color-bg-app)]"
                  >
                    <td className="p-3 text-tiny text-[var(--color-text-muted)]">{a.id}</td>
                    <td className="p-3">
                      <AppTag color="blue">{a.action_type}</AppTag>
                    </td>
                    <td className="p-3">
                      <AppTag
                        color={
                          a.status === 'completed'
                            ? 'green'
                            : a.status === 'reverted'
                              ? 'orange'
                              : 'red'
                        }
                      >
                        {a.status === 'completed'
                          ? '完成'
                          : a.status === 'reverted'
                            ? '已撤销'
                            : '失败'}
                      </AppTag>
                      {a.reverted_at && <span className="text-tiny text-orange-500 ml-1">↩</span>}
                    </td>
                    <td className="p-3 text-tiny text-[var(--color-text-muted)]">
                      {a.duration_ms}ms
                    </td>
                    <td className="p-3 text-tiny text-[var(--color-text-muted)]">
                      {new Date(a.created_at).toLocaleString('zh-CN')}
                    </td>
                    <td className="p-3 text-right">
                      <AppButton size="sm" variant="ghost" onClick={() => setSelected(a)}>
                        查看
                      </AppButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AppCard>
        )}

        {/* Detail Drawer */}
        {selected && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/20" onClick={() => setSelected(null)} />
            <div className="relative w-[480px] bg-[var(--color-bg-surface)] shadow-[var(--shadow-float)] overflow-y-auto animate-slide-in p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-card-title text-[var(--color-text-strong)]">操作详情</h3>
                <button
                  onClick={() => setSelected(null)}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] text-xl"
                >
                  &times;
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-tiny text-[var(--color-text-muted)]">Action ID</p>
                  <p className="text-body font-medium">{selected.id}</p>
                </div>
                <div>
                  <p className="text-tiny text-[var(--color-text-muted)]">类型</p>
                  <AppTag color="blue">{selected.action_type}</AppTag>
                </div>
                <div>
                  <p className="text-tiny text-[var(--color-text-muted)]">状态</p>
                  <AppTag color={selected.status === 'completed' ? 'green' : 'orange'}>
                    {selected.status}
                  </AppTag>
                </div>
                <div>
                  <p className="text-tiny text-[var(--color-text-muted)]">耗时</p>
                  <p className="text-body">{selected.duration_ms}ms</p>
                </div>
                {selected.error_message && (
                  <div>
                    <p className="text-tiny text-[var(--color-text-muted)]">错误</p>
                    <p className="text-body text-red-600">{selected.error_message}</p>
                  </div>
                )}
                <div>
                  <p className="text-tiny text-[var(--color-text-muted)] mb-1">Input Snapshot</p>
                  <pre className="text-xs bg-[var(--color-bg-muted)] rounded-lg p-3 overflow-x-auto text-[var(--color-text-normal)]">
                    {JSON.stringify(selected.input_snapshot, null, 2)}
                  </pre>
                </div>
                <div>
                  <p className="text-tiny text-[var(--color-text-muted)] mb-1">Output Snapshot</p>
                  <pre className="text-xs bg-[var(--color-bg-muted)] rounded-lg p-3 overflow-x-auto text-[var(--color-text-normal)]">
                    {JSON.stringify(selected.output_snapshot, null, 2)}
                  </pre>
                </div>
                <div>
                  <p className="text-tiny text-[var(--color-text-muted)]">时间</p>
                  <p className="text-body">
                    {new Date(selected.created_at).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
