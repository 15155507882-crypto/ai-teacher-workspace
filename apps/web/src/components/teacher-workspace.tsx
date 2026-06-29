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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // ALWAYS render 3-panel grid — never fall back to old UI
  return (
    <main className="h-screen w-screen overflow-hidden bg-slate-50">
      <div className="grid h-full grid-cols-[280px_1fr_360px] gap-4 p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {mounted && ctx ? (
            <ContentSidebar
              ctx={ctx}
              selectedId={selectedContentId}
              onSelect={setSelectedContentId}
              refreshKey={refreshKey}
            />
          ) : (
            <div className="p-4 space-y-3">
              <div className="h-5 w-24 bg-slate-200 rounded animate-pulse" />
              <div className="h-9 w-full bg-slate-200 rounded animate-pulse" />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-6 w-3/4 bg-slate-200 rounded animate-pulse" />
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          {mounted && ctx ? (
            <AiChatCenter ctx={ctx} onSaved={handleRefresh} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
              加载中...
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {mounted && ctx ? (
            <ContentDetailPanel
              ctx={ctx}
              contentId={selectedContentId}
              onDelete={() => {
                setSelectedContentId(null);
                handleRefresh();
              }}
              onRefresh={handleRefresh}
            />
          ) : (
            <div className="p-4 space-y-3">
              <div className="h-5 w-20 bg-slate-200 rounded animate-pulse" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 w-full bg-slate-200 rounded animate-pulse" />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
