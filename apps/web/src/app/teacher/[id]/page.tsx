'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { TopNav } from '@/components/top-nav';
import {
  BookOpen,
  ClipboardList,
  Eye,
  LayoutGrid,
  Lightbulb,
  List,
  Search,
  Users,
} from 'lucide-react';

const avatarFaces = {
  male: ['👨🏻‍🏫', '👨🏻‍💼', '👨🏻‍🎓', '👨🏻'],
  female: ['👩🏻‍🏫', '👩🏻‍💼', '👩🏻‍🎓', '👩🏻'],
};

function getTeacherFace(teacher: any) {
  const list = teacher?.gender === 'female' ? avatarFaces.female : avatarFaces.male;
  return list[(teacher?.name?.charCodeAt(0) || 0) % list.length];
}

function TeacherAvatar({ teacher, size = 56 }: { teacher: any; size?: number }) {
  if (teacher?.avatar_file_id) {
    return (
      <img
        src={`/api/files/${teacher.avatar_file_id}/preview`}
        alt={teacher?.name}
        className="rounded-full object-cover border-2 border-slate-200 shadow-sm"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-slate-100 text-3xl shadow-sm"
      style={{ width: size, height: size, fontSize: size * 0.55 }}
      title={teacher?.name}
    >
      {getTeacherFace(teacher)}
    </div>
  );
}

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
  const tk = () => localStorage.getItem('accessToken') || '';

  useEffect(() => {
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
        const f = tRes.data.items?.find((x: any) => Number(x.id) === parseInt(id));
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
      <div className="min-h-screen bg-[linear-gradient(180deg,#f6f9ff_0%,#fbfdff_52%,#f6f9ff_100%)]">
        <TopNav />
        <div className="flex h-72 items-center justify-center text-[#8ba0c5]">加载中...</div>
      </div>
    );

  const statCards = [
    {
      key: 'personal_lesson',
      label: '个人备课',
      icon: BookOpen,
      accent: 'from-blue-400 to-blue-700',
    },
    { key: 'group_lesson', label: '集体备课', icon: Users, accent: 'from-emerald-400 to-blue-600' },
    {
      key: 'plan_summary',
      label: '计划总结',
      icon: ClipboardList,
      accent: 'from-violet-400 to-blue-600',
    },
    { key: 'reflection', label: '教学反思', icon: Lightbulb, accent: 'from-amber-400 to-blue-600' },
  ];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f6f9ff_0%,#fbfdff_52%,#f6f9ff_100%)] text-[#10234f]">
      <TopNav />
      <main className="mx-auto max-w-[1656px] px-6 py-9 lg:px-8">
        <section className="mb-7 rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(31,45,78,0.07)]">
          <div className="flex items-center gap-5 p-6">
            <div className="shrink-0">
              <TeacherAvatar teacher={teacher} size={64} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-extrabold text-[#0f2354] tracking-normal truncate">
                {teacher?.name || '未知老师'}的资料空间
              </h1>
              {teacher?.employee_no && (
                <p className="mt-0.5 text-sm font-medium text-[#7587ad]">
                  编号：{teacher.employee_no}
                </p>
              )}
              <p className="mt-0.5 text-sm text-[#8ba0c5]">
                {teacher?.mobile || ''} · 共 {stats.total} 份资料
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border-t border-slate-100">
            {statCards.map((sc) => {
              const Icon = sc.icon;
              const active = filter === sc.key;
              return (
                <button
                  key={sc.key}
                  onClick={() => setFilter(active ? '' : sc.key)}
                  className={`flex items-center gap-3 px-6 py-4 transition ${
                    active ? 'bg-[#f0f4ff]' : 'hover:bg-[#f7faff]'
                  } ${sc.key !== 'personal_lesson' ? 'border-l border-slate-100' : ''}`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${sc.accent} text-white shadow-[0_4px_12px_rgba(37,99,235,.15)]`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-extrabold text-[#10234f]">
                      {(stats as any)[sc.key] || 0}
                    </p>
                    <p className="text-xs font-semibold text-[#7587ad]">{sc.label}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative min-w-[260px] flex-1 lg:max-w-[420px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6f86bd]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索标题..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm shadow-sm outline-none transition placeholder:text-[#8ca0c7] focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
          </div>
          <span className="text-sm font-medium text-[#8ba0c5]">{filtered.length} 条</span>
          <div className="flex-1" />
          <div className="flex rounded-xl border border-slate-200 bg-white p-0.5">
            <button
              onClick={() => setCardMode(false)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${!cardMode ? 'bg-blue-50 text-blue-600' : 'text-[#7587ad] hover:text-[#53688f]'}`}
            >
              <List className="h-4 w-4" />
              列表
            </button>
            <button
              onClick={() => setCardMode(true)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${cardMode ? 'bg-blue-50 text-blue-600' : 'text-[#7587ad] hover:text-[#53688f]'}`}
            >
              <LayoutGrid className="h-4 w-4" />
              卡片
            </button>
          </div>
        </div>

        {filtered.length === 0 && !loading ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-base font-medium text-slate-400">
            {contents.length === 0 ? '暂无资料' : '无匹配结果'}
          </div>
        ) : cardMode ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => openDetail(c)}
                className="text-left rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_14px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_10px_24px_rgba(37,99,235,0.12)]"
              >
                <p className="text-xs font-semibold text-blue-600 mb-2">
                  {typeLabels[c.content_type] || c.content_type}
                </p>
                <h3 className="font-bold text-[#10234f] mb-3 line-clamp-2">{c.title}</h3>
                <p className="text-xs text-[#8ba0c5]">
                  {c.academic_year} {c.semester} ·{' '}
                  {new Date(c.created_at).toLocaleDateString('zh-CN')}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(31,45,78,0.07)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-base">
                <thead className="bg-[#f7faff] text-sm font-semibold text-[#6e7fa7]">
                  <tr>
                    <th className="px-5 py-4 text-left">名称</th>
                    <th className="px-5 py-4 text-left">类型</th>
                    <th className="px-5 py-4 text-left">日期</th>
                    <th className="px-5 py-4 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((c) => (
                    <tr key={c.id} className="transition hover:bg-[#f7faff]">
                      <td className="max-w-[480px] px-5 py-4">
                        <button
                          onClick={() => openDetail(c)}
                          className="text-left font-semibold text-[#10234f] hover:text-blue-600 transition cursor-pointer"
                        >
                          {c.title}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-lg bg-[#f7faff] px-2.5 py-1 text-xs font-semibold text-[#53688f]">
                          {typeLabels[c.content_type] || c.content_type}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-[#8ba0c5]">
                        {new Date(c.created_at).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => openDetail(c)}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-[#53688f] hover:bg-[#f7faff] hover:text-[#30466f] transition"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          查看
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {detail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm"
              onClick={() => setDetail(null)}
            />
            <div className="relative bg-white rounded-2xl shadow-[0_24px_80px_rgba(15,23,42,0.22)] max-w-2xl w-full max-h-[80vh] overflow-y-auto animate-fade-in-up">
              <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-5 flex items-center justify-between rounded-t-2xl z-10">
                <h3 className="text-lg font-bold text-[#10234f] truncate">{detail.title}</h3>
                <button
                  onClick={() => setDetail(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                >
                  &times;
                </button>
              </div>
              <div className="p-6 space-y-4">
                {detailLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-6 bg-[#f7faff] rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="inline-flex rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        {typeLabels[detail.content_type]}
                      </span>
                      <span className="text-[#53688f]">
                        {detail.academic_year} {detail.semester}
                      </span>
                      <span className="text-[#8ba0c5]">
                        {new Date(detail.created_at).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    {detail.summary && (
                      <div>
                        <h4 className="text-sm font-semibold text-[#30466f] mb-2">摘要</h4>
                        <p className="text-sm text-[#53688f] leading-relaxed">{detail.summary}</p>
                      </div>
                    )}
                    {detail.content_type === 'reflection' && (
                      <div className="rounded-xl bg-amber-50 p-4 text-sm font-medium text-amber-700">
                        📝 该教师对该课程的教学反思
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
