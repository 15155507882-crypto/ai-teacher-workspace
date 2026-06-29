'use client';
import { useEffect, useState } from 'react';

interface Conv {
  id: number;
  title: string;
  summary: string | null;
  last_active_at: string | null;
  created_at: string;
}

export function ConversationSidebar({
  token,
  activeId,
  onSelect,
}: {
  token: string;
  activeId: number | null;
  onSelect: (id: number) => void;
}) {
  const [convs, setConvs] = useState<Conv[]>([]);
  const [keyword, setKeyword] = useState('');

  const load = (kw?: string) => {
    const url = kw
      ? `/api/ai/conversations?keyword=${encodeURIComponent(kw)}`
      : '/api/ai/conversations';
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((j) => {
        if (j.data) setConvs(j.data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const newConv = async () => {
    const r = await fetch('/api/ai/conversations/today', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const j = await r.json();
    if (j.data) {
      onSelect(j.data.id);
      load();
    }
  };

  const delConv = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('删除会话？业务内容不受影响。')) return;
    await fetch(`/api/ai/conversations/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    load();
  };

  const getDateLabel = (d: string) => {
    const date = new Date(d);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return '今天';
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return '昨天';
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  // Group by date
  const groups = new Map<string, Conv[]>();
  for (const c of convs) {
    const label = getDateLabel(c.created_at);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(c);
  }

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-slate-200 bg-white/90 text-[#30466f]">
      <div className="border-b border-slate-100 p-4">
        <button
          onClick={newConv}
          className="w-full rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(37,99,235,0.22)] transition hover:bg-blue-700"
        >
          + 新会话
        </button>
      </div>
      <div className="px-4 py-3">
        <input
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
            load(e.target.value);
          }}
          placeholder="搜索..."
          className="h-10 w-full rounded-xl border border-slate-200 bg-[#f7faff] px-3 text-sm text-[#30466f] outline-none transition placeholder:text-[#8ca0c7] focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
        />
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-3 pb-3">
        {[...groups.entries()].map(([label, items]) => (
          <div key={label}>
            <p className="px-2 py-1 text-xs font-bold text-[#8ba0c5]">{label}</p>
            {items.map((c) => (
              <div
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={`group flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-sm transition ${
                  activeId === c.id
                    ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100'
                    : 'text-[#6d7fa7] hover:bg-[#f7faff] hover:text-[#10234f]'
                }`}
              >
                <span className="flex-1 truncate font-medium">{c.title}</span>
                <button
                  onClick={(e) => delConv(e, c.id)}
                  className="ml-1 text-xs text-slate-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="border-t border-slate-100 p-4 text-xs font-medium text-[#8ba0c5]">
        会话与业务数据独立
      </div>
    </aside>
  );
}
