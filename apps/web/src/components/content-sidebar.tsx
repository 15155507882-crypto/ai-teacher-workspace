'use client';

import { useEffect, useState } from 'react';
import { WorkspaceContext } from './teacher-workspace';

interface ContentItem {
  id: number;
  title: string;
  content_type: string;
  created_at: string;
}
interface Stats {
  personal_lesson: number;
  reflection: number;
  group_lesson: number;
  plan_summary: number;
  total: number;
}

const typeIcons: Record<string, string> = {
  personal_lesson: '📖',
  reflection: '📝',
  group_lesson: '👥',
  plan_summary: '📋',
};
const typeLabels: Record<string, string> = {
  personal_lesson: '个人备课',
  reflection: '教学反思',
  group_lesson: '集体备课',
  plan_summary: '计划总结',
};

export function ContentSidebar({
  ctx,
  selectedId,
  onSelect,
  refreshKey,
}: {
  ctx: WorkspaceContext;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  refreshKey: number;
}) {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [stats, setStats] = useState<Stats>({
    personal_lesson: 0,
    reflection: 0,
    group_lesson: 0,
    plan_summary: 0,
    total: 0,
  });
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/teachers/${ctx.teacherId}/contents?size=200`, {
        headers: { Authorization: `Bearer ${ctx.token}` },
      }).then((r) => r.json()),
      fetch(`/api/teachers/${ctx.teacherId}/content-stats`, {
        headers: { Authorization: `Bearer ${ctx.token}` },
      }).then((r) => r.json()),
    ])
      .then(([cJson, sJson]) => {
        if (cJson.code === 0) setContents(cJson.data.items || []);
        if (sJson.code === 0) setStats(sJson.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [ctx.teacherId, ctx.token, refreshKey]);

  const filtered = contents.filter((c) => {
    if (filter && c.content_type !== filter) return false;
    if (search && !c.title.includes(search)) return false;
    return true;
  });

  return (
    <aside className="w-[280px] shrink-0 bg-[var(--color-bg-surface)] border-r border-[var(--color-border)] flex flex-col h-full">
      <div className="p-4 border-b border-[var(--color-border)]">
        <h2 className="text-sm font-bold text-[var(--color-text-strong)]">我的资料</h2>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索..."
          className="w-full mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-3 py-1.5 text-xs focus:outline-none focus:border-[var(--color-primary-500)]"
        />
      </div>

      <div className="p-3 space-y-0.5">
        <FilterBtn
          label="全部"
          count={stats.total}
          active={filter === ''}
          onClick={() => setFilter('')}
        />
        {['personal_lesson', 'reflection', 'group_lesson', 'plan_summary'].map((t) => (
          <FilterBtn
            key={t}
            label={typeLabels[t]}
            count={(stats as any)[t] || 0}
            active={filter === t}
            onClick={() => setFilter(t)}
          />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 pt-1 space-y-1">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-[var(--color-bg-muted)] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)] text-center py-8">
            {contents.length === 0 ? '上传资料后在这里查看' : '无匹配结果'}
          </p>
        ) : (
          filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id === selectedId ? null : c.id)}
              className={`w-full text-left rounded-lg px-3 py-2 text-xs transition-all ${
                c.id === selectedId
                  ? 'bg-[var(--color-primary-50)] border border-[var(--color-primary-500)]'
                  : 'hover:bg-[var(--color-bg-muted)] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{typeIcons[c.content_type] || '📄'}</span>
                <span className="font-medium truncate flex-1">{c.title}</span>
              </div>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 pl-6">
                {new Date(c.created_at).toLocaleDateString('zh-CN')}
              </p>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}

function FilterBtn({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between rounded-lg px-3 py-1.5 text-xs transition ${
        active
          ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-600)] font-medium'
          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)]'
      }`}
    >
      <span>{label}</span>
      <span className="text-[10px] opacity-60">{count}</span>
    </button>
  );
}
