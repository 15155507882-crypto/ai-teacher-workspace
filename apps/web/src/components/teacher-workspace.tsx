'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { ContentSidebar } from './content-sidebar';
import { AiChatCenter } from './ai-chat-center';
import { ContentDetailPanel } from './content-detail-panel';

export interface WorkspaceContext {
  teacherId: number;
  schoolId: number;
  token: string;
}

export function TeacherWorkspace() {
  const router = useRouter();
  const [ctx, setCtx] = useState<WorkspaceContext | null>(null);
  const [selectedContentId, setSelectedContentId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const t = localStorage.getItem('teacher');
    const token = localStorage.getItem('accessToken');
    if (!t || !token) {
      router.push('/login');
      return;
    }
    const teacher = JSON.parse(t);
    setCtx({ teacherId: teacher.id, schoolId: teacher.schoolId || 1, token });
  }, [router]);

  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Show skeleton while loading
  if (!mounted || !ctx) {
    return (
      <div className="flex h-screen bg-slate-50">
        <div className="w-[280px] shrink-0 bg-white border-r border-slate-200 p-4 space-y-3">
          <div className="h-5 w-24 bg-slate-200 rounded animate-pulse" />
          <div className="h-9 w-full bg-slate-200 rounded animate-pulse" />
          <div className="h-6 w-20 bg-slate-200 rounded animate-pulse" />
          <div className="h-6 w-16 bg-slate-200 rounded animate-pulse" />
          <div className="h-6 w-16 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-slate-400 text-sm">加载中...</div>
        </div>
        <div className="w-[360px] shrink-0 bg-white border-l border-slate-200 p-4" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <ContentSidebar
        ctx={ctx}
        selectedId={selectedContentId}
        onSelect={setSelectedContentId}
        refreshKey={refreshKey}
      />
      <AiChatCenter ctx={ctx} onSaved={handleRefresh} />
      <ContentDetailPanel
        ctx={ctx}
        contentId={selectedContentId}
        onDelete={() => {
          setSelectedContentId(null);
          handleRefresh();
        }}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
