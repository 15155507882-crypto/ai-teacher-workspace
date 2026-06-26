'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TopNav } from '@/components/top-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Msg {
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
  subject?: string;
  grade?: string;
}
interface WorkItem {
  id: number;
  title: string;
  content_type: string;
  created_at: string;
}

const typeBadge = (t: string) => {
  const m: Record<string, 'blue' | 'green' | 'orange' | 'purple'> = {
    personal_lesson: 'blue',
    reflection: 'orange',
    group_lesson: 'green',
    plan_summary: 'purple',
  };
  const l: Record<string, string> = {
    personal_lesson: '个人备课',
    reflection: '教学反思',
    group_lesson: '集体备课',
    plan_summary: '计划总结',
  };
  return <Badge variant={m[t] || 'default'}>{l[t] || t}</Badge>;
};

export default function WorkspacePage() {
  const router = useRouter();
  const [messages, setMessages] = useState<(Msg & { pending?: AIResult })[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [thinkingText, setThinkingText] = useState('');
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [teacher, setTeacher] = useState<any>(null);
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [workSearch, setWorkSearch] = useState('');
  const [workFilter, setWorkFilter] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const tk = () => localStorage.getItem('accessToken') || '';

  useEffect(() => {
    const t = localStorage.getItem('teacher');
    if (!t) {
      router.push('/login');
      return;
    }
    setTeacher(JSON.parse(t));
    loadHistory();
    loadWorks();
  }, []);

  const loadHistory = async () => {
    try {
      const s = await fetch('/api/ai/session', {
        headers: { Authorization: `Bearer ${tk()}` },
      }).then((r) => r.json());
      if (s.code === 0 && s.data) {
        const m = await fetch(`/api/ai/session/${s.data.id}/messages`, {
          headers: { Authorization: `Bearer ${tk()}` },
        }).then((r) => r.json());
        if (m.code === 0) setMessages(m.data || []);
      }
    } catch {}
  };

  const loadWorks = async () => {
    try {
      const r = await fetch(`/api/teachers/${teacher?.id || 1}/contents?size=200`, {
        headers: { Authorization: `Bearer ${tk()}` },
      }).then((r) => r.json());
      if (r.code === 0) setWorks(r.data.items || []);
    } catch {}
  };

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 5000);
  };

  const send = async () => {
    if (!input.trim()) return;
    const text = input;
    setInput('');
    setMessages((p) => [...p, { id: Date.now(), sender_type: 'teacher', text_content: text }]);
    setThinking(true);
    setThinkingText('正在分析...');
    try {
      const r = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
        body: JSON.stringify({ text }),
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
      if (count === 3) setThinkingText('正在识别...');
      else if (count === 6) setThinkingText('正在整理...');
      try {
        const r = await fetch(`/api/ai/recognition/${msgId}`, {
          headers: { Authorization: `Bearer ${tk()}` },
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
              pending: j.data.result,
            },
          ]);
        }
      } catch {}
    }, 1500);
  };

  const confirm = async (msgId: number, result: AIResult) => {
    const r = await fetch('/api/ai/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
      body: JSON.stringify({
        messageId: msgId,
        type: result.type,
        title: result.title_candidate,
        subject: result.subject,
        grade: result.grade,
        linkedContentId: result.extracted_entities?.recommended_lesson?.id,
      }),
    });
    const j = await r.json();
    if (j.data?.conflict) {
      setMessages((p) => [
        ...p,
        { id: Date.now(), sender_type: 'ai', text_content: j.data.message },
      ]);
      return;
    }
    if (j.code === 0) {
      setMessages((p) => p.map((m) => (m.id === msgId ? { ...m, pending: undefined } : m)));
      showToast('已保存');
      loadWorks();
    }
  };

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessages((p) => [...p, { id: Date.now(), sender_type: 'teacher', text_content: file.name }]);
    setThinking(true);
    setThinkingText('正在上传...');
    const form = new FormData();
    form.append('file', file);
    const up = await fetch('/api/ai/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tk()}` },
      body: form,
    }).then((r) => r.json());
    if (up.code !== 0) {
      setThinking(false);
      return;
    }
    const chat = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
      body: JSON.stringify({ file_id: up.data.file_id }),
    }).then((r) => r.json());
    if (chat.code === 0) pollResult(chat.data.messageId);
    else setThinking(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const filteredWorks = works.filter((w) => {
    if (workFilter && w.content_type !== workFilter) return false;
    if (workSearch && !w.title.includes(workSearch)) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <TopNav />
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Chat area 70% */}
        <div className="flex-[7] flex flex-col min-w-0 border-r border-slate-200">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {messages.length === 0 && !thinking && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="text-5xl mb-4">✨</div>
                <h3 className="text-lg font-semibold text-slate-700 mb-1">
                  副标题: 上传教学资料, AI 自动识别分类并生成备课、反思、计划与总结记录。 你好
                  {teacher?.name ? `，${teacher.name}` : ''}
                </h3>
                <p className="text-base text-slate-400">上传课件或输入文字开始备课</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.sender_type === 'teacher' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender_type === 'ai' ? (
                  <div className="flex gap-2 max-w-[85%]">
                    <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-xs shrink-0 mt-1">
                      ✨
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                      <p className="text-base text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {msg.text_content}
                      </p>
                      {msg.pending && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
                          <Button size="sm" onClick={() => confirm(msg.id, msg.pending!)}>
                            确认保存
                          </Button>
                          <Button size="sm" variant="outline">
                            修改
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[75%] bg-blue-600 text-white rounded-2xl rounded-tr-md px-4 py-2.5 text-sm">
                    {msg.text_content}
                  </div>
                )}
              </div>
            ))}
            {thinking && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-xs mt-1 animate-breathe">
                  ✨
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm text-base text-slate-400 flex items-center gap-2">
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-breathe" />
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-breathe"
                      style={{ animationDelay: '200ms' }}
                    />
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-breathe"
                      style={{ animationDelay: '400ms' }}
                    />
                  </span>
                  {thinkingText}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          {toast && (
            <div
              className={`mx-6 mb-2 rounded-full px-4 py-2 text-sm ${toast.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}
            >
              {toast.text}
            </div>
          )}
          <div className="border-t border-slate-200 bg-white px-6 py-4 flex items-center gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              className="text-slate-400 hover:text-blue-500"
            >
              📎
            </button>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={upload}
              accept=".doc,.docx,.ppt,.pptx,.pdf,.jpg,.jpeg,.png,.txt"
            />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="输入文字或上传文件..."
              className="flex-1 rounded-xl"
            />
            <Button onClick={send} disabled={!input.trim()}>
              发送
            </Button>
          </div>
        </div>

        {/* RIGHT: Work results 30% */}
        <div className="flex-[3] flex flex-col bg-white overflow-y-auto">
          <div className="p-4 border-b border-slate-100 space-y-3">
            <Input
              value={workSearch}
              onChange={(e) => setWorkSearch(e.target.value)}
              placeholder="搜索工作记录..."
              className="text-sm"
            />
            <div className="flex gap-1 flex-wrap">
              {['', 'personal_lesson', 'group_lesson', 'reflection', 'plan_summary'].map((k) => {
                const labels: Record<string, string> = {
                  '': '全部',
                  personal_lesson: '备课',
                  group_lesson: '集体',
                  reflection: '反思',
                  plan_summary: '计划',
                };
                return (
                  <button
                    key={k}
                    onClick={() => setWorkFilter(k)}
                    className={`px-2.5 py-1 rounded-full text-xs transition ${workFilter === k ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {labels[k]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex-1 p-3 space-y-2">
            {filteredWorks.map((w) => (
              <div
                key={w.id}
                className="p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 cursor-pointer transition"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-slate-700 truncate">{w.title}</p>
                  {typeBadge(w.content_type)}
                </div>
                <p className="text-xs text-slate-400">
                  {new Date(w.created_at).toLocaleString('zh-CN')}
                </p>
              </div>
            ))}
            {filteredWorks.length === 0 && (
              <p className="text-base text-slate-400 text-center py-8">
                {works.length === 0 ? '暂无工作记录' : '无匹配结果'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
