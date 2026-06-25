'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppButton } from './ui/base';

export function AdminShell({ children, title }: { children: React.ReactNode; title: string }) {
  const router = useRouter();
  const [teacher, setTeacher] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const t = localStorage.getItem('teacher');
      if (!t || JSON.parse(t).role !== 'admin') {
        router.push('/workspace');
        return;
      }
      setTeacher(JSON.parse(t));
    }
  }, []);

  if (!teacher) return null;

  return (
    <div className="min-h-screen bg-[var(--color-bg-app)]">
      <header className="h-[var(--layout-topbar)] flex items-center justify-between px-6 bg-[var(--color-bg-surface)] border-b border-[var(--color-border)]">
        <div className="flex items-center gap-4">
          <AppButton variant="ghost" size="sm" onClick={() => router.push('/workspace')}>
            ← 返回工作台
          </AppButton>
          <h1 className="text-base font-bold text-[var(--color-text-strong)]">{title}</h1>
        </div>
        <span className="text-sm text-[var(--color-text-muted)]">{teacher.name}</span>
      </header>
      <main className="max-w-5xl mx-auto p-6">{children}</main>
    </div>
  );
}
