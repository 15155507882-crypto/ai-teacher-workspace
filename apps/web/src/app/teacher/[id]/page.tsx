'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TopNav } from '@/components/top-nav';

interface Content {
  id: number;
  title: string;
  content_type: string;
  academic_year: string;
  semester: string;
  created_at: string;
  summary?: string;
  teacher_id: number;
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

export default function TeacherSpacePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [teacher, setTeacher] = useState<any>(null);
  const [contents, setContents] = useState<Content[]>([]);
  const [stats, setStats] = useState<Stats>({
    personal_lesson: 0,
    reflection: 0,
    group_lesson: 0,
    plan_summary: 0,
    total: 0,
  });
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [cardMode, setCardMode] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const tk = () => localStorage.getItem('accessToken') || '';

  useEffect(() => {
    const u = localStorage.getItem('teacher');
    if (u) setCurrentUser(JSON.parse(u));
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [tRes, cRes, sRes] = await Promise.all([
        fetch('/api/home/teachers?school_id=1', {
          headers: { Authorization: 'Bearer ' + tk() },
        }).then((r) => r.json()),
        fetch('/api/teachers/' + id + '/contents?size=500', {
          headers: { Authorization: 'Bearer ' + tk() },
        }).then((r) => r.json()),
        fetch('/api/teachers/' + id + '/content-stats', {
          headers: { Authorization: 'Bearer ' + tk() },
        }).then((r) => r.json()),
      ]);
      if (tRes.code === 0) {
        const f = tRes.data.items?.find((x: any) => x.id === parseInt(id));
        setTeacher(f || null);
      }
      if (cRes.code === 0) setContents(cRes.data.items || []);
      if (sRes.code === 0) setStats(sRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (c: Content) => {
    setDetailLoading(true);
    try {
      const res = await fetch('/api/contents/' + c.id, {
        headers: { Authorization: 'Bearer ' + tk() },
      });
      const json = await res.json();
      setDetail(json.code === 0 ? json.data : c);
    } catch {
      setDetail(c);
    } finally {
      setDetailLoading(false);
    }
  };

  const filtered = contents.filter((c) => {
    if (filter && c.content_type !== filter) return false;
    if (search && !c.title.includes(search)) return false;
    return true;
  });

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
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
              {teacher?.name?.[0]}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">{teacher?.name} 的资料空间</h1>
              <p className="text-sm text-slate-500">编号: {teacher?.employee_no || '—'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: '个人备课', key: 'personal_lesson', icon: '📖' },
              { label: '教学反思', key: 'reflection', icon: '📝' },
              { label: '集体备课', key: 'group_lesson', icon: '👥' },
              { label: '计划总结', key: 'plan_summary', icon: '📋' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setFilter(filter === item.key ? '' : item.key)}
                className={`flex items-center gap-2 rounded-lg border p-3 text-sm transition ${filter === item.key ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <span>{item.icon}</span>
                <span className="font-medium">{(stats as any)[item.key] || 0}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索标题..."
            className="w-56 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm"
          />
          <div className="flex-1" />
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

        {cardMode ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((c) => (
              <div
                key={c.id}
                onClick={() => openDetail(c)}
                className="bg-white rounded-xl border border-slate-200 p-4 cursor-pointer hover:border-blue-300 hover:shadow-sm transition"
              >
                <p className="text-sm text-blue-600 mb-1">
                  {typeIcons[c.content_type]} {typeLabels[c.content_type]}
                </p>
                <h3 className="font-medium text-slate-800 mb-2">{c.title}</h3>
                <p className="text-xs text-slate-400">
                  {c.academic_year} {c.semester} ·{' '}
                  {new Date(c.created_at).toLocaleDateString('zh-CN')}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs">
                <tr>
                  <th className="p-3 text-left">名称</th>
                  <th className="p-3 text-left">类型</th>
                  <th className="p-3 text-left">日期</th>
                  <th className="p-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td
                      className="p-3 font-medium text-slate-800 cursor-pointer hover:text-blue-600"
                      onClick={() => openDetail(c)}
                    >
                      {c.title}
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      {typeIcons[c.content_type]} {typeLabels[c.content_type]}
                    </td>
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
                      暂无资料
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
            <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto animate-fade-in-up">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <h3 className="text-lg font-bold text-slate-800">{detail.title}</h3>
                <button
                  onClick={() => setDetail(null)}
                  className="text-slate-400 hover:text-slate-600 text-xl"
                >
                  &times;
                </button>
              </div>
              <div className="p-6 space-y-4">
                {detailLoading ? (
                  <p className="text-slate-400 text-sm">加载中...</p>
                ) : (
                  <>
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
                        <p className="text-sm text-slate-600 leading-relaxed">{detail.summary}</p>
                      </div>
                    )}
                    {detail.content_type === 'reflection' && (
                      <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-800">
                        📝 该教师对该课程的教学反思
                      </div>
                    )}
                    <div className="pt-4 border-t flex gap-2">
                      <button className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm hover:bg-blue-100">
                        🔍 预览
                      </button>
                      <button className="px-4 py-2 rounded-lg bg-slate-50 text-slate-600 text-sm hover:bg-slate-100">
                        📥 下载
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
