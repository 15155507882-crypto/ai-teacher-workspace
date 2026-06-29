'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Calculator, Languages, Loader2, PencilLine, Search, Users } from 'lucide-react';
import { TopNav } from '@/components/top-nav';

interface Teacher {
  id: number;
  name: string;
  employee_no: string | null;
  department_id: number;
  gender?: string | null;
  role?: string | null;
  avatar_file_id?: number | null;
  avatar_data?: string | null;
  hasContent: boolean;
  lastContentAt: string | null;
  personalLessonCount?: number;
  reflectionCount?: number;
}

interface HomeGroup {
  id: number;
  name: string;
  teachers: Teacher[];
}

const avatarFaces = {
  male: ['👨🏻‍🏫', '👨🏻‍💼', '👨🏻‍🎓', '👨🏻'],
  female: ['👩🏻‍🏫', '👩🏻‍💼', '👩🏻‍🎓', '👩🏻'],
  admin: ['管'],
};

function getTeacherFace(teacher: Teacher) {
  if (teacher.role?.includes('admin') || teacher.name.includes('管理员'))
    return avatarFaces.admin[0];
  const list = teacher.gender === 'female' ? avatarFaces.female : avatarFaces.male;
  return list[(teacher.name?.charCodeAt(0) || 0) % list.length];
}

function groupIcon(name: string) {
  if (name.includes('数学')) return { icon: Calculator, color: 'text-blue-500', bg: 'bg-blue-50' };
  if (name.includes('英语') || name.includes('外语')) {
    return { icon: Languages, color: 'text-blue-500', bg: 'bg-blue-50' };
  }
  return { icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-50' };
}

function TeacherAvatar({ teacher }: { teacher: Teacher }) {
  if (teacher.avatar_data || teacher.avatar_file_id) {
    return (
      <img
        src={teacher.avatar_data || `/api/files/${teacher.avatar_file_id}/preview`}
        alt={teacher.name}
        className="h-12 w-12 rounded-full border border-slate-200 object-cover shadow-sm"
      />
    );
  }

  const isAdmin = teacher.role?.includes('admin') || teacher.name.includes('管理员');

  return (
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-sm ${
        isAdmin
          ? 'bg-gradient-to-br from-blue-500 to-indigo-500 text-base font-bold text-white'
          : 'bg-slate-100 text-3xl'
      }`}
      title={teacher.name}
    >
      {getTeacherFace(teacher)}
    </div>
  );
}

function TeacherCard({ teacher }: { teacher: Teacher }) {
  return (
    <Link
      href={`/teacher/${teacher.id}`}
      className="group flex min-h-[108px] items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-[0_4px_14px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_10px_24px_rgba(37,99,235,0.12)]"
    >
      <TeacherAvatar teacher={teacher} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-bold text-[#10234f]">{teacher.name}</p>
        <div className="mt-4 flex items-center gap-3 text-sm text-[#4c6390]">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <BookOpen className="h-4 w-4 text-blue-500" />
            备课 {teacher.personalLessonCount || 0}
          </span>
          <span className="h-4 w-px bg-slate-200" />
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <PencilLine className="h-4 w-4 text-amber-500" />
            反思 {teacher.reflectionCount || 0}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const [depts, setDepts] = useState<HomeGroup[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    (async () => {
      const d = await fetch('/api/home/groups', {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json());
      const tchr = await fetch('/api/home/teachers?school_id=1', {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json());

      // 教师统计 map
      const statsMap = new Map<number, any>();
      const teacherMap = new Map<number, any>();
      if (tchr.code === 0) {
        const list = tchr.data.items || [];
        list.forEach((teacher: any) => teacherMap.set(Number(teacher.id), teacher));
        await Promise.all(
          list.map(async (teacher: any) => {
            try {
              const sRes = await fetch(`/api/teachers/${teacher.id}/content-stats`, {
                headers: { Authorization: `Bearer ${token}` },
              }).then((r) => r.json());
              if (sRes.code === 0) {
                statsMap.set(Number(teacher.id), {
                  personalLessonCount: sRes.data.personal_lesson,
                  reflectionCount: sRes.data.reflection,
                });
              }
            } catch {}
          })
        );
      }

      // 合并统计和基础资料到组内老师
      if (d.code === 0) {
        setDepts(
          d.data.map((g: any) => ({
            ...g,
            teachers: (g.teachers || []).map((teacher: any) => {
              const profile = teacherMap.get(Number(teacher.id)) || {};
              return {
                ...profile,
                ...teacher,
                ...statsMap.get(Number(teacher.id)),
              };
            }),
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
        ? d.teachers.filter((teacher) => teacher.name.includes(keyword.trim()))
        : d.teachers,
    }))
    .filter((g) => g.teachers.length > 0);

  if (loading)
    return (
      <div className="min-h-screen bg-[#f7faff]">
        <TopNav />
        <div className="flex h-72 items-center justify-center text-slate-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-500" />
          加载中...
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f6f9ff_0%,#fbfdff_52%,#f6f9ff_100%)] text-[#10234f]">
      <TopNav />
      <main className="mx-auto max-w-[1656px] px-6 py-11 lg:px-8">
        <section className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-700 text-white shadow-[0_10px_28px_rgba(37,99,235,0.3)]">
              <Users className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-normal text-[#0f2354]">教师名录</h1>
              <p className="mt-2 text-base font-medium text-[#7587ad]">
                快速查找教师，了解备课与教学动态
              </p>
            </div>
          </div>

          <label className="relative block w-full lg:w-[460px]">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6f86bd]" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索教师姓名..."
              className="h-16 w-full rounded-2xl border border-slate-200 bg-white pl-14 pr-5 text-base font-medium text-[#10234f] shadow-[0_6px_24px_rgba(15,23,42,0.06)] outline-none transition placeholder:text-[#8ca0c7] focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
          </label>
        </section>

        <div className="space-y-5">
          {filtered.map((g) => {
            const meta = groupIcon(g.name);
            const GroupIcon = meta.icon;
            return (
              <section
                key={g.id}
                className="rounded-2xl border border-slate-200 bg-white/95 px-6 py-6 shadow-[0_8px_30px_rgba(31,45,78,0.07)]"
              >
                <div className="mb-6 flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${meta.bg} ${meta.color}`}
                  >
                    <GroupIcon className="h-5 w-5" />
                  </span>
                  <h2 className="text-xl font-extrabold text-[#10234f]">
                    {g.name}
                    <span className="ml-2 text-base font-semibold text-[#6d7fa7]">
                      ({g.teachers.length}人)
                    </span>
                  </h2>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  {g.teachers.map((teacher) => (
                    <TeacherCard key={teacher.id} teacher={teacher} />
                  ))}
                </div>
              </section>
            );
          })}

          {filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-base font-medium text-slate-400">
              暂无匹配教师
            </div>
          )}
        </div>
      </main>

      <footer className="pb-5 text-center text-base font-medium text-[#7d8dad]">
        宣城五小 智能备课助手 © 2024 All Rights Reserved
      </footer>
    </div>
  );
}
