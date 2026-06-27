'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TopNav } from '@/components/top-nav';

interface Dept {
  id: number;
  name: string;
}
interface Teacher {
  id: number;
  name: string;
  employee_no: string | null;
  department_id: number;
  hasContent: boolean;
  lastContentAt: string | null;
  personalLessonCount?: number;
  reflectionCount?: number;
}

export default function HomePage() {
  const [depts, setDepts] = useState<any[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('accessToken');
    if (!t) return;
    (async () => {
      const d = await fetch('/api/home/groups', { headers: { Authorization: `Bearer ${t}` } }).then(
        (r) => r.json()
      );
      const tchr = await fetch('/api/home/teachers?school_id=1', {
        headers: { Authorization: `Bearer ${t}` },
      }).then((r) => r.json());
      // 教师统计 map
      const statsMap = new Map<number, any>();
      if (tchr.code === 0) {
        const list = tchr.data.items || [];
        for (const t of list) {
          try {
            const sRes = await fetch(`/api/teachers/${t.id}/content-stats`, {
              headers: { Authorization: `Bearer ${t}` },
            }).then((r) => r.json());
            if (sRes.code === 0) {
              statsMap.set(Number(t.id), {
                personalLessonCount: sRes.data.personal_lesson,
                reflectionCount: sRes.data.reflection,
              });
            }
          } catch {}
        }
      }
      // 合并统计到组内老师
      if (d.code === 0) {
        setDepts(
          d.data.map((g: any) => ({
            ...g,
            teachers: (g.teachers || []).map((t: any) => ({
              ...t,
              ...statsMap.get(Number(t.id)),
            })),
          }))
        );
      }
      setLoading(false);
    })();
  }, []);

  const filtered = depts
    .map((d) => ({
      ...d,
      teachers: keyword
        ? (d.teachers || []).filter((t: any) => t.name.includes(keyword))
        : d.teachers || [],
    }))
    .filter((g) => g.teachers.length > 0);

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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800">教师名录</h1>
          </div>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索教师..."
            className="w-56 rounded-lg border bg-white px-4 py-2 text-sm"
          />
        </div>
        <div className="space-y-6">
          {filtered.map((g) => (
            <div key={g.id} className="bg-white rounded-xl border overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b">
                <h2 className="text-sm font-semibold text-slate-700">
                  {g.name}{' '}
                  <span className="text-slate-400 font-normal">({g.teachers.length}人)</span>
                </h2>
              </div>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {g.teachers.map((t) => (
                  <Link
                    key={t.id}
                    href={`/teacher/${t.id}`}
                    className="flex flex-col p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition"
                  >
                    <p className="text-base font-semibold text-slate-800 mb-1">{t.name}</p>
                    <div className="flex gap-3 text-sm text-slate-500">
                      <span>📖 备课 {(t as any).personalLessonCount || 0}</span>
                      <span>📝 反思 {(t as any).reflectionCount || 0}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-slate-400">暂无数据</div>
          )}
        </div>
      </div>
    </div>
  );
}
