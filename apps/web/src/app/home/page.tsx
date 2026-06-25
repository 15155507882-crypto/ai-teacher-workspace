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
}

export default function HomePage() {
  const [depts, setDepts] = useState<Dept[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('accessToken');
    if (!t) return;
    Promise.all([
      fetch('/api/admin/departments/options?school_id=1', {
        headers: { Authorization: `Bearer ${t}` },
      }).then((r) => r.json()),
      fetch('/api/home/teachers?school_id=1', { headers: { Authorization: `Bearer ${t}` } }).then(
        (r) => r.json()
      ),
    ])
      .then(([d, tchr]) => {
        if (d.code === 0) setDepts(d.data);
        if (tchr.code === 0) setTeachers(tchr.data.items || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = keyword
    ? teachers.filter((t) => t.name.includes(keyword) || t.employee_no?.includes(keyword))
    : teachers;

  const grouped = depts
    .map((d) => ({ ...d, teachers: filtered.filter((t) => t.department_id === d.id) }))
    .filter((g) => g.teachers.length > 0);

  if (loading)
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">
        加载中...
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav />
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800">教师名录</h1>
            <p className="text-sm text-slate-500 mt-0.5">按教研组浏览全校教师备课资料</p>
          </div>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索教师..."
            className="w-56 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="space-y-6">
          {grouped.map((g) => (
            <div key={g.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700">
                  {g.name}{' '}
                  <span className="font-normal text-slate-400 ml-1">({g.teachers.length}人)</span>
                </h2>
              </div>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {g.teachers.map((t) => (
                  <Link
                    key={t.id}
                    href={`/teacher/${t.id}`}
                    className="flex flex-col items-center p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition text-center"
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm mb-2">
                      {t.name[0]}
                    </div>
                    <p className="text-sm font-medium text-slate-700">{t.name}</p>
                    {t.employee_no && (
                      <p className="text-xs text-slate-400 mt-0.5">{t.employee_no}</p>
                    )}
                    {t.hasContent && (
                      <span className="mt-1 text-[10px] text-green-500 bg-green-50 px-1.5 py-0.5 rounded">
                        有资料
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          {grouped.length === 0 && <div className="text-center py-16 text-slate-400">暂无数据</div>}
        </div>
      </div>
    </div>
  );
}
