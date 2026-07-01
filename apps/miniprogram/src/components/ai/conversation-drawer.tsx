import { View, Text, ScrollView } from '@tarojs/components';
import type { Conversation } from '../../types/api';
import './conversation-drawer.scss';

interface ConversationDrawerProps {
  visible: boolean;
  conversations: Conversation[];
  activeId?: number;
  loading?: boolean;
  onSelect: (id: number) => void;
  onNew: () => void;
  onDelete: (id: number) => void;
  onClose: () => void;
}

export function ConversationDrawer({
  visible, conversations, activeId, loading,
  onSelect, onNew, onDelete, onClose,
}: ConversationDrawerProps) {
  if (!visible) return null;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return '今天';
    if (diff < 172800000) return '昨天';
    return dateStr.slice(5, 10).replace('-', '/');
  };

  // 按日期分组
  const grouped = conversations.reduce<Record<string, Conversation[]>>((acc, c) => {
    const key = formatDate(c.last_active_at || c.created_at);
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  return (
    <View className="conv-drawer-mask" onClick={onClose}>
      <View className="conv-drawer" onClick={e => e.stopPropagation()}>
        <View className="conv-drawer__header">
          <Text className="conv-drawer__title">会话列表</Text>
          <View className="conv-drawer__new" onClick={onNew}>
            <Text>+ 新建</Text>
          </View>
        </View>

        <ScrollView scrollY className="conv-drawer__list">
          {loading ? (
            <View className="conv-drawer__loading"><Text>加载中...</Text></View>
          ) : conversations.length === 0 ? (
            <View className="conv-drawer__empty"><Text>暂无会话</Text></View>
          ) : (
            Object.entries(grouped).map(([date, convs]) => (
              <View key={date} className="conv-drawer__group">
                <Text className="conv-drawer__date">{date}</Text>
                {convs.map(c => (
                  <View
                    key={c.id}
                    className={`conv-drawer__item ${c.id === activeId ? 'conv-drawer__item--active' : ''}`}
                    onClick={() => { onSelect(c.id); onClose(); }}
                  >
                    <View className="conv-drawer__item-content">
                      <Text className="conv-drawer__item-title">{c.title || '新会话'}</Text>
                      {c.summary && (
                        <Text className="conv-drawer__item-summary">{c.summary}</Text>
                      )}
                    </View>
                    <View
                      className="conv-drawer__item-delete"
                      onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                    >
                      <Text>删</Text>
                    </View>
                  </View>
                ))}
              </View>
            ))
          )}
          <View style={{ height: '60px' }} />
        </ScrollView>

        <View className="conv-drawer__footer" onClick={onClose}>
          <Text>关闭</Text>
        </View>
      </View>
    </View>
  );
}
