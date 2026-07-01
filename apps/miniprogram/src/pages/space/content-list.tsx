import { useState, useEffect } from 'react';
import { View, Text, Input, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { contentService } from '../../services/content';
import { usePagination } from '../../hooks/usePagination';
import { AppPage, LoadingSkeleton, EmptyState, ActionSheet } from '../../components/base';
import { ContentItem, ContentTypeStr } from '../../types/api';
import './content-list.scss';

interface ContentListPageProps {
  kind: ContentTypeStr;
  title: string;
}

export const SPACE_TYPE_META: Record<string, { label: string; tone: string }> = {
  personal_lesson: { label: '个人备课', tone: 'blue' },
  group_lesson: { label: '集体备课', tone: 'orange' },
  plan_summary: { label: '计划总结', tone: 'green' },
  reflection: { label: '教学反思', tone: 'red' },
};

export const getContentDate = (item: ContentItem) => item.created_at?.slice(0, 10) || '';
export const getAcademicYear = (item: ContentItem) => item.academic_year || '2025-2026学年';
export const getSemester = (item: ContentItem) => item.semester || '下学期';

export function SpaceListCard({
  item,
  onClick,
  onLongPress,
}: {
  item: ContentItem;
  onClick: (id: number) => void;
  onLongPress?: (id: number) => void;
}) {
  const meta = SPACE_TYPE_META[item.content_type] || { label: item.content_type, tone: 'blue' };

  return (
    <View className="cl-card" onClick={() => onClick(item.id)} onLongPress={() => onLongPress?.(item.id)}>
      <View className="cl-card__head">
        <Text className={`cl-card__tag cl-card__tag--${meta.tone}`}>{meta.label}</Text>
        <Text className="cl-card__date">{getContentDate(item)}</Text>
      </View>
      <Text className="cl-card__title">{item.title}</Text>
      <View className="cl-card__line" />
      <View className="cl-card__foot">
        <View className="cl-card__meta">
          <Text className="cl-card__calendar">▣</Text>
          <Text>{getAcademicYear(item)}</Text>
          <Text className="cl-card__dot">·</Text>
          <Text>{getSemester(item)}</Text>
        </View>
        <Text className="cl-card__arrow">›</Text>
      </View>
    </View>
  );
}

export default function ContentListPage({ kind, title }: ContentListPageProps) {
  const [search, setSearch] = useState('');
  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    // 获取当前登录教师ID
    try {
      const teacherStr = Taro.getStorageSync('teacher');
      if (teacherStr) {
        const teacher = JSON.parse(teacherStr);
        setTeacherId(teacher.id);
      }
    } catch { /* ignore */ }
  }, []);

  const fetcher = async (page: number, size: number) => {
    if (!teacherId) return { items: [], total: 0 };
    const res = await contentService.listByTeacher(teacherId, {
      content_type: kind,
      page,
      size,
    });
    return { items: res.items, total: res.total };
  };

  const { items, loading, refreshing, hasMore, refresh, loadMore } = usePagination(fetcher, { pageSize: 20 });

  // 页面显示时刷新
  useDidShow(() => {
    if (teacherId) refresh();
  });

  useEffect(() => {
    if (teacherId) refresh();
  }, [teacherId, kind]);

  const filtered = search.trim()
    ? items.filter(item =>
        item.title?.toLowerCase().includes(search.trim().toLowerCase())
      )
    : items;

  const goToDetail = (id: number) => {
    Taro.navigateTo({ url: `/pages/content/detail/index?id=${id}` });
  };

  const goBack = () => Taro.navigateBack();
  const goCreate = () => Taro.switchTab({ url: '/pages/workspace/index' });

  const handleLongPress = (id: number) => {
    setSelectedId(id);
    setShowActions(true);
  };

  const handleDelete = () => {
    if (!selectedId) return;
    Taro.showModal({
      title: '确认删除',
      content: '删除后不可恢复',
      success: async (res) => {
        if (res.confirm) {
          try {
            await contentService.delete(selectedId);
            Taro.showToast({ title: '已删除', icon: 'success' });
            refresh();
          } catch (err: any) {
            Taro.showToast({ title: err.message, icon: 'none' });
          }
        }
      },
    });
  };

  return (
    <AppPage className="cl-page" safeBottom={false}>
      <View className="cl-topbar">
        <Text className="cl-topbar__back" onClick={goBack}>‹</Text>
        <Text className="cl-topbar__add" onClick={goCreate}>＋</Text>
      </View>

      <View className="cl-header">
        <Text className="cl-header__title">{title}</Text>
      </View>

      <View className="cl-search-row">
        <View className="cl-search">
          <Text className="cl-search__icon">⌕</Text>
          <Input
            className="cl-search__input"
            value={search}
            onInput={e => setSearch(e.detail.value)}
            placeholder={`搜索${title}标题`}
            placeholderClass="cl-search__placeholder"
          />
        </View>
        <Text className="cl-search-row__count">共 {filtered.length} 条</Text>
      </View>

      <ScrollView
        className="cl-list"
        scrollY
        refresherEnabled
        refresherTriggered={refreshing}
        onRefresherRefresh={refresh}
        onScrollToLower={loadMore}
      >
        {loading && items.length === 0 ? (
          <LoadingSkeleton lines={5} type="card" />
        ) : filtered.length === 0 ? (
          <EmptyState
            text={search ? '无匹配结果' : `暂无${title}`}
            onRetry={refresh}
          />
        ) : (
          <>
            {filtered.map(item => (
              <SpaceListCard
                key={item.id}
                item={item}
                onClick={goToDetail}
                onLongPress={handleLongPress}
              />
            ))}
            {loading && <View className="cl-loading-more"><Text>加载中...</Text></View>}
            {!hasMore && items.length > 0 && (
              <View className="cl-no-more"><Text>— 已加载全部 —</Text></View>
            )}
            <View style={{ height: '20px' }} />
          </>
        )}
      </ScrollView>

      {/* 长按操作 */}
      <ActionSheet
        visible={showActions}
        items={[
          { label: '删除', action: () => { setShowActions(false); handleDelete(); } },
        ]}
        onClose={() => setShowActions(false)}
      />
    </AppPage>
  );
}
