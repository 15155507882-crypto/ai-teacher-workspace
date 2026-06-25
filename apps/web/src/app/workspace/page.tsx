'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { AppButton } from '@/components/ui/base';

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
}

export default function WorkspacePage() {
  const router = useRouter();
  const [messages, setMessages] = useState<(Message & { pendingResult?: AIResult })[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [thinkingText, setThinkingText] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [teacher, setTeacher] = useState<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thinkingTexts = [
    '正在阅读资料...',
    '正在分析内容类型...',
    '正在整理信息...',
    '马上就好...',
  ];

  const getToken = () => localStorage.getItem('accessToken');

  useEffect(() => {
    const t = localStorage.getItem('teacher');
    if (!t) {
      router.push('/login');
      return;
    }
    setTeacher(JSON.parse(t));
    initWorkspace();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking, thinkingText]);

  const initWorkspace = async () => {
    try {
      const sessRes = await fetch('/api/ai/session', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const sJson = await sessRes.json();
      if (sJson.code === 0 && sJson.data) {
        const msgRes = await fetch(`/api/ai/session/${sJson.data.id}/messages`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const mJson = await msgRes.json();
        if (mJson.code === 0 && mJson.data) setMessages(mJson.data || []);
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
    startThinking();
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ text }),
    });
    const json = await res.json();
    if (json.code === 0) pollResult(json.data.messageId);
    else stopThinking();
  };

  const pollResult = (msgId: number) => {
    let pollCount = 0;
    const poll = setInterval(async () => {
      pollCount++;
      if (pollCount === 1) setThinkingText(thinkingTexts[1]);
      else if (pollCount === 3) setThinkingText(thinkingTexts[2]);
      else if (pollCount === 5) setThinkingText(thinkingTexts[3]);

      try {
        const res = await fetch(`/api/ai/recognition/${msgId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const json = await res.json();
        if (json.code === 0 && json.data?.status === 'completed') {
          clearInterval(poll);
          stopThinking();
          setMessages((prev) => [
            ...prev,
            {
              id: msgId,
              sender_type: 'ai',
              text_content: json.data.result.nl_reply,
              message_type: 'action',
              pendingResult: json.data.result,
            },
          ]);
        }
      } catch {
        /* retry */
      }
    }, 1500);
  };

  const startThinking = () => {
    setThinking(true);
    setThinkingText(thinkingTexts[0]);
  };
  const stopThinking = () => {
    setThinking(false);
    setThinkingText('');
  };

  const handleConfirm = async (msgId: number, result: AIResult) => {
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
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender_type: 'ai',
          text_content: json.data.message,
          message_type: 'action',
        },
      ]);
      return;
    }
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, pendingResult: undefined } : m))
    );
    setSuccessToast(json.data?.nl_reply || '已保存');
    setTimeout(() => setSuccessToast(null), 6000);
    initWorkspace();
  };

  const handleUndo = async (msgId: number) => {
    const res = await fetch(`/api/ai/undo/${msgId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const json = await res.json();
    if (json.code === 0) {
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, pendingResult: undefined } : m))
      );
      setSuccessToast('已撤销刚才的保存操作');
      setTimeout(() => setSuccessToast(null), 4000);
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
    startThinking();
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
      if (cjson.code === 0) pollResult(cjson.data.messageId);
      else stopThinking();
    } else stopThinking();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center text-[var(--color-text-muted)]">
        加载中...
      </div>
    );

  return (
    <AppShell
      detailPanel={
        <div className="p-5">
          <h3 className="text-section-title text-[var(--color-text-strong)] mb-6">资料详情</h3>
          <p className="text-body text-[var(--color-text-muted)]">
            点击左侧卡片查看备课资料详情，包括附件、版本和关联反思。
          </p>
        </div>
      }
    >
      <div className="flex flex-col h-full">
        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
          {messages.length === 0 && !thinking && (
            <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in-up">
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
                <div className="flex gap-3 max-w-[720px]">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-primary-50)] flex items-center justify-center text-sm shrink-0 mt-0.5">
                    ✨
                  </div>
                  <div className="bg-[var(--color-ai-bubble)] border border-[var(--color-border)] rounded-[var(--radius-xl)] rounded-tl-md px-5 py-3.5 shadow-sm">
                    <p className="text-body text-[var(--color-text-normal)] whitespace-pre-wrap leading-relaxed">
                      {msg.text_content}
                    </p>
                    {msg.pendingResult && (
                      <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex gap-2 flex-wrap">
                        <AppButton
                          size="sm"
                          onClick={() => handleConfirm(msg.id, msg.pendingResult!)}
                        >
                          ✅ 确认保存
                        </AppButton>
                        <AppButton size="sm" variant="secondary">
                          ✏️ 修改标题
                        </AppButton>
                        <AppButton size="sm" variant="ghost" onClick={() => handleUndo(msg.id)}>
                          ↩ 撤销
                        </AppButton>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="max-w-[620px] bg-[var(--color-user-bubble)] text-white rounded-[var(--radius-xl)] rounded-tr-md px-5 py-3 text-body leading-relaxed">
                  {msg.text_content}
                </div>
              )}
            </div>
          ))}

          {thinking && (
            <div className="flex gap-3 max-w-[720px] animate-fade-in-up">
              <div className="w-8 h-8 rounded-full bg-[var(--color-primary-50)] flex items-center justify-center shrink-0 mt-0.5">
                <span className="animate-breathe text-sm">✨</span>
              </div>
              <div className="bg-[var(--color-ai-bubble)] border border-[var(--color-border)] rounded-[var(--radius-xl)] rounded-tl-md px-5 py-3.5 shadow-sm">
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
                  <span className="text-caption text-[var(--color-text-muted)]">
                    {thinkingText}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 animate-fade-in-up">
            <div className="bg-[var(--color-success)] text-white text-sm rounded-full px-5 py-2.5 shadow-lg flex items-center gap-2">
              <span>✅</span> {successToast}
            </div>
          </div>
        )}

        {/* Composer */}
        <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-surface)] px-8 py-5">
          <div className="flex items-center gap-3 max-w-3xl mx-auto">
            <button
              onClick={() => fileInputRef.current?.click()}
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
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleUpload}
              accept=".doc,.docx,.ppt,.pptx,.pdf,.jpg,.jpeg,.png,.txt"
            />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="输入文字或上传文件..."
              className="flex-1 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-5 py-3 text-body text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary-500)] focus:bg-[var(--color-bg-surface)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary-500)] transition-all"
            />
            <AppButton size="lg" onClick={sendMessage} disabled={!input.trim()}>
              发送
            </AppButton>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
