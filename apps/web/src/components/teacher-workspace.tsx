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

  useEffect(() => {
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

  if (!ctx) return null;

  return (
    <div className="flex h-screen bg-[var(--color-bg-app)] overflow-hidden">
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
