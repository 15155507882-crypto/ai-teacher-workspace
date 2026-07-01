import { useState, useEffect } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { contentService } from '../../services/content';
import { AppPage, LoadingSkeleton, EmptyState } from '../../components/base';
import type { ContentItem, ContentStatsData } from '../../types/api';
import './space.scss';

const MODULES = [
  { key: 'personal_lesson', label: '个人备课', desc: '撰写与管理个人教案', icon: '备', tone: 'blue', path: '/pages/space/personal-lessons/index' },
  { key: 'group_lesson', label: '集体备课', desc: '协同共建优质教案', icon: '组', tone: 'orange', path: '/pages/space/group-lessons/index' },
  { key: 'plan_summary', label: '计划总结', desc: '教学计划与总结管理', icon: '划', tone: 'green', path: '/pages/space/plans/index' },
  { key: 'reflection', label: '教学反思', desc: '记录与沉淀教学反思', icon: '思', tone: 'red', path: '/pages/space/reflections/index' },
];

const TYPE_META: Record<string, { label: string; cls: string }> = {
  personal_lesson: { label: '个人备课', cls: 'blue' },
  group_lesson: { label: '集体备课', cls: 'orange' },
  plan_summary: { label: '计划总结', cls: 'green' },
  reflection: { label: '教学反思', cls: 'red' },
};

export default function SpacePage() {
  const [recentItems, setRecentItems] = useState<ContentItem[]>([]);
  const [stats, setStats] = useState<ContentStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const teacherStr = Taro.getStorageSync('teacher');
      if (!teacherStr) return;
      const teacher = JSON.parse(teacherStr);

      const [contentRes, statsRes] = await Promise.all([
        contentService.listByTeacher(teacher.id, { size: 5 }).catch(() => ({ items: [], total: 0, page: 1, pageSize: 5 })),
        contentService.getStatsByTeacher(teacher.id).catch(() => null),
      ]);
      setRecentItems(contentRes.items.slice(0, 5));
      setStats(statsRes);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);
  useDidShow(() => { loadData(); });

  const goToModule = (path: string) => Taro.navigateTo({ url: path });
  const goToDetail = (id: number) => Taro.navigateTo({ url: `/pages/content/detail/index?id=${id}` });
  const statusLabel = (status?: string) => status === 'draft' ? '草稿' : '已完成';
  const yearText = (item: ContentItem) => item.academic_year || '2026-2027学年';
  const semesterText = (item: ContentItem) => item.semester || '上学期';
  const dateText = (item: ContentItem) => item.created_at?.slice(0, 10) || '';

  return (
    <AppPage>
      <View className="space-header">
        <View className="space-header__copy">
          <Text className="space-header__eyebrow">AI 教学资产</Text>
          <Text className="space-header__title">备课空间</Text>
          <Text className="space-header__desc">管理备课、反思、计划与集体协作内容</Text>
        </View>
        <View className="space-hero-book">
          <View className="space-hero-book__page space-hero-book__page--back" />
          <View className="space-hero-book__page space-hero-book__page--front" />
          <Text className="space-hero-book__spark">✦</Text>
        </View>
      </View>

      {stats && (
        <View className="space-stats">
          <Text className="space-stats__title">AI 能力统计</Text>
          <View className="space-stats__grid">
            <View className="space-stat">
              <Text className="space-stat__num">{stats.personal_lesson}</Text>
              <Text className="space-stat__label">个人备课</Text>
            </View>
            <View className="space-stat">
              <Text className="space-stat__num">{stats.group_lesson}</Text>
              <Text className="space-stat__label">集体备课</Text>
            </View>
            <View className="space-stat">
              <Text className="space-stat__num">{stats.plan_summary}</Text>
              <Text className="space-stat__label">计划总结</Text>
            </View>
            <View className="space-stat">
              <Text className="space-stat__num">{stats.reflection}</Text>
              <Text className="space-stat__label">教学反思</Text>
            </View>
          </View>
        </View>
      )}

      <View className="space-modules">
        {MODULES.map(m => (
          <View key={m.key} className={`space-module-card space-module-card--${m.tone}`} onClick={() => goToModule(m.path)}>
            <Text className="space-module-card__icon">{m.icon}</Text>
            <View className="space-module-card__body">
              <Text className="space-module-card__label">{m.label}</Text>
              <Text className="space-module-card__desc">{m.desc}</Text>
            </View>
            <Text className="space-module-card__arrow">›</Text>
          </View>
        ))}
      </View>

      <View className="space-section">
        <View className="space-section__header">
          <Text className="space-section__title">最近内容</Text>
          <Text className="space-section__more" onClick={() => goToModule('/pages/space/personal-lessons/index')}>查看全部 →</Text>
        </View>

        {loading ? (
          <LoadingSkeleton lines={3} type="card" />
        ) : recentItems.length === 0 ? (
          <EmptyState text="暂无内容，去 AI 工作台创建吧" />
        ) : (
          recentItems.map(item => {
            const meta = TYPE_META[item.content_type] || { label: item.content_type, cls: 'blue' };
            return (
              <View key={item.id} className="space-recent-card" onClick={() => goToDetail(item.id)}>
                <Text className={`space-recent-card__tag space-recent-card__tag--${meta.cls}`}>{meta.label}</Text>
                <View className="space-recent-card__body">
                  <Text className="space-recent-card__title">{item.title}</Text>
                  <View className="space-recent-card__meta">
                    <Text className="space-recent-card__meta-item">{yearText(item)}</Text>
                    <Text className="space-recent-card__dot">·</Text>
                    <Text className="space-recent-card__meta-item">{semesterText(item)}</Text>
                    <Text className="space-recent-card__dot">·</Text>
                    <Text className="space-recent-card__meta-item">{dateText(item)}</Text>
                  </View>
                </View>
                <Text className={`space-recent-card__status space-recent-card__status--${item.status === 'draft' ? 'draft' : 'done'}`}>{statusLabel(item.status)}</Text>
                <Text className="space-recent-card__arrow">›</Text>
              </View>
            );
          })
        )}
      </View>
    </AppPage>
  );
}
