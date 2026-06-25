'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [teacher, setTeacher] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const t = localStorage.getItem('teacher');
      if (t) setTeacher(JSON.parse(t));
    }
  }, [pathname]);

  if (!mounted)
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-400">加载中...</div>
    );

  const isLoginPage = pathname === '/login';
  const getToken = () =>
    typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('teacher');
    router.push('/login');
  };

  const isAdmin = teacher?.role === 'admin';

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!getToken()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="mb-4 text-gray-500">请先登录</p>
          <Link href="/login" className="text-indigo-600 underline">
            前往登录
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 bg-indigo-950 text-indigo-100 flex flex-col shrink-0">
        <div className="p-5 border-b border-indigo-800">
          <Link href="/home" className="text-lg font-bold tracking-tight">
            AI 教师工作空间
          </Link>
          <p className="text-xs text-indigo-400 mt-0.5">Teaching Assistant</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NavItem href="/home" icon="🏠" label="首页" active={pathname === '/home'} />
          <NavItem
            href="/workspace"
            icon="💬"
            label="AI 工作台"
            active={pathname === '/workspace'}
          />
          {teacher && (
            <NavItem
              href={`/teacher/${teacher.id}`}
              icon="📁"
              label="我的空间"
              active={pathname.startsWith('/teacher/')}
            />
          )}
          {isAdmin && (
            <>
              <div className="pt-3 pb-1 text-xs text-indigo-500 uppercase tracking-wider px-2">
                管理
              </div>
              <NavItem
                href="/admin/school"
                icon="🏫"
                label="学校信息"
                active={pathname === '/admin/school'}
              />
              <NavItem
                href="/admin/departments"
                icon="📋"
                label="教研组"
                active={pathname === '/admin/departments'}
              />
              <NavItem
                href="/admin/ai-logs"
                icon="📊"
                label="AI 日志"
                active={pathname === '/admin/ai-logs'}
              />
            </>
          )}
        </nav>
        <div className="p-4 border-t border-indigo-800 text-sm">
          <div className="flex items-center justify-between">
            <span className="truncate">{teacher?.name || '未登录'}</span>
            <button onClick={handleLogout} className="text-xs text-indigo-400 hover:text-white">
              退出
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-gray-50">{children}</main>
    </div>
  );
}

function NavItem({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
        active
          ? 'bg-indigo-800 text-white font-medium'
          : 'text-indigo-300 hover:bg-indigo-800/50 hover:text-white'
      }`}
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
