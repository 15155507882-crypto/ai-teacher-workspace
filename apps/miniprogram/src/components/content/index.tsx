import { View, Text } from '@tarojs/components';
import { ContentTypeStr } from '../../types/api';
import { ReactNode } from 'react';
import './content.scss';

interface ContentCardProps {
  id: number;
  title: string;
  content_type: ContentTypeStr;
  summary?: string | null;
  academic_year?: string;
  semester?: string;
  created_at?: string;
  status?: string;
  subject?: string;
  grade?: string;
  comment_count?: number;
  has_attachment?: boolean;
  linked_title?: string;
  onClick?: (id: number) => void;
}

const TYPE_LABELS: Record<string, string> = {
  personal_lesson: '个人备课',
  group_lesson: '集体备课',
  plan_summary: '计划总结',
  reflection: '教学反思',
};

const TYPE_COLORS: Record<string, string> = {
  personal_lesson: '#eff6ff',
  group_lesson: '#fff7ed',
  plan_summary: '#f0fdf4',
  reflection: '#fef2f2',
};

const TYPE_TEXT_COLORS: Record<string, string> = {
  personal_lesson: '#2563eb',
  group_lesson: '#f59e0b',
  plan_summary: '#22c55e',
  reflection: '#ef4444',
};

export function ContentCard({
  id, title, content_type, summary, academic_year,
  semester, created_at, status, subject, grade,
  comment_count, has_attachment, linked_title, onClick,
}: ContentCardProps) {
  const tagColor = TYPE_COLORS[content_type] || '#f8fafc';
  const tagTextColor = TYPE_TEXT_COLORS[content_type] || '#64748b';

  return (
    <View className="content-card" onClick={() => onClick?.(id)}>
      <View className="content-card__header">
        <View className="content-card__type-tag" style={{ background: tagColor }}>
          <Text style={{ color: tagTextColor, fontSize: '18px', fontWeight: '500' }}>
            {TYPE_LABELS[content_type] || content_type}
          </Text>
        </View>
        {created_at && <Text className="content-card__date-top">{created_at.slice(0, 10)}</Text>}
      </View>
      <View className="content-card__title">
        <Text>{title}</Text>
      </View>
      <View className="content-card__meta">
        {subject && <Text className="content-card__meta-item">{subject}</Text>}
        {grade && <Text className="content-card__meta-item">{grade}</Text>}
        {academic_year && <Text className="content-card__meta-item">{academic_year}</Text>}
        {semester && <Text className="content-card__meta-item">{semester}</Text>}
      </View>
      {linked_title && (
        <View className="content-card__linked">
          <Text>🔗 关联：{linked_title}</Text>
        </View>
      )}
      {summary && (
        <View className="content-card__summary">
          <Text>{summary}</Text>
        </View>
      )}
      <View className="content-card__footer">
        <View className="content-card__footer-right">
          {has_attachment && <Text className="content-card__icon">附件</Text>}
          {comment_count !== undefined && comment_count > 0 && (
            <Text className="content-card__icon">评论 {comment_count}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

interface ContentListPageProps {
  kind: ContentTypeStr;
  title: string;
}

export { TYPE_LABELS };
