'use client';

import { useEffect, useState } from 'react';
import { WorkspaceContext } from './teacher-workspace';
import { AppButton, AppTag } from './ui/base';

const typeLabels: Record<string, string> = {
  personal_lesson: '个人备课',
  reflection: '教学反思',
  group_lesson: '集体备课',
  plan_summary: '计划总结',
};

export function ContentDetailPanel({
  ctx,
  contentId,
  onDelete,
  onRefresh,
}: {
  ctx: WorkspaceContext;
  contentId: number | null;
  onDelete: () => void;
  onRefresh: () => void;
}) {
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    if (!contentId) {
      setContent(null);
      return;
    }
    setLoading(true);
    fetch(`/api/contents/${contentId}`, { headers: { Authorization: `Bearer ${ctx.token}` } })
      .then((r) => r.json())
      .then((j) => {
        if (j.code === 0) setContent(j.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [contentId, ctx.token]);

  const handleDelete = async () => {
    try {
      const r = await fetch(`/api/contents/${contentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ctx.token}` },
        body: JSON.stringify({ reason: '教师删除' }),
      }).then((r) => r.json());
      if (r.code === 0) {
        onDelete();
        onRefresh();
      }
    } catch {}
  };

  return (
    <aside className="w-[360px] shrink-0 bg-[var(--color-bg-surface)] border-l border-[var(--color-border)] overflow-y-auto h-full">
      {!contentId ? (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-body text-[var(--color-text-muted)]">点击左侧资料查看详情</p>
        </div>
      ) : loading ? (
        <div className="p-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-6 bg-[var(--color-bg-muted)] rounded animate-pulse" />
          ))}
        </div>
      ) : content ? (
        <div className="p-6 space-y-5">
          <div>
            <AppTag color="blue">{typeLabels[content.content_type] || content.content_type}</AppTag>
            <h3 className="text-card-title text-[var(--color-text-strong)] mt-2">
              {content.title}
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-tiny text-[var(--color-text-muted)]">创建时间</p>
              <p className="text-body">{new Date(content.created_at).toLocaleString('zh-CN')}</p>
            </div>
            <div>
              <p className="text-tiny text-[var(--color-text-muted)]">更新时间</p>
              <p className="text-body">{new Date(content.updated_at).toLocaleString('zh-CN')}</p>
            </div>
            <div>
              <p className="text-tiny text-[var(--color-text-muted)]">学年</p>
              <p className="text-body">{content.academic_year || '—'}</p>
            </div>
            <div>
              <p className="text-tiny text-[var(--color-text-muted)]">学期</p>
              <p className="text-body">{content.semester || '—'}</p>
            </div>
            <div>
              <p className="text-tiny text-[var(--color-text-muted)]">版本</p>
              <p className="text-body">v{content.version || 1}</p>
            </div>
            <div>
              <p className="text-tiny text-[var(--color-text-muted)]">状态</p>
              <AppTag color={content.status === 'confirmed' ? 'green' : 'default'}>
                {content.status}
              </AppTag>
            </div>
          </div>

          {content.summary && (
            <div>
              <p className="text-tiny text-[var(--color-text-muted)] mb-1">摘要</p>
              <p className="text-body text-[var(--color-text-normal)]">{content.summary}</p>
            </div>
          )}

          <div className="pt-3 border-t border-[var(--color-border)] space-y-2">
            <AppButton variant="secondary" size="sm" className="w-full justify-start">
              🔍 在线预览
            </AppButton>
            <AppButton
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => setShowDelete(true)}
            >
              🗑 删除
            </AppButton>
          </div>

          {showDelete && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
              <p className="text-sm text-red-700 font-medium">确认删除？</p>
              <p className="text-xs text-red-600">删除后资料将不再可见，但可在后台恢复。</p>
              <div className="flex gap-2">
                <AppButton size="sm" variant="danger" onClick={handleDelete}>
                  确认删除
                </AppButton>
                <AppButton size="sm" variant="secondary" onClick={() => setShowDelete(false)}>
                  取消
                </AppButton>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 text-center text-sm text-[var(--color-text-muted)]">加载失败</div>
      )}
    </aside>
  );
}
