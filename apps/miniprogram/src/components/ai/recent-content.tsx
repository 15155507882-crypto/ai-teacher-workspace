import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { contentService } from '../../services/content';
import type { ContentItem } from '../../types/api';
import './recent-content.scss';

interface Props {
  visible: boolean;
  teacherId: number | null;
  onSelect: (id: number) => void;
  onClose: () => void;
}

const TYPE_MAP: Record<string, { label: string; color: string }> = {
  personal_lesson: { label: '个人备课', color: '#2563eb' },
  group_lesson: { label: '集体备课', color: '#f59e0b' },
  plan_summary: { label: '计划总结', color: '#22c55e' },
  reflection: { label: '教学反思', color: '#ef4444' },
};

export function RecentContentDrawer({ visible, teacherId, onSelect, onClose }: Props) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && teacherId) {
      setLoading(true);
      contentService.listByTeacher(teacherId, { size: 10 })
        .then(res => setItems(res.items))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [visible, teacherId]);

  if (!visible) return null;

  return (
    <View className="rc-drawer-mask" onClick={onClose}>
      <View className="rc-drawer" onClick={e => e.stopPropagation()}>
        <View className="rc-drawer__handle"><View className="rc-drawer__handle-bar" /></View>
        <View className="rc-drawer__header">
          <Text className="rc-drawer__title">最近保存的内容</Text>
          <View className="rc-drawer__close" onClick={onClose}><Text>✕</Text></View>
        </View>
        <ScrollView scrollY className="rc-drawer__list">
          {loading ? (
            <View className="rc-drawer__loading"><Text>加载中...</Text></View>
          ) : items.length === 0 ? (
            <View className="rc-drawer__empty"><Text>暂无内容</Text></View>
          ) : (
            items.map(item => {
              const typeInfo = TYPE_MAP[item.content_type] || { label: item.content_type, color: '#64748b' };
              return (
                <View key={item.id} className="rc-item" onClick={() => { onSelect(item.id); onClose(); }}>
                  <View className="rc-item__left">
                    <View className="rc-item__type" style={{ color: typeInfo.color, fontSize: '22px' }}>
                      <Text>{typeInfo.label}</Text>
                    </View>
                    <Text className="rc-item__title">{item.title}</Text>
                  </View>
                  <View className="rc-item__right">
                    <Text className="rc-item__date">{item.created_at?.slice(0, 10)}</Text>
                    <Text className="rc-item__arrow">→</Text>
                  </View>
                </View>
              );
            })
          )}
          <View style={{ height: '40px' }} />
        </ScrollView>
      </View>
    </View>
  );
}
