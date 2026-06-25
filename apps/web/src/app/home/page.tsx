'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Department {
  id: number;
  name: string;
}

interface Teacher {
  id: number;
  name: string;
  employee_no: string | null;
  department_id: number;
  role: string;
  hasContent: boolean;
  lastContentAt: string | null;
}

export default function HomePage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const getToken = () => localStorage.getItem('accessToken');

  const fetchData = async () => {
    try {
      const [deptRes, teacherRes] = await Promise.all([
        fetch('/api/admin/departments/options?school_id=1', {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        fetch('/api/home/teachers?school_id=1', {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
      ]);
      const deptJson = await deptRes.json();
      const teacherJson = await teacherRes.json();
      if (deptJson.code === 0) setDepartments(deptJson.data);
      if (teacherJson.code === 0) setTeachers(teacherJson.data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = keyword
    ? teachers.filter(
        (t) => t.name.includes(keyword) || (t.employee_no && t.employee_no.includes(keyword))
      )
    : teachers;

  const teachersByDept = departments.map((dept) => ({
    ...dept,
    teachers: filtered.filter((t) => t.department_id === dept.id),
  }));

  const formatTime = (d: string | null) => {
    if (!d) return '';
    const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return new Date(d).toLocaleDateString('zh-CN');
  };

  if (loading) return <div className="p-8 text-center text-gray-400">加载中...</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-800 mb-1">教师目录</h1>
      <p className="text-sm text-gray-500 mb-4">按教研组浏览全校教师备课资料</p>

      <input
        type="text"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="搜索教师姓名或编号..."
        className="w-full max-w-md mb-6 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
      />

      <div className="space-y-6">
        {teachersByDept.map((dept) =>
          dept.teachers.length > 0 ? (
            <div key={dept.id} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-base font-semibold text-gray-700">
                {dept.name}
                <span className="ml-2 text-sm font-normal text-gray-400">
                  ({dept.teachers.length}人)
                </span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {dept.teachers.map((t) => (
                  <Link
                    key={t.id}
                    href={`/teacher/${t.id}`}
                    className="flex flex-col rounded-lg border border-gray-100 p-3 transition hover:border-indigo-200 hover:bg-indigo-50/50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-gray-800">{t.name}</span>
                      {t.hasContent && <span className="text-green-500 text-xs">●</span>}
                    </div>
                    <span className="text-xs text-gray-400 mt-0.5">{t.employee_no || '—'}</span>
                    {t.lastContentAt && (
                      <span className="text-xs text-gray-300 mt-1">
                        {formatTime(t.lastContentAt)}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ) : null
        )}
        {filtered.length === 0 && <div className="py-16 text-center text-gray-400">暂无教师</div>}
      </div>
    </div>
  );
}
