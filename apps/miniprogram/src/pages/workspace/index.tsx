import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { aiService } from '../../services/ai';
import { usePolling } from '../../hooks/usePolling';
import { ActionSheet, EmptyState } from '../../components/base';
import { ModeSelector, UserBubble, AIBubble, AIPreviewCard, ChatInputBar, AIPreviewEditSheet } from '../../components/ai';
import { ConversationDrawer } from '../../components/ai/conversation-drawer';
import { RecentContentDrawer } from '../../components/ai/recent-content';
import { AIMessage, AIWorkerResult, Conversation } from '../../types/api';
import './workspace.scss';

export default function WorkspacePage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [showConvDrawer, setShowConvDrawer] = useState(false);
  const [convLoading, setConvLoading] = useState(false);
  const [showRecentDrawer, setShowRecentDrawer] = useState(false);
  const [myTeacherId, setMyTeacherId] = useState<number | null>(null);
  const [messages, setMessages] = useState<(AIMessage & { preview?: AIWorkerResult; saved?: boolean; actionId?: number })[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState('auto');
  const [pageReady, setPageReady] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [editingCard, setEditingCard] = useState<{ msgId: number; data: any } | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [showUndoSheet, setShowUndoSheet] = useState(false);
  const [undoMsgId, setUndoMsgId] = useState<number | null>(null);

  const scrollRef = useRef<string>('msg-bottom');
  const [activePollId, setActivePollId] = useState<number | null>(null);

  const scrollToBottom = useCallback(() => {
    scrollRef.current = `msg-${Date.now()}`;
  }, []);

  const { status: pollStatus, result: pollResult, start: startPoll } = usePolling({
    messageId: activePollId,
    interval: 1200,
    maxAttempts: 50,
    onCompleted: (res) => {
      if (res.result) {
        setMessages(prev => prev.map(m =>
          m.id === activePollId ? { ...m, preview: res.result, message_type: 'action' } : m
        ));
      }
      setActivePollId(null);
      scrollToBottom();
    },
    onTimeout: () => {
      Taro.showToast({ title: 'AI 未响应，请重试', icon: 'none' });
      setActivePollId(null);
    },
  });

  useEffect(() => {
    loadTodayMessages();
    loadConversations();
    try {
      const t = Taro.getStorageSync('teacher');
      if (t) setMyTeacherId(JSON.parse(t).id);
    } catch { /* ignore */ }
  }, []);
  useDidShow(() => { if (pageReady) { loadTodayMessages(); loadConversations(); } });

  const loadConversations = async () => {
    setConvLoading(true);
    try {
      const list = await aiService.getConversations();
      setConversations(list);
    } catch { /* ignore */ }
    setConvLoading(false);
  };

  const handleSelectConversation = async (id: number) => {
    setActiveConvId(id);
    try {
      const msgs = await aiService.getMessages(id);
      setMessages(msgs);
    } catch { /* ignore */ }
  };

  const handleNewConversation = async () => {
    try {
      const conv = await aiService.getTodayConversation();
      setConversations(prev => [conv, ...prev.filter(c => c.id !== conv.id)]);
      setActiveConvId(conv.id);
      setMessages([]);
      setShowConvDrawer(false);
    } catch { /* ignore */ }
  };

  const handleDeleteConversation = (id: number) => {
    Taro.showModal({
      title: '删除会话',
      content: '删除后消息不可恢复',
      success: async (res) => {
        if (res.confirm) {
          try {
            await aiService.deleteConversation(id);
            setConversations(prev => prev.filter(c => c.id !== id));
            if (activeConvId === id) {
              setMessages([]);
              setActiveConvId(null);
            }
          } catch (err: any) {
            Taro.showToast({ title: err.message, icon: 'none' });
          }
        }
      },
    });
  };

  const loadTodayMessages = async () => {
    try {
      const session = await aiService.getActiveSession();
      if (session?.id) {
        const msgs = await aiService.getMessages(session.id);
        setMessages(msgs);
      }
      setPageReady(true);
    } catch { setPageReady(true); }
  };

  // 发送消息
  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setInput('');

    // 添加用户消息到本地
    const userMsg: any = {
      id: Date.now(),
      session_id: 0,
      sender_type: 'teacher',
      message_type: 'text',
      text_content: text,
      file_id: null,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    scrollToBottom();

    try {
      const res = await aiService.chat({ text, mode });
      if (res.status === 'processing') {
        setMessages(prev => prev.map(m =>
          m.id === userMsg.id ? { ...m, id: res.messageId } : m
        ));
        userMsg.id = res.messageId;
        setActivePollId(res.messageId);
        startPoll();
        scrollToBottom();
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        session_id: 0,
        sender_type: 'ai',
        message_type: 'text',
        text_content: `发送失败: ${err.message}`,
        file_id: null,
        created_at: new Date().toISOString(),
      }]);
    } finally {
      setSending(false);
    }
  };

  // 确认保存
  const handleConfirm = async (msgId: number, data: AIWorkerResult) => {
    setConfirmingId(msgId);
    try {
      const res = await aiService.confirm({
        messageId: msgId,
        type: data.type || '',
        title: data.title_candidate || '',
        subject: data.subject || '',
        grade: data.grade || '',
        extractedEntities: data.modules,
      });

      if ('conflict' in res && res.conflict) {
        Taro.showToast({ title: '已存在同名内容，已创建新版本', icon: 'none' });
      }

      setMessages(prev => prev.map(m =>
        m.id === msgId
          ? { ...m, saved: true, actionId: ('actionId' in res) ? res.actionId : undefined }
          : m
      ));
      Taro.showToast({ title: '保存成功', icon: 'success' });
    } catch (err: any) {
      Taro.showToast({ title: err.message || '保存失败', icon: 'none' });
    } finally {
      setConfirmingId(null);
    }
  };

  // 撤销
  const handleUndo = async (msgId: number) => {
    try {
      await aiService.undo(msgId);
      setMessages(prev => prev.map(m =>
        m.id === msgId
          ? { ...m, saved: false, text_content: '已撤销' }
          : m
      ));
      Taro.showToast({ title: '已撤销', icon: 'success' });
    } catch (err: any) {
      Taro.showToast({ title: err.message || '撤销失败', icon: 'none' });
    }
  };

  // 取消预览卡
  const handleCancelCard = (msgId: number) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));
  };

  // 文件上传（简化：选择聊天文件）
  const handleUploadFile = () => {
    Taro.chooseMessageFile({
      count: 1,
      type: 'file',
      success: async (res) => {
        const file = res.tempFiles[0];
        try {
          Taro.showLoading({ title: '上传中...' });
          const uploadRes = await aiService.uploadFile(file.path, file.name);
          Taro.hideLoading();

          // 将上传文件信息作为消息发送
          setMessages(prev => [...prev, {
            id: Date.now(),
            session_id: 0,
            sender_type: 'teacher',
            message_type: 'file',
            text_content: `已上传文件: ${file.name}`,
            file_id: uploadRes.file_id,
            created_at: new Date().toISOString(),
          }]);

          // 用文件发 chat
          const chatRes = await aiService.chat({
            text: `分析文件内容`,
            file_ids: [uploadRes.file_id],
            mode,
          });
          if (chatRes.status === 'processing') {
            setActivePollId(chatRes.messageId);
            startPoll();
          }
        } catch (err: any) {
          Taro.hideLoading();
          Taro.showToast({ title: err.message || '上传失败', icon: 'none' });
        }
      },
    });
  };

  // 查看详情
  const goToDetail = (contentId: number) => {
    Taro.navigateTo({ url: `/pages/content/detail/index?id=${contentId}` });
  };

  const isThinking = activePollId !== null && pollStatus === 'polling';
  const formatTime = (dateStr?: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const h = `${date.getHours()}`.padStart(2, '0');
    const m = `${date.getMinutes()}`.padStart(2, '0');
    return `${h}:${m}`;
  };

  return (
    <View className="workspace-root">
      {/* 会话切换入口 */}
      <View className="workspace-topbar">
        <View className="workspace-topbar__conv" onClick={() => setShowConvDrawer(true)}>
          <Text>会话</Text>
        </View>
        <Text className="workspace-topbar__title">AI 工作台</Text>
        <View className="workspace-topbar__conv" onClick={() => setShowRecentDrawer(true)}>
          <Text>最近</Text>
        </View>
      </View>

      {/* 聊天消息流 */}
      <ScrollView
        className="workspace-chat"
        scrollY
        scrollWithAnimation
        scrollIntoView={scrollRef.current}
        enhanced
        showScrollbar={false}
      >
        {!pageReady ? (
          <View className="workspace-welcome">
            <Text className="workspace-welcome__icon">⏳</Text>
            <Text className="workspace-welcome__desc">加载中...</Text>
          </View>
        ) : messages.length === 0 && !isThinking ? (
          <View className="workspace-welcome">
            <Text className="workspace-welcome__icon">AI</Text>
            <Text className="workspace-welcome__title">欢迎使用 AI 工作台</Text>
            <Text className="workspace-welcome__desc">上传课件或输入文字开始备课</Text>
          </View>
        ) : (
          <>
            {messages.map(msg => {
          if (msg.sender_type === 'teacher') {
            return (
              <View key={msg.id} id={`msg-${msg.id}`}>
                <UserBubble
                  text={msg.text_content || ''}
                  files={msg.file_id ? [{ name: msg.text_content || '', id: msg.file_id }] : undefined}
                  time={formatTime(msg.created_at)}
                />
              </View>
            );
          }

          // AI 消息
          if (msg.preview || msg.message_type === 'action') {
            const preview = msg.preview;
            if (!preview) {
              return (
                <View key={msg.id} id={`msg-${msg.id}`}>
                  <AIBubble text={msg.text_content || ''} time={formatTime(msg.created_at)} />
                </View>
              );
            }
            return (
              <View key={msg.id} id={`msg-${msg.id}`}>
                <AIPreviewCard
                  type={preview.type || ''}
                  title={preview.title_candidate}
                  subject={preview.subject}
                  grade={preview.grade}
                  summary={preview.summary}
                  modules={preview.modules}
                  saved={msg.saved}
                  onEdit={() => setEditingCard({
                    msgId: msg.id,
                    data: {
                      type: preview.type || '',
                      title: preview.title_candidate || '',
                      subject: preview.subject || '',
                      grade: preview.grade || '',
                      modules: preview.modules || {},
                    }
                  })}
                  onConfirm={() => handleConfirm(msg.id, preview)}
                  onCancel={() => handleCancelCard(msg.id)}
                  onViewDetail={msg.actionId ? () => goToDetail(msg.actionId!) : undefined}
                  onUndo={msg.saved ? () => { setUndoMsgId(msg.id); setShowUndoSheet(true); } : undefined}
                  confirming={confirmingId === msg.id}
                />
              </View>
            );
          }

          // 思考中
          if (msg.id === activePollId && isThinking) {
            return (
              <View key={msg.id} id={`msg-${msg.id}`}>
                <AIBubble text="AI 正在分析内容" thinking time={formatTime(new Date().toISOString())} />
              </View>
            );
          }

          return (
            <View key={msg.id} id={`msg-${msg.id}`}>
              <AIBubble text={msg.text_content || ''} time={formatTime(msg.created_at)} />
            </View>
          );
        })}

        {/* 初次思考状态（还没消息时的占位） */}
        {isThinking && messages.length > 0 && messages[messages.length - 1]?.sender_type !== 'ai' && (
          <AIBubble text="AI 正在分析内容" thinking time={formatTime(new Date().toISOString())} />
        )}

        <View style={{ height: '120px' }} />
          </>
        )}
      </ScrollView>

      <View className="workspace-bottom">
        <ModeSelector value={mode} onChange={setMode} />
        <ChatInputBar
          value={input}
          onChange={setInput}
          onSend={handleSend}
          onAttachment={() => setShowAttachmentMenu(true)}
          sending={sending}
        />
      </View>

      {/* 附件菜单 */}
      <ActionSheet
        visible={showAttachmentMenu}
        items={[{ label: '上传文件', action: () => { setShowAttachmentMenu(false); handleUploadFile(); } }]}
        onClose={() => setShowAttachmentMenu(false)}
      />

      {/* 编辑弹层 */}
      <AIPreviewEditSheet
        visible={!!editingCard}
        data={editingCard?.data || { type: '', title: '', subject: '', grade: '' }}
        onSave={(data) => {
          if (editingCard) {
            setMessages(prev => prev.map(m =>
              m.id === editingCard.msgId && m.preview
                ? {
                    ...m,
                    preview: {
                      ...m.preview,
                      title_candidate: data.title,
                      subject: data.subject,
                      grade: data.grade,
                    }
                  }
                : m
            ));
          }
          setEditingCard(null);
        }}
        onClose={() => setEditingCard(null)}
      />

      {/* 撤销确认 */}
      <ActionSheet
        visible={showUndoSheet}
        items={[{
          label: '确认撤销（5分钟内有效）',
          action: () => {
            setShowUndoSheet(false);
            if (undoMsgId) handleUndo(undoMsgId);
          }
        }]}
        onClose={() => setShowUndoSheet(false)}
      />

      {/* 会话抽屉 */}
      <ConversationDrawer
        visible={showConvDrawer}
        conversations={conversations}
        activeId={activeConvId || undefined}
        loading={convLoading}
        onSelect={handleSelectConversation}
        onNew={handleNewConversation}
        onDelete={handleDeleteConversation}
        onClose={() => setShowConvDrawer(false)}
      />
      {/* 最近内容抽屉 */}
      <RecentContentDrawer
        visible={showRecentDrawer}
        teacherId={myTeacherId}
        onSelect={(id) => Taro.navigateTo({ url: `/pages/content/detail/index?id=${id}` })}
        onClose={() => setShowRecentDrawer(false)}
      />
    </View>
  );
}
