'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TopNav } from '@/components/top-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Attachment {
  id: number;
  name: string;
  uploading: boolean;
  file?: File;
}
interface Msg {
  id: number;
  sender: 'user' | 'ai';
  text: string;
  attachments?: string[];
  result?: any;
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
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('auto');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [manualAdd, setManualAdd] = useState<{ type: string; open: boolean; title: string } | null>(null);
  const [thinking, setThinking] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [linkedLessonId, setLinkedLessonId] = useState<number | null>(null);
  const [workSearch, setWorkSearch] = useState('');
  const [workFilter, setWorkFilter] = useState('');
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [teacher, setTeacher] = useState<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const steps = [
    '正在上传文件...',
    '正在解析文件内容...',
    '正在识别教学资料类型...',
    '正在提取结构化信息...',
    '识别完成',
  ];

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const loadHistory = async () => {
    try {
      const s = await fetch('/api/ai/session', {
        headers: { Authorization: `Bearer ${tk()}` },
      }).then((r) => r.json());
      if (s.code === 0 && s.data) {
        const m = await fetch(`/api/ai/session/${s.data.id}/messages`, {
          headers: { Authorization: `Bearer ${tk()}` },
        }).then((r) => r.json());
        if (m.code === 0)
          setMessages(
            m.data?.map((x: any) => ({
              id: x.id,
              sender: x.sender_type === 'teacher' ? 'user' : 'ai',
              text: x.text_content || '',
            })) || []
          );
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

  const handleAddFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      setAttachments((prev) => [
        ...prev,
        { id: Date.now() + i, name: f.name, uploading: false, file: f },
      ]);
    }
    if (fileRef.current) fileRef.current.value = '';
    setShowPicker(false);
  };

  const removeAttachment = (id: number) =>
    setAttachments((prev) => prev.filter((a) => a.id !== id));

  const send = async () => {
    if (!input.trim() && attachments.length === 0) return;
    const text = input;
    setInput('');
    const atts = [...attachments];
    setAttachments([]);

    const attachNames = atts.map((a) => a.name).join(', ');
    const displayText = text + (attachNames ? (text ? '\n' : '') + '📎 ' + attachNames : '');
    setMessages((prev) => [...prev, { id: Date.now(), sender: 'user', text: displayText }]);

    setThinking(true);
    setThinkingStep(0);

    try {
      // Upload files first
      let fileId: number | undefined;
      for (const a of atts) {
        if (!a.file) continue;
        setThinkingStep(0);
        const form = new FormData();
        form.append('file', a.file);
        const up = await fetch('/api/ai/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${tk()}` },
          body: form,
        }).then((r) => r.json());
        if (up.code === 0) fileId = Number(up.data.file_id);
      }

      setThinkingStep(1);
      const chat = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
        body: JSON.stringify({ text, file_id: fileId, mode }),
      }).then((r) => r.json());
      if (chat.code === 0) pollResult(chat.data.messageId);
      else {
        setThinking(false);
      }
    } catch {
      setThinking(false);
    }
  };

  const pollResult = (msgId: number) => {
    let count = 0;
    const poll = setInterval(async () => {
      count++;
      if (count === 2) setThinkingStep(2);
      else if (count === 4) setThinkingStep(3);
      else if (count === 6) setThinkingStep(4);
      try {
        const r = await fetch(`/api/ai/recognition/${msgId}`, {
          headers: { Authorization: `Bearer ${tk()}` },
        });
        const j = await r.json();
        if (j.code === 0 && j.data?.status === 'completed') {
          clearInterval(poll);
          setThinking(false);
          const result = j.data.result;
          setMessages((prev) => [
            ...prev,
            { id: msgId, sender: 'ai', text: result.nl_reply, result },
          ]);
        }
      } catch {}
    }, 1200);
  };

  const TYPE_LABEL: Record<string, string> = {
    personal_lesson: '个人备课', reflection: '教学反思', teaching_reflection: '教学反思',
    group_lesson: '集体备课', plan_summary: '计划总结',
    semester_plan: '学期计划', semester_summary: '学期总结',
  };

  const normalizeType = (t: string) => {
    if (t === 'teaching_reflection') return 'reflection';
    return t;
  };

  const confirm = async (msgId: number, result: any) => {
    const apiMsgId = Number(msgId);
    const type = normalizeType(result.type);
    const title = result.title_candidate || result.title || '未命名内容';
    console.log('[AI-CONFIRM-PAYLOAD]', { messageId: apiMsgId, type, title, subject: result.subject, grade: result.grade });
    if (!apiMsgId || apiMsgId <= 0) {
      setMessages(prev => [...prev, { id: Date.now(), sender: 'ai', text: '识别结果异常：缺少消息ID，请重新识别。' }]);
      return;
    }
    if (!title || title === '未命名内容') {
      setMessages(prev => [...prev, { id: Date.now(), sender: 'ai', text: '请先填写标题。' }]);
      return;
    }
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, saving: true } : m));
    try {
      const r = await fetch('/api/ai/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
        body: JSON.stringify({
          messageId: apiMsgId, type, title,
          subject: result.subject, grade: result.grade,
          linkedContentId: linkedLessonId || result.extracted_entities?.recommended_lesson?.id,
        }),
      });
      const j = await r.json();
      if (j.data?.conflict) {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, saving: false } : m));
        setMessages(prev => [...prev, { id: Date.now(), sender: 'ai', text: j.data.message }]);
        return;
      }
      if (j.code === 0) {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, result: undefined, saved: true } : m));
        loadWorks();
      } else {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, saving: false } : m));
        setMessages(prev => [...prev, { id: Date.now(), sender: 'ai', text: '保存失败: ' + (j.message || '未知错误') }]);
      }
    } catch {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, saving: false } : m));
    }
  };

  const modifyType = (msgId: number, newType: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId && m.result) {
        const labels: Record<string,string> = { personal_lesson:'个人备课',reflection:'教学反思',group_lesson:'集体备课',plan_summary:'计划总结' };
        return { ...m, result: { ...m.result, type: newType, title_candidate: (labels[newType]||newType) + ': ' + (m.result.title_candidate||'') } };
      }
      return m;
    }));
  };

  const saveManual = async () => {
    if (!manualAdd || !manualAdd.title.trim()) return;
    try {
      const r = await fetch('/api/ai/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
        body: JSON.stringify({
          messageId: 0,
          type: manualAdd.type,
          title: manualAdd.title.trim(),
        }),
      });
      const j = await r.json();
      if (j.code === 0) {
        setManualAdd(null);
        loadWorks();
      } else {
        alert(j.message || '保存失败');
      }
    } catch {
      alert('保存失败');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const filteredWorks = works.filter((w) => {
    if (workFilter && w.content_type !== workFilter) return false;
    if (workSearch && !w.title.includes(workSearch)) return false;
    return true;
  });

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      <TopNav />
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Chat 70% */}
        <div className="flex-[7] flex flex-col min-w-0 border-r border-slate-200">
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-[860px] mx-auto px-6 py-6 space-y-4">
              {messages.length === 0 && !thinking && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="text-5xl mb-4">✨</div>
                  <h3 className="text-lg font-semibold text-slate-700 mb-1">
                    你好{teacher?.name ? `，${teacher.name}` : ''}
                  </h3>
                  <p className="text-sm text-slate-400">上传课件或输入文字开始备课</p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'ai' ? (
                    <div className="flex gap-2.5 max-w-[85%]">
                      <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-xs shrink-0 mt-1">
                        ✨
                      </div>
                      <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-md px-5 py-3.5 shadow-sm min-w-0">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed">
                          {msg.text}
                        </p>
                        {msg.result && msg.result.isBusinessScene !== false && ['personal_lesson','reflection','group_lesson','plan_summary'].includes(msg.result.type) && (
                          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                            <div className="flex flex-wrap gap-2 text-xs">
                              {[
                                {
                                  k: 'type',
                                  v: TYPE_LABEL[normalizeType(msg.result.type)] || msg.result.type,
                                  l: '分类',
                                },
                                { k: 'title_candidate', v: msg.result.title_candidate, l: '标题' },
                                { k: 'subject', v: msg.result.subject, l: '学科' },
                                { k: 'grade', v: msg.result.grade, l: '年级' },
                              ].map(
                                (f) =>
                                  f.v && (
                                    <span
                                      key={f.k}
                                      className="bg-blue-50 text-blue-700 rounded-lg px-2.5 py-1"
                                    >
                                      {f.l}: {f.v}
                                    </span>
                                  )
                              )}
                            </div>
                            <div className="flex gap-2 flex-wrap items-center">
                              {msg.saved ? (
                                <span className="text-sm text-green-600">✅ 已保存</span>
                              ) : (
                                <Button size="sm" onClick={() => confirm(msg.id, msg.result)} disabled={(msg as any).saving}>
                                  {(msg as any).saving ? '保存中...' : '确认保存'}
                                </Button>
                              )}
                              <select
                                value={normalizeType(msg.result.type)}
                                onChange={e => modifyType(msg.id, normalizeType(e.target.value))}
                                className="text-xs rounded border bg-white px-2 py-1.5 text-slate-600"
                              >
                                <option value="personal_lesson">个人备课</option>
                                <option value="reflection">教学反思</option>
                                <option value="group_lesson">集体备课</option>
                                <option value="plan_summary">计划总结</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-[75%] bg-blue-600 text-white rounded-2xl rounded-tr-md px-5 py-3 text-sm break-words leading-relaxed">
                      {msg.text}
                    </div>
                  )}
                </div>
              ))}

              {thinking && (
                <div className="flex gap-2.5 max-w-[85%]">
                  <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-xs mt-1 animate-breathe">
                    ✨
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-md px-5 py-3.5 shadow-sm">
                    <div className="flex items-center gap-2.5">
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
                      <span className="text-sm text-slate-500">{steps[thinkingStep]}</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Composer */}
          <div className="border-t border-slate-200 bg-white">
            <div className="max-w-[860px] mx-auto px-6 py-4">
              {/* Attachments preview */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {attachments.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs"
                    >
                      <span>{a.uploading ? '⏳' : '📄'}</span>
                      <span className="max-w-[120px] truncate text-slate-600">{a.name}</span>
                      <button
                        onClick={() => removeAttachment(a.id)}
                        className="text-slate-400 hover:text-red-500 ml-1"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="relative flex items-end gap-2 bg-white border border-slate-200 rounded-[20px] px-4 py-2 shadow-sm focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition">
                {/* + Button with popover */}
                <div className="relative">
                  <button
                    onClick={() => setShowPicker(!showPicker)}
                    className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-blue-500 transition shrink-0 mb-0.5"
                    title="添加附件"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                  {showPicker && (
                    <div className="absolute bottom-full left-0 mb-2 w-40 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-10">
                      <label className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer">
                        <span>📄</span> 添加附件
                        <input
                          type="file"
                          className="hidden"
                          multiple
                          accept=".doc,.docx,.ppt,.pptx,.pdf,.jpg,.jpeg,.png,.webp"
                          onChange={handleAddFile}
                          ref={fileRef}
                        />
                      </label>
                    </div>
                  )}
                </div>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入文字或上传文件..."
                  rows={1}
                  className="flex-1 resize-none border-0 bg-transparent py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none min-h-[24px] max-h-[120px]"
                />
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="text-xs rounded-lg border bg-slate-50 px-2 py-2 text-slate-500 shrink-0"
                >
                  <option value="auto">自动识别</option>
                  <option value="normal_chat">普通聊天</option>
                  <option value="personal_lesson">个人备课</option>
                  <option value="group_lesson">集体备课</option>
                  <option value="semester_plan">学期计划</option>
                  <option value="semester_summary">学期总结</option>
                  <option value="teaching_reflection">教学反思</option>
                </select>
                <Button
                  size="sm"
                  onClick={send}
                  disabled={!input.trim() && attachments.length === 0}
                  className="mb-0.5"
                >
                  发送
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Work results 30% */}
        <div className="flex-[3] flex flex-col bg-white overflow-y-auto">
          <div className="p-4 border-b border-slate-100 space-y-3">
            <div className="flex gap-1 flex-wrap">
              <span className="text-xs text-slate-400 py-1 mr-1">手动录入：</span>
              {[
                { k: 'personal_lesson', label: '📖 个人备课' },
                { k: 'group_lesson', label: '👥 集体备课' },
                { k: 'reflection', label: '📝 教学反思' },
                { k: 'plan_summary', label: '📋 计划总结' },
              ].map((item) => (
                <button
                  key={item.k}
                  onClick={() => {
                    const title = prompt(`新增${item.label}，请输入标题：`);
                    if (!title) return;
                    setManualAdd({ type: item.k, open: true, title });
                  }}
                  className="px-2 py-1 rounded text-xs bg-blue-50 text-blue-600 hover:bg-blue-100"
                >
                  + {item.label.slice(2)}
                </button>
              ))}
            </div>
            <Input
              value={workSearch}
              onChange={(e) => setWorkSearch(e.target.value)}
              placeholder="搜索工作记录..."
              className="text-sm"
            />
            <div className="flex gap-1 flex-wrap">
              {['', 'personal_lesson', 'group_lesson', 'reflection', 'plan_summary'].map((k) => {
                const l: Record<string, string> = {
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
                    {l[k]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex-1 p-3 space-y-2">
            {filteredWorks.map((w) => (
              <div
                key={w.id}
                className={`p-3 rounded-xl border transition cursor-pointer ${highlightId === w.id ? 'border-blue-400 bg-blue-50' : 'border-slate-100 hover:border-blue-200 hover:bg-blue-50/30'}`}
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
              <p className="text-sm text-slate-400 text-center py-8">
                {works.length === 0 ? '暂无工作记录' : '无匹配结果'}
              </p>
            )}
          </div>
        </div>
        {/* 手动录入弹窗 */}
        {manualAdd?.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6">
              <h3 className="text-lg font-semibold mb-4">
                手动录入 — {{ personal_lesson: '个人备课', group_lesson: '集体备课', reflection: '教学反思', plan_summary: '计划总结' }[manualAdd.type]}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">标题</label>
                  <input value={manualAdd.title} onChange={e => setManualAdd({...manualAdd, title: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setManualAdd(null)} className="px-4 py-2 text-sm border rounded-lg">取消</button>
                <button onClick={saveManual} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">保存</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
