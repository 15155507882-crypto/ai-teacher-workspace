'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { WorkspaceContext } from './teacher-workspace';
import { AppButton } from './ui/base';

interface Message {
  id: number;
  sender_type: string;
  text_content: string;
  message_type?: string;
}
interface AIResult {
  type: string;
  title_candidate: string;
  nl_reply: string;
  next_action: string;
  need_lesson_link: boolean;
  extracted_entities: any;
  confidence: number;
  subject?: string;
  grade?: string;
  academic_year?: string;
  semester?: string;
}

export function AiChatCenter({ ctx, onSaved }: { ctx: WorkspaceContext; onSaved: () => void }) {
  const [messages, setMessages] = useState<(Message & { pendingResult?: AIResult })[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [thinkingText, setThinkingText] = useState('');
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [teacher, setTeacher] = useState<any>(null);
  const [mode, setMode] = useState('auto');
  const [quota, setQuota] = useState({ used: 0, limit: 100, remaining: 100 });
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const texts = ['正在阅读资料...', '正在分析内容...', '正在整理信息...', '马上就好...'];

  useEffect(() => {
    fetch('/api/ai/chat-quota', { headers: { Authorization: `Bearer ${ctx.token}` } })
      .then((r) => r.json())
      .then((j) => {
        if (j.code === 0) setQuota(j.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = localStorage.getItem('teacher');
    if (t) setTeacher(JSON.parse(t));
    loadHistory();
  }, [ctx]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), type === 'success' ? 5000 : 8000);
  };

  const loadHistory = async () => {
    try {
      const s = await fetch('/api/ai/session', {
        headers: { Authorization: `Bearer ${ctx.token}` },
      }).then((r) => r.json());
      if (s.code === 0 && s.data) {
        const m = await fetch(`/api/ai/session/${s.data.id}/messages`, {
          headers: { Authorization: `Bearer ${ctx.token}` },
        }).then((r) => r.json());
        if (m.code === 0) setMessages(m.data || []);
      }
    } catch {}
  };

  const send = async () => {
    if (!input.trim()) return;
    const text = input;
    setInput('');
    setMessages((p) => [...p, { id: Date.now(), sender_type: 'teacher', text_content: text }]);
    setThinking(true);
    setThinkingText(texts[0]);
    try {
      const r = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ctx.token}` },
        body: JSON.stringify({ text, mode }),
      });
      const j = await r.json();
      if (j.code === 0) pollResult(j.data.messageId);
      else {
        setThinking(false);
        showToast(j.message || '发送失败', 'error');
      }
    } catch {
      setThinking(false);
      showToast('网络错误', 'error');
    }
  };

  const pollResult = (msgId: number) => {
    let count = 0;
    const poll = setInterval(async () => {
      count++;
      if (count === 2) setThinkingText(texts[1]);
      else if (count === 4) setThinkingText(texts[2]);
      else if (count === 6) setThinkingText(texts[3]);
      try {
        const r = await fetch(`/api/ai/recognition/${msgId}`, {
          headers: { Authorization: `Bearer ${ctx.token}` },
        });
        const j = await r.json();
        if (j.code === 0 && j.data?.status === 'completed') {
          clearInterval(poll);
          setThinking(false);
          setMessages((p) => [
            ...p,
            {
              id: msgId,
              sender_type: 'ai',
              text_content: j.data.result.nl_reply,
              message_type: 'action',
              pendingResult: j.data.result,
            },
          ]);
        }
      } catch {}
    }, 1500);
  };

  const confirm = async (msgId: number, result: AIResult) => {
    try {
      const r = await fetch('/api/ai/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ctx.token}` },
        body: JSON.stringify({
          messageId: msgId,
          type: result.type,
          title: result.title_candidate,
          subject: result.subject,
          grade: result.grade,
          linkedContentId: result.extracted_entities?.recommended_lesson?.id,
          extractedEntities: result.extracted_entities,
        }),
      });
      const j = await r.json();
      if (j.data?.conflict) {
        setMessages((p) => [
          ...p,
          {
            id: Date.now(),
            sender_type: 'ai',
            text_content: j.data.message,
            message_type: 'action',
          },
        ]);
        return;
      }
      if (j.code === 0) {
        setMessages((p) => p.map((m) => (m.id === msgId ? { ...m, pendingResult: undefined } : m)));
        showToast('已保存');
        onSaved();
      } else showToast(j.message || '保存失败', 'error');
    } catch {
      showToast('网络错误', 'error');
    }
  };

  const undo = async (msgId: number) => {
    try {
      const r = await fetch(`/api/ai/undo/${msgId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${ctx.token}` },
      });
      const j = await r.json();
      if (j.code === 0) {
        setMessages((p) => p.map((m) => (m.id === msgId ? { ...m, pendingResult: undefined } : m)));
        showToast('已撤销');
        onSaved();
      }
    } catch {}
  };

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessages((p) => [
      ...p,
      { id: Date.now(), sender_type: 'teacher', text_content: `📎 ${file.name}` },
    ]);
    setThinking(true);
    setThinkingText('正在上传文件...');
    try {
      const form = new FormData();
      form.append('file', file);
      const up = await fetch('/api/ai/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${ctx.token}` },
        body: form,
      }).then((r) => r.json());
      if (up.code !== 0) {
        setThinking(false);
        showToast('上传失败', 'error');
        return;
      }
      const chat = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ctx.token}` },
        body: JSON.stringify({ file_id: up.data.file_id }),
      }).then((r) => r.json());
      if (chat.code === 0) pollResult(chat.data.messageId);
      else setThinking(false);
    } catch {
      setThinking(false);
      showToast('上传失败', 'error');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <main className="flex-1 flex flex-col min-w-0 h-full">
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
        {messages.length === 0 && !thinking && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-2xl bg-[var(--color-primary-50)] flex items-center justify-center text-4xl mb-5">
              ✨
            </div>
            <h3 className="text-page-title text-[var(--color-text-strong)] mb-2">
              你好{teacher?.name ? `，${teacher.name}` : ''}
            </h3>
            <p className="text-body text-[var(--color-text-muted)] mb-1">
              今天要整理什么备课资料？
            </p>
            <p className="text-caption text-[var(--color-text-muted)]">
              支持 Word · PPT · PDF · 图片 · 直接输入文字
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.sender_type === 'teacher' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
          >
            {msg.sender_type === 'ai' ? (
              <div className="flex gap-3 max-w-[680px]">
                <div className="w-8 h-8 rounded-full bg-[var(--color-primary-50)] flex items-center justify-center text-sm shrink-0 mt-0.5">
                  ✨
                </div>
                <div className="bg-[var(--color-ai-bubble)] border border-[var(--color-border)] rounded-2xl rounded-tl-md px-5 py-3.5 shadow-sm">
                  <p className="text-body text-[var(--color-text-normal)] whitespace-pre-wrap leading-relaxed">
                    {msg.text_content}
                  </p>
                  {msg.pendingResult && (
                    <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex gap-2 flex-wrap">
                      <AppButton size="sm" onClick={() => confirm(msg.id, msg.pendingResult!)}>
                        确认保存
                      </AppButton>
                      <AppButton size="sm" variant="secondary">
                        修改标题
                      </AppButton>
                      <AppButton size="sm" variant="ghost" onClick={() => undo(msg.id)}>
                        撤销
                      </AppButton>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="max-w-[580px] bg-[var(--color-user-bubble)] text-white rounded-2xl rounded-tr-md px-5 py-3 text-body leading-relaxed">
                {msg.text_content}
              </div>
            )}
          </div>
        ))}

        {thinking && (
          <div className="flex gap-3 max-w-[680px] animate-fade-in-up">
            <div className="w-8 h-8 rounded-full bg-[var(--color-primary-50)] flex items-center justify-center shrink-0 mt-0.5">
              <span className="animate-breathe text-sm">✨</span>
            </div>
            <div className="bg-[var(--color-ai-bubble)] border border-[var(--color-border)] rounded-2xl rounded-tl-md px-5 py-3.5 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="inline-flex gap-1">
                  <span
                    className="w-2 h-2 rounded-full bg-[var(--color-primary-500)] animate-breathe"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="w-2 h-2 rounded-full bg-[var(--color-primary-500)] animate-breathe"
                    style={{ animationDelay: '200ms' }}
                  />
                  <span
                    className="w-2 h-2 rounded-full bg-[var(--color-primary-500)] animate-breathe"
                    style={{ animationDelay: '400ms' }}
                  />
                </span>
                <span className="text-caption text-[var(--color-text-muted)]">{thinkingText}</span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {toast && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 animate-fade-in-up">
          <div
            className={`rounded-full px-5 py-2.5 shadow-lg text-sm flex items-center gap-2 ${
              toast.type === 'success'
                ? 'bg-[var(--color-success)] text-white'
                : 'bg-[var(--color-danger)] text-white'
            }`}
          >
            {toast.type === 'success' ? '✅' : '⚠️'} {toast.text}
          </div>
        </div>
      )}

      <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-surface)] px-8 py-5 shrink-0">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <button
            onClick={() => fileRef.current?.click()}
            className="w-10 h-10 flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-primary-500)] hover:bg-[var(--color-primary-50)] transition shrink-0"
            title="上传文件"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={upload}
            accept=".doc,.docx,.ppt,.pptx,.pdf,.jpg,.jpeg,.png,.txt"
          />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="输入文字或上传文件..."
            className="flex-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-5 py-3 text-body focus:border-[var(--color-primary-500)] focus:bg-[var(--color-bg-surface)] focus:outline-none transition"
          />
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="rounded-xl border bg-[var(--color-bg-muted)] px-3 py-3 text-sm text-[var(--color-text-muted)] focus:outline-none"
          >
            <option value="auto">自动识别</option>
            <option value="normal_chat">普通聊天</option>
            <option value="personal_lesson">个人备课</option>
            <option value="group_lesson">集体备课</option>
            <option value="semester_plan">学期计划</option>
            <option value="semester_summary">学期总结</option>
            <option value="teaching_reflection">教学反思</option>
          </select>
          <AppButton size="lg" onClick={send} disabled={!input.trim()}>
            发送
          </AppButton>
        </div>
        {mode === 'normal_chat' && (
          <p className="text-xs text-[var(--color-text-muted)] mt-2 text-center">
            今日普通聊天剩余 {quota.remaining}/{quota.limit} 次
          </p>
        )}
      </div>
    </main>
  );
}
