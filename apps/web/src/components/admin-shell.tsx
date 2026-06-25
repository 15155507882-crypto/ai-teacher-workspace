'use client';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const menuItems = [
  { href: '/admin/school', label: '🏫 学校信息', key: 'school' },
  { href: '/admin/departments', label: '📋 组织管理', key: 'departments' },
  { href: '/admin/teachers', label: '👥 教师管理', key: 'teachers' },
  { href: '/admin/roles', label: '🔑 角色管理', key: 'roles' },
  { href: '/admin/ai-logs', label: '📊 AI 日志', key: 'ai-logs' },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [teacher, setTeacher] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);

  useEffect(() => {
    const t = localStorage.getItem('teacher');
    if (!t || JSON.parse(t).role !== 'admin') {
      router.push('/workspace');
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

  const logout = () => {
    localStorage.clear();
    router.push('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-slate-900 text-slate-300 flex flex-col">
        <div className="p-5 border-b border-slate-700">
          <h1 className="text-sm font-bold text-white">{school?.short_name || '后台管理'}</h1>
          <p className="text-xs text-slate-500 mt-0.5">管理控制台</p>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {menuItems.map((item) => (
            <button
              key={item.key}
              onClick={() => router.push(item.href)}
              className={`w-full text-left rounded-lg px-3 py-2 text-sm transition ${
                pathname === item.href
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700 flex items-center justify-between">
          <span className="text-xs text-slate-400 truncate">{teacher.name}</span>
          <div className="flex gap-1">
            <button
              onClick={() => router.push('/workspace')}
              className="text-xs text-slate-500 hover:text-white"
              title="返回工作台"
            >
              ←
            </button>
            <button
              onClick={logout}
              className="text-xs text-slate-500 hover:text-red-400"
              title="退出"
            >
              ⏻
            </button>
          </div>
        </div>
      </aside>
      {/* Main */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
