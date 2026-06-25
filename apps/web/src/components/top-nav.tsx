'use client';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [teacher, setTeacher] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);

  useEffect(() => {
    const t = localStorage.getItem('teacher');
    if (!t) {
      router.push('/login');
      return;
    }
    setTeacher(JSON.parse(t));
    fetch('/api/public/school')
      .then((r) => r.json())
      .then((j) => {
        if (j.data) setSchool(j.data);
      })
      .catch(() => {});
  }, [router]);

  if (!teacher) return null;

  const navItems = [
    { href: '/home', label: '首页' },
    { href: '/group-lessons', label: '集体备课' },
    { href: '/personal-lessons', label: '个人备课' },
    { href: '/plans', label: '计划与总结' },
    { href: '/reflections', label: '教学反思' },
  ];

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 shrink-0 z-10">
      <Link href="/home" className="flex items-center gap-3 mr-8">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
          {school?.short_name?.[0] || '校'}
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-bold text-slate-800">
            {school?.short_name || 'AI 教师工作空间'}
          </p>
          <p className="text-[10px] text-slate-400">智能备课助手</p>
        </div>
      </Link>
      <nav className="flex gap-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${
              pathname === item.href || pathname.startsWith(item.href + '/')
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        <Link
          href={`/teacher/${teacher.id}`}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800"
        >
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs text-blue-600 font-medium">
            {teacher.name?.[0]}
          </div>
          <span className="hidden sm:inline">{teacher.name}</span>
        </Link>
        {teacher.role === 'admin' && (
          <Link
            href="/admin/teachers"
            className="text-sm text-slate-400 hover:text-slate-600"
            title="后台管理"
          >
            ⚙️
          </Link>
        )}
      </div>
    </header>
  );
}
