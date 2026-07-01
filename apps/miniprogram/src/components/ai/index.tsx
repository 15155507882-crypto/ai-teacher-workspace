import { View, Text, Input } from '@tarojs/components';
import { useState } from 'react';
import './ai.scss';

// ====== 模式选择器 ======
interface ModeSelectorProps {
  value: string;
  onChange: (mode: string) => void;
}

const MODES = [
  { key: 'auto', label: '自动识别' },
  { key: 'normal_chat', label: '普通聊天' },
  { key: 'personal_lesson', label: '个人备课' },
  { key: 'group_lesson', label: '集体备课' },
  { key: 'semester_plan', label: '学期计划' },
  { key: 'semester_summary', label: '学期总结' },
  { key: 'teaching_reflection', label: '教学反思' },
];

export function ModeSelector({ value, onChange }: ModeSelectorProps) {
  return (
    <View className="mode-selector">
      <View className="mode-selector__scroll">
        {MODES.map(m => (
          <View
            key={m.key}
            className={`mode-selector__item ${value === m.key ? 'mode-selector__item--active' : ''}`}
            onClick={() => onChange(m.key)}
          >
            <Text>{m.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ====== 用户消息气泡 ======
interface UserBubbleProps {
  text: string;
  files?: { name: string; id: number }[];
  time?: string;
}

export function UserBubble({ text, files, time }: UserBubbleProps) {
  return (
    <View className="chat-bubble chat-bubble--user">
      <View className="chat-bubble__wrap">
        <View className="chat-bubble__content">
          {text && <Text className="chat-bubble__text">{text}</Text>}
          {files && files.length > 0 && (
            <View className="chat-bubble__files">
              {files.map(f => (
                <View key={f.id} className="chat-bubble__file">
                  <Text>附件 {f.name}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        {time && <Text className="chat-bubble__time">{time} ✓</Text>}
      </View>
    </View>
  );
}

// ====== AI 消息气泡 ======
interface AIBubbleProps {
  text: string;
  thinking?: boolean;
  time?: string;
}

export function AIBubble({ text, thinking, time }: AIBubbleProps) {
  return (
    <View className="chat-bubble chat-bubble--ai">
      <View className="chat-bubble__avatar">
        <View className="chat-bubble__bot-face">
          <View className="chat-bubble__bot-eye chat-bubble__bot-eye--left" />
          <View className="chat-bubble__bot-eye chat-bubble__bot-eye--right" />
        </View>
      </View>
      {thinking ? (
        <View className="chat-bubble__wrap">
          <View className="chat-bubble__content chat-bubble__content--thinking">
            <View className="thinking-dots">
              <View className="thinking-dot" />
              <View className="thinking-dot" />
              <View className="thinking-dot" />
            </View>
            <Text className="chat-bubble__thinking-text">{text || 'AI 正在分析内容'}</Text>
          </View>
          {time && <Text className="chat-bubble__time">{time}</Text>}
        </View>
      ) : (
        <View className="chat-bubble__wrap">
          <View className="chat-bubble__content">
            <Text className="chat-bubble__text">{text}</Text>
          </View>
          {time && <Text className="chat-bubble__time">{time}</Text>}
        </View>
      )}
    </View>
  );
}

// ====== AI 预览卡 ======
interface AIPreviewCardProps {
  type: string;
  title?: string;
  subject?: string;
  grade?: string;
  summary?: string;
  modules?: Record<string, any>;
  attachments?: { name: string; id: number }[];
  saved?: boolean;
  onEdit?: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  onViewDetail?: () => void;
  onUndo?: () => void;
  viewDetailId?: number;
  confirming?: boolean;
}

import { TypeTag } from '../base';

export function AIPreviewCard(props: AIPreviewCardProps) {
  const {
    type, title, subject, grade, summary, modules,
    saved, onEdit, onConfirm, onCancel, onViewDetail, onUndo,
    viewDetailId, confirming,
  } = props;

  if (saved) {
    return (
      <View className="ai-preview-card ai-preview-card--saved">
        <View className="ai-preview-card__header">
          <TypeTag type={type} />
          <View className="tag tag--green"><Text>已保存</Text></View>
        </View>
        <View className="ai-preview-card__title"><Text>{title}</Text></View>
        <View className="ai-preview-card__meta">
          {subject && <Text className="ai-preview-card__meta-item">{subject}</Text>}
          {grade && <Text className="ai-preview-card__meta-item">{grade}</Text>}
        </View>
        <View className="ai-preview-card__actions">
          {viewDetailId && (
            <View className="btn btn--text" onClick={onViewDetail}>
              <Text>查看详情</Text>
            </View>
          )}
          {onUndo && (
            <View className="btn btn--text btn--danger" onClick={onUndo}>
              <Text>撤销</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View className="ai-preview-card">
      <View className="ai-preview-card__header">
        <TypeTag type={type} />
      </View>
      {title && <View className="ai-preview-card__title"><Text>{title}</Text></View>}
      <View className="ai-preview-card__meta">
        {subject && <Text className="ai-preview-card__meta-item">学科：{subject}</Text>}
        {grade && <Text className="ai-preview-card__meta-item">年级：{grade}</Text>}
      </View>
      {summary && (
        <View className="ai-preview-card__summary">
          <Text className="ai-preview-card__summary-label">AI 摘要：</Text>
          <Text className="ai-preview-card__summary-text">{summary}</Text>
        </View>
      )}
      {modules && (
        <View className="ai-preview-card__modules">
          {Object.entries(modules).map(([key, val]) => (
            <View key={key} className="ai-preview-card__module">
              <Text className="ai-preview-card__module-key">{key}：</Text>
              <Text className="ai-preview-card__module-val">{String(val)}</Text>
            </View>
          ))}
        </View>
      )}
      <View className="ai-preview-card__actions">
        {onEdit && (
          <View className="btn btn--outline" onClick={onEdit}>
            <Text>修改资料</Text>
          </View>
        )}
        {onConfirm && (
          <View className={`btn btn--primary ${confirming ? 'btn--loading' : ''}`} onClick={onConfirm}>
            <Text>{confirming ? '保存中...' : '确认保存'}</Text>
          </View>
        )}
        {onCancel && (
          <View className="btn btn--text" onClick={onCancel}>
            <Text>取消</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ====== 聊天输入栏 ======
interface ChatInputBarProps {
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  onAttachment?: () => void;
  sending?: boolean;
}

export function ChatInputBar({ value, onChange, onSend, onAttachment, sending }: ChatInputBarProps) {
  return (
    <View className="chat-input-bar">
      {onAttachment && (
        <View className="chat-input-bar__plus" onClick={onAttachment}>
          <Text className="chat-input-bar__plus-icon">+</Text>
        </View>
      )}
      <View className="chat-input-bar__input-wrap">
        <Input
          className="chat-input-bar__input"
          value={value}
          onInput={e => onChange(e.detail.value)}
              placeholder="输入内容"
          adjustPosition
          confirmType="send"
          onConfirm={onSend}
        />
      </View>
      <View
        className={`chat-input-bar__send ${!value.trim() || sending ? 'chat-input-bar__send--disabled' : ''}`}
        onClick={() => { if (value.trim() && !sending) onSend(); }}
      >
        <Text>{sending ? '...' : '发送'}</Text>
      </View>
    </View>
  );
}

// ====== AI 预览编辑弹层 ======
interface AIPreviewEditSheetProps {
  visible: boolean;
  data: {
    type: string;
    title: string;
    subject: string;
    grade: string;
    modules?: Record<string, string>;
  };
  onSave: (data: any) => void;
  onClose: () => void;
}

export function AIPreviewEditSheet({ visible, data, onSave, onClose }: AIPreviewEditSheetProps) {
  const [form, setForm] = useState({ ...data });
  if (!visible) return null;

  return (
    <View className="edit-sheet-mask" onClick={onClose}>
      <View className="edit-sheet" onClick={e => e.stopPropagation()}>
        <View className="edit-sheet__header">
          <Text className="edit-sheet__title">修改资料</Text>
          <View className="edit-sheet__close" onClick={onClose}><Text>✕</Text></View>
        </View>
        <View className="edit-sheet__body">
          <View className="edit-sheet__field">
            <Text className="edit-sheet__label">标题</Text>
            <Input
              className="edit-sheet__input"
              value={form.title}
              onInput={e => setForm({ ...form, title: e.detail.value })}
              placeholder="请输入标题"
            />
          </View>
          <View className="edit-sheet__field">
            <Text className="edit-sheet__label">学科</Text>
            <Input
              className="edit-sheet__input"
              value={form.subject}
              onInput={e => setForm({ ...form, subject: e.detail.value })}
              placeholder="请输入学科"
            />
          </View>
          <View className="edit-sheet__field">
            <Text className="edit-sheet__label">年级</Text>
            <Input
              className="edit-sheet__input"
              value={form.grade}
              onInput={e => setForm({ ...form, grade: e.detail.value })}
              placeholder="请输入年级"
            />
          </View>
        </View>
        <View className="edit-sheet__footer">
          <View className="btn btn--primary btn--full" onClick={() => onSave(form)}>
            <Text>保存修改</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
