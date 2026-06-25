'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface TeacherInfo {
  id: number;
  name: string;
  employee_no: string | null;
  department_id: number;
  role: string;
  hasContent: boolean;
  lastContentAt: string | null;
}

interface Content {
  id: number;
  content_type: string;
  title: string;
  summary: string | null;
  academic_year: string;
  semester: string;
  status: string;
  created_at: string;
}

interface ContentStats {
  personal_lesson: number;
  reflection: number;
  group_lesson: number;
  plan_summary: number;
  total: number;
}

const CONTENT_TYPE_LABELS: Record<string, string> = {
  personal_lesson: '📖 个人备课',
  reflection: '📝 教学反思',
  group_lesson: '👥 集体备课',
  plan_summary: '📋 计划与总结',
};

export default function TeacherSpacePage() {
  const params = useParams();
  const router = useRouter();
  const teacherId = params.id as string;

  const [teacher, setTeacher] = useState<TeacherInfo | null>(null);
  const [contents, setContents] = useState<Content[]>([]);
  const [stats, setStats] = useState<ContentStats>({
    personal_lesson: 0,
    reflection: 0,
    group_lesson: 0,
    plan_summary: 0,
    total: 0,
  });
  const [filter, setFilter] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const getToken = () => localStorage.getItem('accessToken');

  useEffect(() => {
    const teacherStr = localStorage.getItem('teacher');
    if (teacherStr) setCurrentUser(JSON.parse(teacherStr));
    if (!getToken()) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [teacherId]);

  const fetchData = async () => {
    try {
      const [teacherRes, contentRes, statsRes] = await Promise.all([
        fetch('/api/home/teachers?school_id=1', {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        fetch('/api/teachers/' + teacherId + '/contents', {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        fetch('/api/teachers/' + teacherId + '/content-stats', {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
      ]);
      const tJson = await teacherRes.json();
      const cJson = await contentRes.json();
      const sJson = await statsRes.json();
      if (tJson.code === 0) {
        const found = tJson.data.items?.find((t: any) => t.id === parseInt(teacherId));
        setTeacher(found || null);
      }
      if (cJson.code === 0) setContents(cJson.data.items || []);
      if (sJson.code === 0) setStats(sJson.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (contentId: number) => {
    if (!confirm('确认删除该资料？')) return;
    const res = await fetch('/api/contents/' + contentId, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ reason: '教师删除' }),
    });
    const json = await res.json();
    if (json.code === 0) {
      setContents(contents.filter((c) => c.id !== contentId));
      const sRes = await fetch('/api/teachers/' + teacherId + '/content-stats', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const sJson = await sRes.json();
      if (sJson.code === 0) setStats(sJson.data);
    } else {
      alert(json.message || '删除失败');
    }
  };

  const filteredContents = filter ? contents.filter((c) => c.content_type === filter) : contents;
  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">加载中...</div>
    );
  if (!teacher) return <div className="p-8 text-center text-gray-400">教师不存在</div>;

  const isOwnSpace = currentUser?.id === teacher.id;
  const isAdmin = currentUser?.role === 'admin';

  const typeTabs = [
    { key: '', label: '全部', count: stats.total },
    { key: 'personal_lesson', label: '个人备课', count: stats.personal_lesson },
    { key: 'reflection', label: '教学反思', count: stats.reflection },
    { key: 'group_lesson', label: '集体备课', count: stats.group_lesson },
    { key: 'plan_summary', label: '计划总结', count: stats.plan_summary },
  ];

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{teacher.name} 的空间</h1>
          <p className="text-sm text-gray-500">{teacher.employee_no || ''}</p>
        </div>
        <button
          onClick={() => router.push('/home')}
          className="text-sm text-blue-600 hover:underline"
        >
          ← 返回首页
        </button>
      </div>
      <div className="mb-4 flex gap-2 flex-wrap">
        {typeTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={
              'rounded-full px-4 py-1.5 text-xs ' +
              (filter === tab.key ? 'bg-blue-600 text-white' : 'bg-gray-100')
            }
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {filteredContents.map((c) => (
          <div key={c.id} className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <span className="text-xs text-blue-500">{CONTENT_TYPE_LABELS[c.content_type]}</span>
                <h3 className="mt-1 font-medium">{c.title}</h3>
                {c.summary && (
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">{c.summary}</p>
                )}
                <div className="mt-2 text-xs text-gray-400">
                  {c.academic_year} {c.semester} ·{' '}
                  {new Date(c.created_at).toLocaleDateString('zh-CN')}
                </div>
              </div>
              {(isOwnSpace || isAdmin) && (
                <button
                  onClick={() => handleDelete(c.id)}
                  className="ml-3 text-xs text-red-400 hover:text-red-600"
                >
                  删除
                </button>
              )}
            </div>
          </div>
        ))}
        {filteredContents.length === 0 && (
          <div className="py-12 text-center text-gray-400">暂无备课资料</div>
        )}
      </div>
    </div>
  );
}
