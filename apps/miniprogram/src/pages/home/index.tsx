import { useState, useEffect } from 'react';
import { View, Text, Input, ScrollView, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { teacherService } from '../../services/teacher';
import { AppPage, LoadingSkeleton, EmptyState } from '../../components/base';
import { TeacherItem, HomeGroup, BatchTeacherStatsData } from '../../types/api';
import './home.scss';

export default function HomePage() {
  const [groups, setGroups] = useState<HomeGroup[]>([]);
  const [allTeachers, setAllTeachers] = useState<TeacherItem[]>([]);
  const [stats, setStats] = useState<BatchTeacherStatsData>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<number, boolean>>({});
  const [teacherName, setTeacherName] = useState('管理员');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const teacherStr = Taro.getStorageSync('teacher');
      if (teacherStr) {
        const teacher = JSON.parse(teacherStr);
        if (teacher?.name) setTeacherName(teacher.name);
      }
      const [groupData, teacherData, statsData] = await Promise.all([
        teacherService.getHomeGroups().catch(() => [] as HomeGroup[]),
        teacherService.list(1).catch(() => [] as TeacherItem[]),
        teacherService.getStats(1).catch(() => ({}) as BatchTeacherStatsData),
      ]);
      setGroups(groupData);
      setAllTeachers(teacherData);
      setStats(statsData);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const goToTeacherDetail = (id: number) => {
    Taro.navigateTo({ url: `/pages/teacher/detail/index?id=${id}` });
  };

  const getTeacherStats = (tid: number) => {
    const s = stats[String(tid)];
    return s || { personal_lesson: 0, reflection: 0, group_lesson: 0, plan_summary: 0 };
  };

  // 筛选后的教师/分组
  const keyword = search.trim().toLowerCase();
  const filteredGroups = keyword
    ? groups.map(g => ({
        ...g,
        teachers: g.teachers.filter(t =>
          t.name?.toLowerCase().includes(keyword) ||
          t.mobile?.includes(keyword)
        ),
      })).filter(g => g.teachers.length > 0)
    : groups;

  // 如果分组数据为空，使用全量教师
  const hasGroups = groups.length > 0;
  const displayGroups: HomeGroup[] = hasGroups
    ? filteredGroups
    : [{
        id: 0,
        name: '备课组教师',
        teachers: allTeachers.filter(t =>
          !keyword ||
          t.name?.toLowerCase().includes(keyword) ||
          t.mobile?.includes(keyword)
        ),
      }];
  const teacherCount = hasGroups
    ? groups.reduce((sum, group) => sum + group.teachers.length, 0)
    : allTeachers.length;
  const statTotals = Object.values(stats).reduce(
    (sum, item) => ({
      personal_lesson: sum.personal_lesson + (item?.personal_lesson || 0),
      reflection: sum.reflection + (item?.reflection || 0),
      group_lesson: sum.group_lesson + (item?.group_lesson || 0),
      plan_summary: sum.plan_summary + (item?.plan_summary || 0),
    }),
    { personal_lesson: 0, reflection: 0, group_lesson: 0, plan_summary: 0 }
  );

  const goWorkspace = () => Taro.switchTab({ url: '/pages/workspace/index' });
  const goSpaceModule = (url: string) => Taro.navigateTo({ url });
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 6) return '夜深了';
    if (h < 9) return '早上好';
    if (h < 12) return '上午好';
    if (h < 14) return '中午好';
    if (h < 18) return '下午好';
    return '晚上好';
  };

  const getTodayText = () => {
    const d = new Date();
    const weekMap = ['日', '一', '二', '三', '四', '五', '六'];
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const week = weekMap[d.getDay()];
    return `${m}月${day}日 星期${week}`;
  };

  const [greeting] = useState(getGreeting());
  const [todayText] = useState(getTodayText());

  const groupIcon = (name: string) => {
    if (name.includes('语')) return '书';
    if (name.includes('数')) return '√';
    if (name.includes('英')) return 'En';
    return name.slice(0, 1) || '组';
  };

  if (loading) {
    return (
      <AppPage>
        <View className="home-search-bar">
          <View className="home-search-input skeleton" style={{ height: '64px' }} />
        </View>
        <LoadingSkeleton lines={4} type="card" />
      </AppPage>
    );
  }

  return (
    <AppPage>
      <View className="home-hero">
        <View>
          <Text className="home-hero__title">{greeting}，{teacherName}</Text>
          <Text className="home-hero__date">{todayText}</Text>
        </View>
        <View className="home-hero__actions">
          <View className="home-round-btn home-round-btn--bell"><Text /></View>
          <View className="home-round-btn home-round-btn--setting"><Text /></View>
        </View>
      </View>

      <View className="home-quick-card">
        <View className="home-section-head">
          <Text className="home-section-head__title">AI 快捷入口</Text>
          <Text className="home-section-head__more">更多 〉</Text>
        </View>
        <View className="home-quick-grid">
          <View className="home-quick" onClick={goWorkspace}>
            <View className="home-quick__icon home-quick__icon--calendar"><Text /></View>
            <Text className="home-quick__label">开始备课</Text>
          </View>
          <View className="home-quick" onClick={() => goSpaceModule('/pages/space/reflections/index')}>
            <View className="home-quick__icon home-quick__icon--chat"><Text /></View>
            <Text className="home-quick__label">教学反思</Text>
          </View>
          <View className="home-quick" onClick={() => goSpaceModule('/pages/space/plans/index')}>
            <View className="home-quick__icon home-quick__icon--plan"><Text /></View>
            <Text className="home-quick__label">计划总结</Text>
          </View>
          <View className="home-quick" onClick={() => goSpaceModule('/pages/space/group-lessons/index')}>
            <View className="home-quick__icon home-quick__icon--group"><Text /></View>
            <Text className="home-quick__label">集体备课</Text>
          </View>
        </View>
      </View>

      <View className="home-data-card">
        <View className="home-section-head">
          <Text className="home-section-head__title">教学数据概览</Text>
        </View>
        <View className="home-data-grid">
          <View className="home-data"><Text className="home-data__icon home-data__icon--teacher">人</Text><Text className="home-data__num">{teacherCount}</Text><Text className="home-data__label">教师数量</Text></View>
          <View className="home-data"><Text className="home-data__icon home-data__icon--lesson">书</Text><Text className="home-data__num">{statTotals.personal_lesson}</Text><Text className="home-data__label">备课数量</Text></View>
          <View className="home-data"><Text className="home-data__icon home-data__icon--reflection">笔</Text><Text className="home-data__num">{statTotals.reflection}</Text><Text className="home-data__label">教学反思</Text></View>
          <View className="home-data"><Text className="home-data__icon home-data__icon--plan">历</Text><Text className="home-data__num">{statTotals.plan_summary}</Text><Text className="home-data__label">计划总结</Text></View>
        </View>
      </View>

      <View className="home-search-bar">
        <Text className="home-search-icon">⌕</Text>
        <Input
          className="home-search-input"
          value={search}
          onInput={e => setSearch(e.detail.value)}
          placeholder="搜索教师姓名或手机号"
        />
      </View>

      <ScrollView scrollY className="home-content" refresherEnabled onRefresherRefresh={loadData}>
        <View className="home-section-head home-section-head--list">
          <Text className="home-section-head__title">备课组教师</Text>
        </View>
        {displayGroups.some(group => group.teachers.length > 0) ? (
          displayGroups.map(group => {
            const collapsed = collapsedGroups[group.id] !== false;
            return (
            <View key={group.id} className="home-group">
              <View className="home-group__header" onClick={() => setCollapsedGroups(prev => ({ ...prev, [group.id]: !collapsed }))}>
                <View className="home-group__title">
                  <Text className="home-group__icon">{groupIcon(group.name)}</Text>
                  <Text className="home-group__name">{group.name}</Text>
                </View>
                <Text className="home-group__count">{group.teachers.length}位教师 {collapsed ? '〉' : '⌄'}</Text>
              </View>
              {!collapsed && (
              <View className="home-teacher-grid">
                {group.teachers.map(teacher => {
                  const st = getTeacherStats(teacher.id);
                  return (
                    <View
                      key={teacher.id}
                      className="home-teacher-card"
                      onClick={() => goToTeacherDetail(Number(teacher.id))}
                    >
                      <View className="home-teacher-card__avatar">
                        {teacher.avatar ? (
                          <Image src={teacher.avatar} className="home-teacher-card__avatar-img" mode="aspectFill" />
                        ) : (
                          <View className="home-teacher-card__avatar-default">
                            <View className="home-teacher-card__avatar-silhouette" />
                          </View>
                        )}
                      </View>
                      <View className="home-teacher-card__main">
                        <Text className="home-teacher-card__name">{teacher.name}</Text>
                        <Text className="home-teacher-card__mobile">{teacher.mobile || '教师空间'}</Text>
                      </View>
                      <View className="home-teacher-card__stats">
                        <Text className="home-teacher-card__stat">备课 <Text className="home-teacher-card__num">{st.personal_lesson}</Text></Text>
                        <Text className="home-teacher-card__sep">|</Text>
                        <Text className="home-teacher-card__stat">反思 <Text className="home-teacher-card__num">{st.reflection}</Text></Text>
                        <Text className="home-teacher-card__arrow">〉</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
              )}
            </View>
          ); })
        ) : (
          <EmptyState text={keyword ? '未找到相关教师' : '暂无教师信息'} onRetry={keyword ? undefined : loadData} />
        )}
      </ScrollView>
    </AppPage>
  );
}
