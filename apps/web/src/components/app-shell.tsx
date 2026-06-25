'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppButton } from './ui/base';

export function AppShell({
  children,
  detailPanel,
}: {
  children: React.ReactNode;
  detailPanel?: React.ReactNode;
}) {
  const router = useRouter();
  const [teacher, setTeacher] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const t = localStorage.getItem('teacher');
      if (t) setTeacher(JSON.parse(t));
      else router.push('/login');
    }
  }, []);

  const logout = () => {
    localStorage.clear();
    router.push('/login');
  };

  if (!teacher) return null;

  return (
    <div className="flex h-screen bg-[var(--color-bg-app)]">
      <aside className="w-[var(--layout-sidebar)] flex flex-col shrink-0 bg-[var(--color-bg-surface)] border-r border-[var(--color-border)]">
        <div className="p-5 border-b border-[var(--color-border)]">
          <h1 className="text-base font-bold text-[var(--color-text-strong)]">AI 教师工作空间</h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">智能备课助手</p>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          <NavBtn active label="💬 AI 工作台" onClick={() => router.push('/workspace')} />
          <NavBtn label="📁 我的资料" onClick={() => router.push(`/teacher/${teacher.id}`)} />
          {teacher.role === 'admin' && (
            <>
              <div className="pt-4 pb-1 px-2 text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
                管理
              </div>
              <NavBtn label="🏫 学校信息" onClick={() => router.push('/admin/school')} />
              <NavBtn label="👥 教师管理" onClick={() => router.push('/admin/teachers')} />
              <NavBtn label="📋 教研组" onClick={() => router.push('/admin/departments')} />
              <NavBtn label="📊 AI日志" onClick={() => router.push('/admin/ai-logs')} />
            </>
          )}
        </nav>
        <div className="p-4 border-t border-[var(--color-border)] flex items-center justify-between">
          <span className="text-sm text-[var(--color-text-normal)] truncate">{teacher.name}</span>
          <AppButton variant="ghost" size="sm" onClick={logout}>
            退出
          </AppButton>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">{children}</main>

      {detailPanel && (
        <aside className="w-[var(--layout-detail)] shrink-0 border-l border-[var(--color-border)] bg-[var(--color-bg-surface)] overflow-y-auto">
          {detailPanel}
        </aside>
      )}
    </div>
  );
}

function NavBtn({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg px-3 py-2 text-sm transition ${active ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-600)] font-medium' : 'text-[var(--color-text-normal)] hover:bg-[var(--color-bg-muted)]'}`}
    >
      {label}
    </button>
  );
}
