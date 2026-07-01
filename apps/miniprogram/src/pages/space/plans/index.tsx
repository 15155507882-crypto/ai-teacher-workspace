import { useState, useEffect } from 'react';
import { View, Text, Input, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { contentService } from '../../../services/content';
import { usePagination } from '../../../hooks/usePagination';
import { AppPage, LoadingSkeleton, EmptyState, ActionSheet } from '../../../components/base';
import type { ContentTypeStr } from '../../../types/api';
import { SpaceListCard } from '../content-list';
import '../content-list.scss';

export default function PlansPage() {
  const [search, setSearch] = useState('');
  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [segment, setSegment] = useState<'all' | 'semester_plan' | 'semester_summary'>('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    try {
      const teacherStr = Taro.getStorageSync('teacher');
      if (teacherStr) setTeacherId(JSON.parse(teacherStr).id);
    } catch { /* ignore */ }
  }, []);

  const fetcher = async (page: number, size: number) => {
    if (!teacherId) return { items: [], total: 0 };
    const res = await contentService.listByTeacher(teacherId, {
      content_type: 'plan_summary' as ContentTypeStr,
      page, size,
    });
    return { items: res.items, total: res.total };
  };

  const { items, loading, refreshing, hasMore, refresh, loadMore } = usePagination(fetcher, { pageSize: 20 });

  useDidShow(() => { if (teacherId) refresh(); });
  useEffect(() => { if (teacherId) refresh(); }, [teacherId]);

  const filtered = (() => {
    let list = items;
    if (search.trim()) {
      list = list.filter(i => i.title?.toLowerCase().includes(search.trim().toLowerCase()));
    }
    if (segment !== 'all') {
      // 根据 plan_type 过滤（plan_type 在 detail 子表中，这里简化用 title 判断）
      const kw = segment === 'semester_plan' ? '计划' : '总结';
      list = list.filter(i => i.title?.includes(kw));
    }
    return list;
  })();

  const goToDetail = (id: number) => Taro.navigateTo({ url: `/pages/content/detail/index?id=${id}` });
  const goBack = () => Taro.navigateBack();
  const goCreate = () => Taro.switchTab({ url: '/pages/workspace/index' });
  const handleLongPress = (id: number) => { setSelectedId(id); setShowActions(true); };

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
            setShowActions(false);
            refresh();
          } catch (err: any) {
            Taro.showToast({ title: err.message, icon: 'none' });
          }
        }
      },
    });
  };

  const segments = [
    { key: 'all', label: '全部' },
    { key: 'semester_plan', label: '计划' },
    { key: 'semester_summary', label: '总结' },
  ];

  return (
    <AppPage className="cl-page" safeBottom={false}>
      <View className="cl-topbar">
        <Text className="cl-topbar__back" onClick={goBack}>‹</Text>
        <Text className="cl-topbar__add" onClick={goCreate}>＋</Text>
      </View>

      <View className="cl-header">
        <Text className="cl-header__title">计划总结</Text>
      </View>

      <View className="cl-search-row">
        <View className="cl-search">
          <Text className="cl-search__icon">⌕</Text>
          <Input
            className="cl-search__input"
            value={search}
            onInput={e => setSearch(e.detail.value)}
            placeholder="搜索计划总结标题"
            placeholderClass="cl-search__placeholder"
          />
        </View>
        <Text className="cl-search-row__count">共 {filtered.length} 条</Text>
      </View>

      <View className="cl-segment">
        {segments.map(s => (
          <View
            key={s.key}
            className={`cl-segment__item ${segment === s.key ? 'cl-segment__item--active' : ''}`}
            onClick={() => setSegment(s.key as any)}
          >
            <Text>{s.label}</Text>
          </View>
        ))}
      </View>

      <ScrollView
        className="cl-list cl-list--with-segment"
        scrollY
        refresherEnabled
        refresherTriggered={refreshing}
        onRefresherRefresh={refresh}
        onScrollToLower={loadMore}
      >
        {loading && items.length === 0 ? (
          <LoadingSkeleton lines={5} type="card" />
        ) : filtered.length === 0 ? (
          <EmptyState text={search ? '无匹配结果' : '暂无计划与总结'} onRetry={refresh} />
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
            {!hasMore && items.length > 0 && <View className="cl-no-more"><Text>— 已加载全部 —</Text></View>}
            <View style={{ height: '20px' }} />
          </>
        )}
      </ScrollView>

      <ActionSheet
        visible={showActions}
        items={[{ label: '删除', action: () => { setShowActions(false); handleDelete(); } }]}
        onClose={() => setShowActions(false)}
      />
    </AppPage>
  );
}
