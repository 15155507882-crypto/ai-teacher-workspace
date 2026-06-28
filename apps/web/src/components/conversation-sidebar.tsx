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
      .then((j) => { if (j.data) setConvs(j.data); })
      .catch(() => {});
  };

  useEffect(() => { load(); }, []);

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
    <aside className="w-64 shrink-0 bg-slate-900 text-slate-300 flex flex-col h-full">
      <div className="p-3 border-b border-slate-700">
        <button
          onClick={newConv}
          className="w-full rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800 transition"
        >
          ＋ 新会话
        </button>
      </div>
      <div className="px-3 py-2">
        <input
          value={keyword}
          onChange={(e) => { setKeyword(e.target.value); load(e.target.value); }}
          placeholder="搜索..."
          className="w-full rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-300 placeholder-slate-500 outline-none"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {[...groups.entries()].map(([label, items]) => (
          <div key={label}>
            <p className="text-xs text-slate-500 px-2 py-1">{label}</p>
            {items.map((c) => (
              <div
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={`group flex items-center justify-between rounded-lg px-3 py-2 text-sm cursor-pointer ${
                  activeId === c.id
                    ? 'bg-slate-700 text-white'
                    : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span className="truncate flex-1">{c.title}</span>
                <button
                  onClick={(e) => delConv(e, c.id)}
                  className="opacity-0 group-hover:opacity-100 text-xs text-slate-500 hover:text-red-400 ml-1"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-slate-700 text-xs text-slate-500">
        会话与业务数据独立
      </div>
    </aside>
  );
}
