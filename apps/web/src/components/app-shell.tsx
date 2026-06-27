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
  const [school, setSchool] = useState<any>(null);
  const [recentContents, setRecentContents] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = localStorage.getItem('teacher');
    if (!t) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(t);
    setTeacher(parsed);
    fetch('/api/public/school')
      .then((r) => r.json())
      .then((j) => {
        if (j.data) setSchool(j.data);
      });
    fetch(`/api/teachers/${parsed.id}/contents?size=5`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.data) setRecentContents(j.data.items || []);
      });
  }, []);

  if (!teacher) return null;

  const logout = () => {
    localStorage.clear();
    router.push('/login');
  };

  const typeIcon: Record<string, string> = {
    personal_lesson: '📖',
    reflection: '📝',
    group_lesson: '👥',
    plan_summary: '📋',
  };

  return (
    <div className="flex h-screen bg-[var(--color-bg-app)]">
      {/* Left Sidebar */}
      <aside className="w-[var(--layout-sidebar)] flex flex-col shrink-0 bg-[var(--color-bg-surface)] border-r border-[var(--color-border)]">
        <div className="p-5 border-b border-[var(--color-border)]">
          <h1 className="text-card-title text-[var(--color-text-strong)]">
            {school?.short_name || 'AI 教师工作空间'}
          </h1>
          <p className="text-tiny text-[var(--color-text-muted)] mt-0.5">智能备课助手</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavBtn active icon="💬" label="AI 工作台" onClick={() => router.push('/workspace')} />
          <NavBtn
            icon="📁"
            label="我的资料"
            onClick={() => router.push(`/teacher/${teacher.id}`)}
          />

          <div className="pt-5 pb-2 px-1 text-tiny text-[var(--color-text-muted)] uppercase tracking-wider font-medium">
            最近资料
          </div>
          {recentContents.length === 0 && (
            <p className="text-tiny text-[var(--color-text-muted)] px-2 py-3">暂无资料</p>
          )}
          {recentContents.slice(0, 5).map((c: any) => (
            <button
              key={c.id}
              onClick={() => router.push(`/teacher/${teacher.id}`)}
              className="w-full text-left rounded-lg px-3 py-2 text-tiny text-[var(--color-text-normal)] hover:bg-[var(--color-bg-muted)] transition truncate flex items-center gap-2"
            >
              <span>{typeIcon[c.content_type] || '📄'}</span>
              <span className="truncate">{c.title}</span>
            </button>
          ))}

          {teacher.role === 'admin' && (
            <>
              <div className="pt-5 pb-2 px-1 text-tiny text-[var(--color-text-muted)] uppercase tracking-wider font-medium">
                管理
              </div>
              <NavBtn
                icon="🏫"
                label="学校信息"
                onClick={() => router.push('/admin/settings/school')}
              />
              <NavBtn icon="👥" label="教师管理" onClick={() => router.push('/admin/teachers')} />
              <NavBtn icon="📋" label="教研组" onClick={() => router.push('/admin/departments')} />
              <NavBtn
                icon="📊"
                label="AI日志"
                onClick={() => router.push('/admin/settings/ai-logs')}
              />
            </>
          )}
        </nav>

        <div className="p-4 border-t border-[var(--color-border)] flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--color-text-strong)]">{teacher.name}</p>
            <p className="text-tiny text-[var(--color-text-muted)]">
              {teacher.role === 'admin' ? '管理员' : '教师'}
            </p>
          </div>
          <AppButton variant="ghost" size="sm" onClick={logout}>
            退出
          </AppButton>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">{children}</main>

      {detailPanel && (
        <aside className="w-[var(--layout-detail)] shrink-0 border-l border-[var(--color-border)] bg-[var(--color-bg-surface)] overflow-y-auto animate-slide-in">
          {detailPanel}
        </aside>
      )}
    </div>
  );
}

function NavBtn({
  label,
  active,
  icon,
  onClick,
}: {
  label: string;
  active?: boolean;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg px-3 py-2 text-sm transition flex items-center gap-2.5 ${
        active
          ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-600)] font-medium'
          : 'text-[var(--color-text-normal)] hover:bg-[var(--color-bg-muted)]'
      }`}
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
