'use client';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppButton } from './ui/base';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [teacher, setTeacher] = useState<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = localStorage.getItem('teacher');
    if (!t || JSON.parse(t).role !== 'admin') {
      router.push('/workspace');
      return;
    }
    setTeacher(JSON.parse(t));
  }, []);

  if (!teacher) return null;

  return (
    <div className="flex h-screen bg-[var(--color-bg-app)]">
      <aside className="w-60 shrink-0 bg-[var(--color-bg-surface)] border-r border-[var(--color-border)] flex flex-col">
        <div className="p-5 border-b border-[var(--color-border)]">
          <h1 className="text-sm font-bold text-[var(--color-text-strong)]">后台管理</h1>
          <p className="text-tiny text-[var(--color-text-muted)] mt-0.5">{teacher.name}</p>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          <AdminNavBtn
            href="/admin/school"
            label="🏫 学校信息"
            active={pathname === '/admin/school'}
          />
          <AdminNavBtn
            href="/admin/teachers"
            label="👥 教师管理"
            active={pathname === '/admin/teachers'}
          />
          <AdminNavBtn
            href="/admin/departments"
            label="📋 教研组"
            active={pathname === '/admin/departments'}
          />
          <AdminNavBtn
            href="/admin/ai-logs"
            label="📊 AI日志"
            active={pathname === '/admin/ai-logs'}
          />
        </nav>
        <div className="p-4 border-t border-[var(--color-border)]">
          <AppButton
            variant="ghost"
            size="sm"
            onClick={() => router.push('/workspace')}
            className="w-full justify-start"
          >
            ← 返回工作台
          </AppButton>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

function AdminNavBtn({ href, label, active }: { href: string; label: string; active: boolean }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(href)}
      className={`w-full text-left rounded-lg px-3 py-2 text-sm transition ${
        active
          ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-600)] font-medium'
          : 'text-[var(--color-text-normal)] hover:bg-[var(--color-bg-muted)]'
      }`}
    >
      {label}
    </button>
  );
}
