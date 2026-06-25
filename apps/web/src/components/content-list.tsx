'use client';
import { useEffect, useState } from 'react';
import { TopNav } from '@/components/top-nav';

interface Content {
  id: number;
  title: string;
  content_type: string;
  teacher_id: number;
  teacher_name?: string;
  created_at: string;
  academic_year: string;
  semester: string;
  summary?: string;
}
const typeLabels: Record<string, string> = {
  personal_lesson: '个人备课',
  reflection: '教学反思',
  group_lesson: '集体备课',
  plan_summary: '计划总结',
};
const typeIcons: Record<string, string> = {
  personal_lesson: '📖',
  reflection: '📝',
  group_lesson: '👥',
  plan_summary: '📋',
};

export function ContentList({ contentType, title }: { contentType: string; title: string }) {
  const [items, setItems] = useState<Content[]>([]);
  const [search, setSearch] = useState('');
  const [cardMode, setCardMode] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const tk = () => localStorage.getItem('accessToken') || '';

  useEffect(() => {
    const u = localStorage.getItem('teacher');
    if (u) setCurrentUser(JSON.parse(u));
    fetch(`/api/home/teachers?school_id=1`, { headers: { Authorization: 'Bearer ' + tk() } })
      .then((r) => r.json())
      .then(async (j) => {
        if (j.code !== 0) {
          setLoading(false);
          return;
        }
        const teachers = j.data.items || [];
        const allContents: Content[] = [];
        for (const t of teachers.slice(0, 50)) {
          try {
            const cRes = await fetch(
              '/api/teachers/' + t.id + '/contents?content_type=' + contentType + '&size=200',
              { headers: { Authorization: 'Bearer ' + tk() } }
            ).then((r) => r.json());
            if (cRes.code === 0 && cRes.data.items) {
              cRes.data.items.forEach((c: any) => {
                c.teacher_name = t.name;
                allContents.push(c);
              });
            }
          } catch {}
        }
        setItems(allContents);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [contentType]);

  const filtered = items.filter((c) => (search ? c.title.includes(search) : true));

  const openDetail = async (c: Content) => {
    try {
      const res = await fetch('/api/contents/' + c.id, {
        headers: { Authorization: 'Bearer ' + tk() },
      });
      const json = await res.json();
      setDetail(json.code === 0 ? json.data : c);
    } catch {
      setDetail(c);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-slate-50">
        <TopNav />
        <div className="flex items-center justify-center h-64 text-slate-400">加载中...</div>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav />
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-slate-800">{title}</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setCardMode(false)}
              className={
                'px-3 py-1.5 text-xs rounded-lg ' +
                (!cardMode ? 'bg-blue-50 text-blue-700' : 'text-slate-500')
              }
            >
              📋 列表
            </button>
            <button
              onClick={() => setCardMode(true)}
              className={
                'px-3 py-1.5 text-xs rounded-lg ' +
                (cardMode ? 'bg-blue-50 text-blue-700' : 'text-slate-500')
              }
            >
              🗂 卡片
            </button>
          </div>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索..."
          className="w-56 rounded-lg border bg-white px-4 py-2 text-sm mb-4"
        />

        {cardMode ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((c) => (
              <div
                key={c.id}
                onClick={() => openDetail(c)}
                className="bg-white rounded-xl border p-4 cursor-pointer hover:border-blue-300 transition"
              >
                <p className="text-sm text-blue-600 mb-1">
                  {typeIcons[c.content_type]} {typeLabels[c.content_type]}
                </p>
                <h3 className="font-medium text-slate-800 mb-2">{c.title}</h3>
                <p className="text-xs text-slate-400">
                  {c.teacher_name} · {new Date(c.created_at).toLocaleDateString('zh-CN')}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="p-3 text-left">名称</th>
                  <th className="p-3 text-left">教师</th>
                  <th className="p-3 text-left">日期</th>
                  <th className="p-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-t hover:bg-slate-50">
                    <td
                      className="p-3 font-medium text-slate-800 cursor-pointer hover:text-blue-600"
                      onClick={() => openDetail(c)}
                    >
                      {c.title}
                    </td>
                    <td className="p-3 text-xs text-slate-500">{c.teacher_name}</td>
                    <td className="p-3 text-xs text-slate-500">
                      {new Date(c.created_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => openDetail(c)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        查看
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">
                      暂无数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {detail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30" onClick={() => setDetail(null)} />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <h3 className="text-lg font-bold">{detail.title}</h3>
                <button
                  onClick={() => setDetail(null)}
                  className="text-slate-400 hover:text-slate-600 text-xl"
                >
                  &times;
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex gap-3 text-sm text-slate-500">
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">
                    {typeLabels[detail.content_type]}
                  </span>
                  <span>
                    {detail.academic_year} {detail.semester}
                  </span>
                  <span>{new Date(detail.created_at).toLocaleString('zh-CN')}</span>
                </div>
                {detail.summary && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-1">摘要</h4>
                    <p className="text-sm text-slate-600">{detail.summary}</p>
                  </div>
                )}
                <div className="pt-4 border-t flex gap-2">
                  <button className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm">
                    🔍 预览
                  </button>
                  <button className="px-4 py-2 rounded-lg bg-slate-50 text-slate-600 text-sm">
                    📥 下载
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
