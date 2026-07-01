import { useState, useEffect } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { teacherService } from '../../../services/teacher';
import { contentService } from '../../../services/content';
import { AppPage, LoadingSkeleton, EmptyState } from '../../../components/base';
import type { TeacherItem, ContentItem, ContentStatsData } from '../../../types/api';
import './teacher-detail.scss';

const TYPE_TAG: Record<string, { cls: string; label: string }> = {
  personal_lesson: { cls: 'td-recent-card__tag--blue', label: '个人备课' },
  group_lesson: { cls: 'td-recent-card__tag--orange', label: '集体备课' },
  plan_summary: { cls: 'td-recent-card__tag--green', label: '计划总结' },
  reflection: { cls: 'td-recent-card__tag--red', label: '教学反思' },
};

export default function TeacherDetailPage() {
  const [teacher, setTeacher] = useState<TeacherItem | null>(null);
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [stats, setStats] = useState<ContentStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useLoad((options) => { if (options?.id) loadData(Number(options.id)); });

  const getMyId = (): number | null => {
    try { const t = Taro.getStorageSync('teacher'); return t ? JSON.parse(t).id : null; } catch { return null; }
  };

  const loadData = async (teacherId: number) => {
    setLoading(true);
    const tid = Number(teacherId);
    try {
      const list = await teacherService.list(1).catch(() => [] as any[]);
      const teacherData = list.find((t: any) => Number(t.id) === tid) || null;
      setTeacher(teacherData);
      if (teacherData) {
        const myId = getMyId();
        Taro.setNavigationBarTitle({ title: tid === myId ? '我的备课空间' : teacherData.name + '老师备课空间' });
      }
      const [cd, sd] = await Promise.all([
        contentService.listByTeacher(tid, { size: 500 }).catch(() => ({ items: [] as ContentItem[], total: 0, page: 1, pageSize: 500 })),
        contentService.getStatsByTeacher(tid).catch(() => null),
      ]);
      setContents(cd.items);
      setStats(sd);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const goToDetail = (id: number) => Taro.navigateTo({ url: '/pages/content/detail/index?id=' + id });

  if (loading) return <AppPage><LoadingSkeleton lines={4} type="card" /></AppPage>;
  if (!teacher) return <AppPage><EmptyState text="教师不存在" /></AppPage>;

  return (
    <AppPage>
      <ScrollView scrollY className="td-scroll">
        <View className="td-header">
          <Text className="td-header__title">{teacher.name}老师备课空间</Text>
          <Text className="td-header__desc">{teacher.employee_no ? '工号 ' + teacher.employee_no + ' · ' : ''}共 {stats?.total || 0} 份教学资料</Text>
        </View>

        {stats && (
          <View className="td-stats-wrap">
            <View className="td-stat"><Text className="td-stat__num">{stats.personal_lesson}</Text><Text className="td-stat__label">个人备课</Text></View>
            <View className="td-stat"><Text className="td-stat__num">{stats.group_lesson}</Text><Text className="td-stat__label">集体备课</Text></View>
            <View className="td-stat"><Text className="td-stat__num">{stats.plan_summary}</Text><Text className="td-stat__label">计划总结</Text></View>
            <View className="td-stat"><Text className="td-stat__num">{stats.reflection}</Text><Text className="td-stat__label">教学反思</Text></View>
          </View>
        )}

        <View className="td-section">
          <Text className="td-section__title">最近内容</Text>
          {contents.length === 0
            ? <EmptyState text="暂无内容" />
            : contents.slice(0, 8).map(function (item) {
                var tag = TYPE_TAG[item.content_type] || { cls: 'td-recent-card__tag--blue', label: item.content_type };
                return (
                  <View key={item.id} className="td-recent-card" onClick={function () { goToDetail(item.id); }}>
                    <View className={'td-recent-card__tag ' + tag.cls}><Text>{tag.label}</Text></View>
                    <View className="td-recent-card__body">
                      <Text className="td-recent-card__title">{item.title}</Text>
                      <View className="td-recent-card__meta">
                        <Text>{item.academic_year || ''}</Text>
                        <Text className="td-recent-card__dot">·</Text>
                        <Text>{item.created_at?.slice(0, 10) || ''}</Text>
                      </View>
                    </View>
                    <Text className="td-recent-card__arrow">→</Text>
                  </View>
                );
              })}
        </View>
        <View style={{ height: '40px' }} />
      </ScrollView>
    </AppPage>
  );
}
