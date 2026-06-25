'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { AppButton, AppCard } from '@/components/ui/base';

interface Message {
  id: number;
  sender_type: string;
  text_content: string;
  message_type?: string;
}
interface AIResult {
  type: string;
  title_candidate: string;
  subject?: string;
  grade?: string;
  nl_reply: string;
  next_action: string;
  need_lesson_link: boolean;
  extracted_entities: any;
  confidence: number;
}

export default function WorkspacePage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [pendingResult, setPendingResult] = useState<{ msgId: number; result: AIResult } | null>(
    null
  );
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [detailContent, setDetailContent] = useState<any>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getToken = () => localStorage.getItem('accessToken');

  useEffect(() => {
    if (!getToken()) router.push('/login');
    else initWorkspace();
  }, []);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking, pendingResult, successMsg]);

  const initWorkspace = async () => {
    try {
      const sessRes = await fetch('/api/ai/session', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const sJson = await sessRes.json();
      if (sJson.code === 0 && sJson.data) {
        setSessionId(sJson.data.id);
        const msgRes = await fetch(`/api/ai/session/${sJson.data.id}/messages`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const mJson = await msgRes.json();
        if (mJson.code === 0) setMessages(mJson.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const text = input;
    setInput('');
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), sender_type: 'teacher', text_content: text },
    ]);
    setThinking(true);
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ text }),
    });
    const json = await res.json();
    if (json.code === 0) {
      setSessionId(json.data.sessionId);
      pollResult(json.data.messageId);
    } else {
      setThinking(false);
    }
  };

  const pollResult = (msgId: number) => {
    const poll = setInterval(async () => {
      const res = await fetch(`/api/ai/recognition/${msgId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.code === 0 && json.data?.status === 'completed') {
        clearInterval(poll);
        setThinking(false);
        setPendingResult({ msgId, result: json.data.result });
        initWorkspace();
      }
    }, 1500);
  };

  const handleConfirm = async () => {
    if (!pendingResult) return;
    const { msgId, result } = pendingResult;
    const res = await fetch('/api/ai/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
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
    const json = await res.json();
    if (json.data?.conflict) {
      setSuccessMsg(json.data.message);
      return;
    }
    setPendingResult(null);
    setSuccessMsg(json.data?.nl_reply || '已保存');
    setTimeout(() => setSuccessMsg(null), 8000);
    initWorkspace();
  };

  const handleUndo = async () => {
    if (!pendingResult) return;
    const res = await fetch(`/api/ai/undo/${pendingResult.msgId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const json = await res.json();
    if (json.code === 0) {
      setPendingResult(null);
      setSuccessMsg('已撤销');
      setTimeout(() => setSuccessMsg(null), 4000);
      initWorkspace();
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), sender_type: 'teacher', text_content: `📎 ${file.name}` },
    ]);
    setThinking(true);
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/ai/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: form,
    });
    const json = await res.json();
    if (json.code === 0) {
      const cres = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ file_id: json.data.file_id }),
      });
      const cjson = await cres.json();
      if (cjson.code === 0) {
        setSessionId(cjson.data.sessionId);
        pollResult(cjson.data.messageId);
      } else setThinking(false);
    } else setThinking(false);
  };

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-[var(--color-text-muted)]">加载中...</p>
      </div>
    );

  const detailPanel = (
    <div className="p-5">
      <h3 className="text-sm font-semibold text-[var(--color-text-strong)] mb-4">资料详情</h3>
      {detailContent ? (
        <div className="space-y-4">
          <div>
            <p className="text-xs text-[var(--color-text-muted)]">标题</p>
            <p className="text-sm font-medium">{detailContent.title}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)]">点击左侧资料卡片查看详情</p>
      )}
    </div>
  );

  return (
    <AppShell detailPanel={detailPanel}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="h-[var(--layout-topbar)] flex items-center px-6 border-b border-[var(--color-border)] bg-[var(--color-bg-surface)] shrink-0">
          <h2 className="text-base font-semibold text-[var(--color-text-strong)]">AI 工作台</h2>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {messages.length === 0 && !thinking && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-5xl mb-4">👋</div>
              <h3 className="text-lg font-semibold text-[var(--color-text-strong)] mb-1">
                欢迎使用 AI 备课助手
              </h3>
              <p className="text-sm text-[var(--color-text-muted)] mb-2">
                上传课件或输入文字，我会帮你识别、整理和归档
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                支持 Word · PPT · PDF · 图片 · 纯文本
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.sender_type === 'teacher' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                  msg.sender_type === 'teacher'
                    ? 'bg-[var(--color-primary-600)] text-white rounded-br-md'
                    : 'bg-[var(--color-bg-muted)] text-[var(--color-text-normal)] rounded-bl-md'
                }`}
              >
                {msg.text_content}
              </div>
            </div>
          ))}

          {thinking && (
            <div className="flex justify-start">
              <div className="bg-[var(--color-bg-muted)] rounded-2xl rounded-bl-md px-4 py-3 text-sm text-[var(--color-text-muted)]">
                <span className="inline-flex gap-1">
                  <span
                    className="w-2 h-2 rounded-full bg-[var(--color-primary-500)] animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="w-2 h-2 rounded-full bg-[var(--color-primary-500)] animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="w-2 h-2 rounded-full bg-[var(--color-primary-500)] animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                </span>
              </div>
            </div>
          )}

          {pendingResult && (
            <div className="flex justify-start">
              <AppCard className="p-4 max-w-[80%] space-y-3">
                <p className="text-sm text-[var(--color-text-normal)] whitespace-pre-wrap">
                  {pendingResult.result.nl_reply}
                </p>
                <div className="flex gap-2 flex-wrap">
                  <AppButton size="sm" onClick={handleConfirm}>
                    ✅ 确认保存
                  </AppButton>
                  <AppButton size="sm" variant="secondary">
                    ✏️ 修改标题
                  </AppButton>
                  <AppButton size="sm" variant="ghost" onClick={handleUndo}>
                    ↩ 撤销
                  </AppButton>
                </div>
              </AppCard>
            </div>
          )}

          {successMsg && (
            <div className="flex justify-center">
              <div className="bg-[var(--color-success)]/10 text-[var(--color-success)] text-xs rounded-full px-4 py-1.5">
                {successMsg}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-surface)] px-6 py-4 shrink-0">
          <div className="flex items-center gap-2 max-w-3xl mx-auto">
            <label className="cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-primary-500)] text-xl shrink-0">
              📎
              <input
                type="file"
                className="hidden"
                onChange={handleUpload}
                accept=".doc,.docx,.ppt,.pptx,.pdf,.jpg,.jpeg,.png,.txt"
              />
            </label>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="输入文字或上传文件..."
              className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-4 py-2.5 text-sm focus:border-[var(--color-primary-500)] focus:bg-[var(--color-bg-surface)] focus:outline-none transition"
            />
            <AppButton onClick={sendMessage} disabled={!input.trim()}>
              发送
            </AppButton>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
