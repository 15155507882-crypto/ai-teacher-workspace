'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) router.push('/login');
    else fetchData();
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

  const filteredTeachers = keyword
    ? teachers.filter(
        (t) => t.name.includes(keyword) || (t.employee_no && t.employee_no.includes(keyword))
      )
    : teachers;

  const teachersByDept = departments.map((dept) => ({
    ...dept,
    teachers: filteredTeachers.filter((t) => t.department_id === dept.id),
  }));

  const formatTime = (d: string | null) => {
    if (!d) return '';
    const dt = new Date(d);
    const now = new Date();
    const diff = now.getTime() - dt.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return dt.toLocaleDateString('zh-CN');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">加载中...</div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-2 text-2xl font-bold">AI 教师工作空间</h1>
      <p className="mb-6 text-sm text-gray-500">学校备课资料共享平台</p>

      <div className="mb-6">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索教师姓名或编号..."
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="space-y-6">
        {teachersByDept.map(
          (dept) =>
            dept.teachers.length > 0 && (
              <div key={dept.id} className="rounded-lg bg-white p-4 shadow">
                <h2 className="mb-3 text-lg font-semibold text-gray-700">
                  {dept.name}
                  <span className="ml-2 text-sm font-normal text-gray-400">
                    ({dept.teachers.length}人)
                  </span>
                </h2>
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
                  {dept.teachers.map((teacher) => (
                    <Link
                      key={teacher.id}
                      href={`/teacher/${teacher.id}`}
                      className="flex flex-col rounded-lg border p-3 transition hover:bg-blue-50 hover:border-blue-200"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-gray-800">{teacher.name}</span>
                        {teacher.hasContent && <span className="text-xs text-green-500">●</span>}
                      </div>
                      <span className="text-xs text-gray-400 mt-0.5">
                        {teacher.employee_no || '—'}
                      </span>
                      {teacher.lastContentAt && (
                        <span className="text-xs text-gray-300 mt-1">
                          {formatTime(teacher.lastContentAt)}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )
        )}
        {filteredTeachers.length === 0 && (
          <div className="py-12 text-center text-gray-400">暂无教师</div>
        )}
      </div>
    </div>
  );
}
