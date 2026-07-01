import { View, Text } from '@tarojs/components';
import { ReactNode } from 'react';
import './base.scss';

interface AppPageProps {
  children: ReactNode;
  className?: string;
  safeBottom?: boolean;
}

export function AppPage({ children, className = '', safeBottom = true }: AppPageProps) {
  return (
    <View className={`app-page ${safeBottom ? 'safe-bottom' : ''} ${className}`}>
      {children}
    </View>
  );
}

interface AppNavBarProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export function AppNavBar({ title = 'AI 教学辅助系统', showBack = false, onBack }: AppNavBarProps) {
  return (
    <View className="app-navbar">
      {showBack && (
        <View className="app-navbar__back" onClick={onBack}>
          <Text className="app-navbar__back-icon">←</Text>
        </View>
      )}
      <View className="app-navbar__title">
        <Text>{title}</Text>
      </View>
    </View>
  );
}

interface StatusTagProps {
  status: string;
}

const statusMap: Record<string, { label: string; cls: string }> = {
  active: { label: '在职', cls: 'tag--green' },
  resigned: { label: '离职', cls: 'tag--red' },
  disabled: { label: '停用', cls: 'tag--gray' },
  confirmed: { label: '已完成', cls: 'tag--green' },
  completed: { label: '已完成', cls: 'tag--green' },
  draft: { label: '草稿', cls: 'tag--orange' },
  pending: { label: '待处理', cls: 'tag--orange' },
  failed: { label: '失败', cls: 'tag--red' },
  processing: { label: '处理中', cls: 'tag--blue' },
  reverted: { label: '已撤销', cls: 'tag--gray' },
};

export function StatusTag({ status }: StatusTagProps) {
  const info = statusMap[status] || { label: status, cls: 'tag--gray' };
  return <View className={`tag ${info.cls}`}><Text>{info.label}</Text></View>;
}

interface TypeTagProps {
  type: string;
}

const typeMap: Record<string, { label: string; cls: string }> = {
  personal_lesson: { label: '个人备课', cls: 'tag--blue' },
  group_lesson: { label: '集体备课', cls: 'tag--orange' },
  plan_summary: { label: '计划总结', cls: 'tag--green' },
  semester_plan: { label: '学期计划', cls: 'tag--green' },
  semester_summary: { label: '学期总结', cls: 'tag--blue' },
  reflection: { label: '教学反思', cls: 'tag--orange' },
  teaching_reflection: { label: '教学反思', cls: 'tag--orange' },
};

export function TypeTag({ type }: TypeTagProps) {
  const info = typeMap[type] || { label: type, cls: 'tag--gray' };
  return <View className={`tag ${info.cls}`}><Text>{info.label}</Text></View>;
}

interface EmptyStateProps {
  icon?: string;
  text?: string;
  onRetry?: () => void;
}

export function EmptyState({ icon = '📭', text = '暂无数据', onRetry }: EmptyStateProps) {
  return (
    <View className="empty-state">
      <Text className="empty-state__icon">{icon}</Text>
      <Text className="empty-state__text">{text}</Text>
      {onRetry && (
        <View className="empty-state__retry" onClick={onRetry}>
          <Text>点击重试</Text>
        </View>
      )}
    </View>
  );
}

interface LoadingSkeletonProps {
  lines?: number;
  type?: 'card' | 'list';
}

export function LoadingSkeleton({ lines = 3, type = 'list' }: LoadingSkeletonProps) {
  if (type === 'card') {
    return (
      <View className="skeleton-card">
        <View className="skeleton skeleton--title" />
        <View className="skeleton skeleton--text" />
        <View className="skeleton skeleton--text skeleton--short" />
      </View>
    );
  }
  return (
    <View className="skeleton-list">
      {Array.from({ length: lines }).map((_, i) => (
        <View key={i} className="skeleton skeleton--row" />
      ))}
    </View>
  );
}

// ====== 底部弹出菜单 ======
interface ActionSheetProps {
  visible: boolean;
  items: { label: string; action: () => void }[];
  onClose: () => void;
}

export function ActionSheet({ visible, items, onClose }: ActionSheetProps) {
  if (!visible) return null;
  return (
    <View className="action-sheet-mask" onClick={onClose}>
      <View className="action-sheet" onClick={e => e.stopPropagation()}>
        {items.map((item, i) => (
          <View key={i} className="action-sheet__item" onClick={item.action}>
            <Text>{item.label}</Text>
          </View>
        ))}
        <View className="action-sheet__cancel" onClick={onClose}>
          <Text>取消</Text>
        </View>
      </View>
    </View>
  );
}
