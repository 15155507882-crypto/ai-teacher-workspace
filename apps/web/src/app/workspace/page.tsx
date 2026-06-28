'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TopNav } from '@/components/top-nav';
import { ConversationSidebar } from '@/components/conversation-sidebar';
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
  const [manualAdd, setManualAdd] = useState<{
    type: string;
    open: boolean;
    title: string;
    date?: string;
    file?: File;
  } | null>(null);
  const [manualFileRef] = useState<{ current: HTMLInputElement | null }>({ current: null });
  const [convId, setConvId] = useState<number | null>(null);
  const [thinking, setThinking] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [linkedLessonId, setLinkedLessonId] = useState<number | null>(null);
  const [workSearch, setWorkSearch] = useState('');
  const [workFilter, setWorkFilter] = useState('');
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [selectedWorkId, setSelectedWorkId] = useState<number | null>(null);
  const [workDetail, setWorkDetail] = useState<any>(null);
  const [workDetailLoading, setWorkDetailLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [plComments, setPlComments] = useState<any[]>([]);
  const [reflectionText, setReflectionText] = useState<string>('');
  const [commentText, setCommentText] = useState('');
  const [commentFile, setCommentFile] = useState<File | null>(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [teacher, setTeacher] = useState<any>(null);
  const [editingCards, setEditingCards] = useState<Set<number>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const commentFileRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  const steps = ['正在分析...', '正在处理...', '马上就好...'];

  const tk = () => (typeof window !== 'undefined' ? localStorage.getItem('accessToken') || '' : '');

  useEffect(() => {
    const t = localStorage.getItem('teacher');
    if (!t) {
      router.push('/login');
      return;
    }
    setTeacher(JSON.parse(t));
    loadHistory();
    loadWorks();
    // Load today's conversation
    fetch('/api/ai/conversations/today', {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.data) setConvId(j.data.id);
      })
      .catch(() => {});
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

  const loadWorkDetail = async (id: number) => {
    setSelectedWorkId(id);
    setShowDeleteConfirm(false);
    setWorkDetailLoading(true);
    setComments([]);
    setPlComments([]);
    setCommentText('');
    try {
      const r = await fetch(`/api/contents/${id}`, {
        headers: { Authorization: `Bearer ${tk()}` },
      }).then((r) => r.json());
      if (r.code === 0) {
        setWorkDetail(r.data);
        // 集体备课/个人备课：加载评论
        if (r.data.content_type === 'group_lesson') {
          const cr = await fetch(`/api/group-lessons/${id}/comments`, {
            headers: { Authorization: `Bearer ${tk()}` },
          }).then((r) => r.json());
          setComments(cr?.data?.items || cr?.items || []);
        } else if (r.data.content_type === 'personal_lesson') {
          const cr = await fetch(`/api/personal-lessons/${id}/comments`, {
            headers: { Authorization: `Bearer ${tk()}` },
          }).then((r) => r.json());
          setPlComments(cr?.data?.items || cr?.items || []);
          // 同时加载该备课关联的教学反思
          try {
            const refRes = await fetch(
              `/api/teachers/${teacher?.id || 1}/contents?content_type=reflection&size=50`,
              {
                headers: { Authorization: `Bearer ${tk()}` },
              }
            ).then((r) => r.json());
            const reflections = refRes?.data?.items || refRes?.items || [];
            // 查找关联到此备课的反思
            const linked = reflections.find(
              (ref: any) => ref.linked_content_id === id || ref.lesson_content_id === id
            );
            setReflectionText(linked?.summary || linked?.reflection_text || '');
          } catch {
            setReflectionText('');
          }
        }
      } else setWorkDetail(null);
    } catch {
      setWorkDetail(null);
    } finally {
      setWorkDetailLoading(false);
    }
  };

  const deleteWork = async (id: number) => {
    setDeletingId(id);
    try {
      const r = await fetch(`/api/contents/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
        body: JSON.stringify({ reason: '教师删除' }),
      }).then((r) => r.json());
      if (r.code === 0) {
        setSelectedWorkId(null);
        setWorkDetail(null);
        setShowDeleteConfirm(false);
        loadWorks();
      }
    } catch {
    } finally {
      setDeletingId(null);
    }
  };

  const submitComment = async () => {
    if (submittingRef.current) return; // 防重复提交
    if ((!commentText.trim() && !commentFile) || !selectedWorkId || !workDetail) return;
    submittingRef.current = true;
    setCommentSubmitting(true);
    // 立即快照并清空输入，防止连点
    const textToSend = commentText.trim();
    const fileToSend = commentFile;
    setCommentText('');
    setCommentFile(null);
    if (commentFileRef.current) commentFileRef.current.value = '';
    try {
      let fileId: number | undefined;
      if (fileToSend) {
        const form = new FormData();
        form.append('file', fileToSend);
        const up = await fetch('/api/ai/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${tk()}` },
          body: form,
        }).then((r) => r.json());
        if (up.code === 0) fileId = Number(up.data.file_id);
      }
      const apiPath =
        workDetail.content_type === 'personal_lesson'
          ? `/api/personal-lessons/${selectedWorkId}/comments`
          : `/api/group-lessons/${selectedWorkId}/comments`;
      const r = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
        body: JSON.stringify({ comment_text: textToSend || null, file_id: fileId }),
      }).then((r) => r.json());
      if (r.id) {
        const newComment = {
          ...r,
          teacher_name: teacher?.name || '我',
          comment_text: textToSend || null,
          file_name: fileToSend?.name || null,
        };
        if (workDetail.content_type === 'personal_lesson') {
          setPlComments((prev) => [...prev, newComment]);
        } else {
          setComments((prev) => [...prev, newComment]);
        }
      }
    } catch {
    } finally {
      setCommentSubmitting(false);
      submittingRef.current = false;
    }
  };

  const deleteComment = async (commentId: number, isPersonal: boolean) => {
    if (!confirm('确认删除这条留言？')) return;
    const apiPath = isPersonal
      ? `/api/personal-lessons/comments/${commentId}`
      : `/api/group-lessons/comments/${commentId}`;
    try {
      const r = await fetch(apiPath, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tk()}` },
      }).then((r) => r.json());
      if (r.message === '删除成功') {
        if (isPersonal) {
          setPlComments((prev) => prev.filter((c) => c.id !== commentId));
        } else {
          setComments((prev) => prev.filter((c) => c.id !== commentId));
        }
      } else {
        alert(r.message || '删除失败');
      }
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
      // Upload files first - collect all file IDs
      let fileId: number | undefined;
      const fileIds: number[] = [];
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
        if (up.code === 0) {
          const fid = Number(up.data.file_id);
          fileId = fid; // keep first for backward compat
          fileIds.push(fid);
        }
      }

      setThinkingStep(1);
      const chat = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
        body: JSON.stringify({ text, file_id: fileIds[0], file_ids: fileIds, mode }),
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
      if (count === 2) setThinkingStep(1);
      else if (count === 5) setThinkingStep(2);
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
    personal_lesson: '个人备课',
    reflection: '教学反思',
    teaching_reflection: '教学反思',
    group_lesson: '集体备课',
    plan_summary: '计划总结',
    semester_plan: '学期计划',
    semester_summary: '学期总结',
  };

  const normalizeType = (t: string) => {
    if (t === 'teaching_reflection' || t === 'suggest_reflection') return 'reflection';
    return t;
  };

  const confirm = async (msgId: number, result: any) => {
    const apiMsgId = Number(msgId);
    const type = normalizeType(result.type);
    const title = result.metadata_title || result.title_candidate || result.title || '';
    console.log('[AI-CONFIRM-PAYLOAD]', {
      messageId: apiMsgId,
      type,
      title,
      subject: result.subject,
      grade: result.grade,
      modules: result.modules,
    });
    if (!apiMsgId || apiMsgId <= 0) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), sender: 'ai', text: '识别结果异常：缺少消息ID，请重新识别。' },
      ]);
      return;
    }
    if (!title || title === '未命名内容' || title === '未识别到标题，请老师填写') {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), sender: 'ai', text: '请先填写标题后再保存。' },
      ]);
      return;
    }
    // Build body_text from modules for saving
    const modulesText = (result.modules || [])
      .filter((m: any) => m.content)
      .map((m: any) => `${m.label}：${m.content}`)
      .join('\n');
    setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, saving: true } : m)));
    try {
      const r = await fetch('/api/ai/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
        body: JSON.stringify({
          messageId: apiMsgId,
          type,
          title,
          subject: result.subject,
          grade: result.grade,
          linkedContentId: linkedLessonId || result.extracted_entities?.recommended_lesson?.id,
          fileIds: result.fileIds || (result.fileId ? [result.fileId] : []),
          extractedEntities: {
            ...result.extracted_entities,
            body_text: modulesText || result.summary || '',
            chapter: result.extracted_entities?.chapter || '',
            lesson_no: result.extracted_entities?.lesson_no || '',
            content_date: result.content_date || '',
            modules: result.modules || [],
            recognition_reasons: result.recognition_reasons || [],
            source: result.source || '',
          },
        }),
      });
      const j = await r.json();
      if (j.data?.conflict) {
        setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, saving: false } : m)));
        setMessages((prev) => [...prev, { id: Date.now(), sender: 'ai', text: j.data.message }]);
        return;
      }
      if (j.code === 0) {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, result: undefined, saved: true } : m))
        );
        loadWorks();
      } else {
        setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, saving: false } : m)));
        setMessages((prev) => [
          ...prev,
          { id: Date.now(), sender: 'ai', text: '保存失败: ' + (j.message || '未知错误') },
        ]);
      }
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, saving: false } : m)));
    }
  };

  const modifyType = (msgId: number, newType: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId && m.result) {
          const labels: Record<string, string> = {
            personal_lesson: '个人备课',
            reflection: '教学反思',
            group_lesson: '集体备课',
            plan_summary: '计划总结',
          };
          return {
            ...m,
            result: {
              ...m.result,
              type: newType,
              title_candidate:
                (labels[newType] || newType) + ': ' + (m.result.title_candidate || ''),
            },
          };
        }
        return m;
      })
    );
  };

  const saveManual = async () => {
    if (!manualAdd || !manualAdd.title.trim()) return;
    try {
      let fileId: number | undefined;
      if (manualAdd.file) {
        const form = new FormData();
        form.append('file', manualAdd.file);
        const up = await fetch('/api/ai/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${tk()}` },
          body: form,
        }).then((r) => r.json());
        if (up.code === 0) fileId = Number(up.data.file_id);
      }
      const r = await fetch('/api/ai/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
        body: JSON.stringify({
          messageId: 0,
          type: manualAdd.type,
          title: manualAdd.title.trim(),
          fileIds: fileId ? [fileId] : [],
          extractedEntities: {
            content_date: manualAdd.date || new Date().toISOString().slice(0, 10),
          },
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
        <ConversationSidebar
          token={tk()}
          activeId={convId}
          onSelect={(id) => {
            setConvId(id);
          }}
        />
        <main className="flex-1 flex overflow-hidden">
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
                            {msg.result?.actions && (
                              <div className="flex gap-2 mt-2">
                                {msg.result.actions.map((a: string) => (
                                  <Button
                                    key={a}
                                    size="sm"
                                    variant={a.includes('保存') ? 'default' : 'outline'}
                                    onClick={() => {
                                      if (a.includes('保存')) {
                                        // 进入结构化卡片流程
                                        const taskType =
                                          msg.result.suggestType || 'personal_lesson';
                                        setMessages((prev) =>
                                          prev.map((m) =>
                                            m.id === msg.id
                                              ? {
                                                  ...m,
                                                  result: {
                                                    ...m.result,
                                                    type: taskType,
                                                    isBusinessScene: true,
                                                    actions: undefined,
                                                  },
                                                }
                                              : m
                                          )
                                        );
                                      }
                                    }}
                                  >
                                    {a}
                                  </Button>
                                ))}
                              </div>
                            )}
                            {msg.result &&
                              msg.result.isBusinessScene !== false &&
                              msg.result.type !== 'chat' &&
                              msg.result.type !== 'duplicate' &&
                              msg.result.type !== 'rate_limited' &&
                              msg.result.type !== 'queue_full' && (
                                <div className="mt-3 pt-3 border-t space-y-2.5">
                                  <p className="text-xs font-semibold text-slate-500">
                                    📄 资料预览
                                  </p>

                                  {/* 只读预览模式 */}
                                  {!editingCards.has(msg.id) ? (
                                    <div className="space-y-2 bg-slate-50 rounded-lg p-3 border border-slate-100">
                                      <div className="flex items-baseline gap-2">
                                        <span className="text-xs text-slate-500">类型：</span>
                                        <span className="text-xs font-medium">
                                          {TYPE_LABEL[normalizeType(msg.result.type)]}
                                        </span>
                                        {msg.result.confidence ? (
                                          <span className="text-xs text-slate-400">
                                            （{Math.round(msg.result.confidence * 100)}%）
                                          </span>
                                        ) : null}
                                      </div>
                                      <div className="flex items-baseline gap-2">
                                        <span className="text-xs text-slate-500">标题：</span>
                                        <span className="text-sm font-medium text-slate-800">
                                          {msg.result.metadata_title ||
                                            msg.result.title_candidate ||
                                            '未识别到标题，请老师填写'}
                                        </span>
                                      </div>
                                      <div className="flex items-baseline gap-4">
                                        <span className="text-xs text-slate-500">
                                          日期：
                                          <span className="text-slate-700">
                                            {msg.result.content_date ||
                                              new Date().toISOString().slice(0, 10)}
                                          </span>
                                        </span>
                                        <span className="text-xs text-slate-500">
                                          学科：
                                          <span className="text-slate-700">
                                            {msg.result.subject || '未识别'}
                                          </span>
                                        </span>
                                        <span className="text-xs text-slate-500">
                                          年级：
                                          <span className="text-slate-700">
                                            {msg.result.grade || '未识别'}
                                          </span>
                                        </span>
                                        <span className="text-xs text-slate-500">
                                          来源：
                                          <span className="text-slate-700">
                                            {msg.result.source || '聊天'}
                                          </span>
                                        </span>
                                      </div>
                                      {msg.result.modules?.length > 0 && (
                                        <div className="space-y-1 pt-1 border-t border-slate-200">
                                          <p className="text-xs text-slate-400 mb-1">概要：</p>
                                          {msg.result.modules.map((mod: any, i: number) => (
                                            <div key={i} className="text-xs flex gap-1">
                                              <span className="text-slate-500 shrink-0">
                                                • {mod.label}：
                                              </span>
                                              <span className="text-slate-700">
                                                {mod.content || '未识别'}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {msg.result.recognition_reasons?.length > 0 && (
                                        <div className="pt-1 border-t border-slate-200">
                                          <p className="text-xs text-slate-400 mb-0.5">
                                            识别依据：
                                          </p>
                                          {msg.result.recognition_reasons.map(
                                            (r: string, i: number) => (
                                              <p key={i} className="text-xs text-green-600 ml-1">
                                                ✓ {r}
                                              </p>
                                            )
                                          )}
                                        </div>
                                      )}
                                      <div className="flex gap-2 items-center pt-2 border-t border-slate-200">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            setEditingCards((prev) => {
                                              const next = new Set(prev);
                                              next.add(msg.id);
                                              return next;
                                            })
                                          }
                                        >
                                          修改资料
                                        </Button>
                                        {msg.saved ? (
                                          <span className="text-sm text-green-600">✅ 已保存</span>
                                        ) : (
                                          <Button
                                            size="sm"
                                            onClick={() => confirm(msg.id, msg.result)}
                                            disabled={(msg as any).saving}
                                          >
                                            {(msg as any).saving ? '保存中...' : '确认保存'}
                                          </Button>
                                        )}
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() =>
                                            setMessages((prev) =>
                                              prev.filter((m) => m.id !== msg.id)
                                            )
                                          }
                                        >
                                          取消
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    /* 可编辑表单模式 */
                                    <div className="space-y-2 bg-slate-50 rounded-lg p-3 border border-blue-200">
                                      <div className="text-xs text-slate-600">
                                        资料类型：
                                        <span className="font-medium">
                                          {TYPE_LABEL[normalizeType(msg.result.type)]}
                                        </span>
                                        {msg.result.confidence ? (
                                          <span className="text-slate-400">
                                            （{Math.round(msg.result.confidence * 100)}%）
                                          </span>
                                        ) : null}
                                      </div>
                                      <div className="flex items-center gap-1 text-xs">
                                        <span className="shrink-0 text-slate-400">标题：</span>
                                        <input
                                          value={
                                            msg.result.metadata_title ||
                                            msg.result.title_candidate ||
                                            ''
                                          }
                                          onChange={(e) =>
                                            setMessages((prev) =>
                                              prev.map((m) =>
                                                m.id === msg.id
                                                  ? {
                                                      ...m,
                                                      result: {
                                                        ...m.result,
                                                        metadata_title: e.target.value,
                                                        title_candidate: e.target.value,
                                                      },
                                                    }
                                                  : m
                                              )
                                            )
                                          }
                                          className="flex-1 border rounded px-2 py-1 text-xs"
                                        />
                                      </div>
                                      <div className="grid grid-cols-2 gap-1 text-xs">
                                        <div className="flex items-center gap-1">
                                          <span className="shrink-0 text-slate-400">📅</span>
                                          <input
                                            type="date"
                                            value={msg.result.content_date || ''}
                                            onChange={(e) =>
                                              setMessages((prev) =>
                                                prev.map((m) =>
                                                  m.id === msg.id
                                                    ? {
                                                        ...m,
                                                        result: {
                                                          ...m.result,
                                                          content_date: e.target.value,
                                                        },
                                                      }
                                                    : m
                                                )
                                              )
                                            }
                                            className="border rounded px-1 py-0.5 text-xs w-full"
                                          />
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <span className="shrink-0 text-slate-400">📖</span>
                                          <input
                                            value={msg.result.subject || ''}
                                            onChange={(e) =>
                                              setMessages((prev) =>
                                                prev.map((m) =>
                                                  m.id === msg.id
                                                    ? {
                                                        ...m,
                                                        result: {
                                                          ...m.result,
                                                          subject: e.target.value,
                                                        },
                                                      }
                                                    : m
                                                )
                                              )
                                            }
                                            className="border rounded px-1 py-0.5 text-xs w-full"
                                            placeholder="学科"
                                          />
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <span className="shrink-0 text-slate-400">📚</span>
                                          <input
                                            value={msg.result.grade || ''}
                                            onChange={(e) =>
                                              setMessages((prev) =>
                                                prev.map((m) =>
                                                  m.id === msg.id
                                                    ? {
                                                        ...m,
                                                        result: {
                                                          ...m.result,
                                                          grade: e.target.value,
                                                        },
                                                      }
                                                    : m
                                                )
                                              )
                                            }
                                            className="border rounded px-1 py-0.5 text-xs w-full"
                                            placeholder="年级"
                                          />
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <span className="text-slate-400">📄</span>
                                          <span className="text-slate-500">
                                            {msg.result.source || '聊天'}
                                          </span>
                                        </div>
                                      </div>
                                      {msg.result.modules?.length > 0 && (
                                        <div className="space-y-1">
                                          <p className="text-xs text-slate-400">概要：</p>
                                          {msg.result.modules.map((mod: any, i: number) => (
                                            <div
                                              key={i}
                                              className="flex items-center gap-1 text-xs"
                                            >
                                              <span className="shrink-0 text-slate-600">
                                                {mod.label}：
                                              </span>
                                              <input
                                                value={mod.content || ''}
                                                onChange={(e) => {
                                                  const newMods = [...msg.result.modules];
                                                  newMods[i] = {
                                                    ...newMods[i],
                                                    content: e.target.value,
                                                  };
                                                  setMessages((prev) =>
                                                    prev.map((m) =>
                                                      m.id === msg.id
                                                        ? {
                                                            ...m,
                                                            result: {
                                                              ...m.result,
                                                              modules: newMods,
                                                            },
                                                          }
                                                        : m
                                                    )
                                                  );
                                                }}
                                                className="flex-1 border rounded px-1 py-0.5 text-xs"
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {msg.result.recognition_reasons?.length > 0 && (
                                        <div className="text-xs space-y-0.5">
                                          <p className="text-slate-400">识别依据：</p>
                                          {msg.result.recognition_reasons.map(
                                            (r: string, i: number) => (
                                              <p key={i} className="text-green-600 ml-1">
                                                ✓ {r}
                                              </p>
                                            )
                                          )}
                                        </div>
                                      )}
                                      <div className="flex gap-2 items-center pt-1">
                                        <select
                                          value={normalizeType(msg.result.type)}
                                          onChange={(e) =>
                                            modifyType(msg.id, normalizeType(e.target.value))
                                          }
                                          className="text-xs border rounded px-2 py-1.5"
                                        >
                                          <option value="personal_lesson">个人备课</option>
                                          <option value="reflection">教学反思</option>
                                          <option value="group_lesson">集体备课</option>
                                          <option value="plan_summary">计划总结</option>
                                        </select>
                                        {msg.saved ? (
                                          <span className="text-sm text-green-600">✅ 已保存</span>
                                        ) : (
                                          <Button
                                            size="sm"
                                            onClick={() => confirm(msg.id, msg.result)}
                                            disabled={(msg as any).saving}
                                          >
                                            {(msg as any).saving ? '保存中...' : '确认保存'}
                                          </Button>
                                        )}
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() =>
                                            setEditingCards((prev) => {
                                              const next = new Set(prev);
                                              next.delete(msg.id);
                                              return next;
                                            })
                                          }
                                        >
                                          预览
                                        </Button>
                                      </div>
                                    </div>
                                  )}
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
              {selectedWorkId ? (
                /* === Detail View === */
                <div className="flex flex-col h-full">
                  <div className="p-3 border-b border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedWorkId(null);
                        setWorkDetail(null);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      ← 返回列表
                    </button>
                    <span className="text-sm text-slate-400">|</span>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-sm text-red-500 hover:text-red-700 ml-auto"
                    >
                      🗑 删除
                    </button>
                  </div>
                  {workDetailLoading ? (
                    <div className="p-6 space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-5 bg-slate-100 rounded animate-pulse" />
                      ))}
                    </div>
                  ) : workDetail ? (
                    <div className="p-4 space-y-4 overflow-y-auto flex-1">
                      <div>
                        {typeBadge(workDetail.content_type)}
                        <h3 className="text-lg font-semibold text-slate-800 mt-2">
                          {workDetail.title}
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-slate-400">创建</span>
                          <br />
                          {new Date(workDetail.created_at).toLocaleString('zh-CN')}
                        </div>
                        <div>
                          <span className="text-slate-400">更新</span>
                          <br />
                          {new Date(workDetail.updated_at).toLocaleString('zh-CN')}
                        </div>
                        <div>
                          <span className="text-slate-400">学年</span>
                          <br />
                          {workDetail.academic_year || '—'}
                        </div>
                        <div>
                          <span className="text-slate-400">学期</span>
                          <br />
                          {workDetail.semester || '—'}
                        </div>
                        <div>
                          <span className="text-slate-400">版本</span>
                          <br />v{workDetail.version || 1}
                        </div>
                        <div>
                          <span className="text-slate-400">状态</span>
                          <br />
                          {workDetail.status || 'draft'}
                        </div>
                      </div>
                      {workDetail.summary && (
                        <div>
                          <p className="text-sm text-slate-400 mb-1">摘要</p>
                          <p className="text-sm text-slate-600">{workDetail.summary}</p>
                        </div>
                      )}
                      {/* AI 识别概要 - 从子表数据提取（放在附件前面） */}
                      {(workDetail.personalLesson?.[0]?.body_text ||
                        workDetail.reflection?.[0]?.reflection_text ||
                        workDetail.groupLesson?.[0]?.body_text ||
                        workDetail.groupLesson?.[0]?.topic ||
                        workDetail.planSummary?.[0]?.body_text) && (
                        <div>
                          <p className="text-sm text-slate-400 mb-1">AI 识别概要</p>
                          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {workDetail.personalLesson?.[0]?.body_text ||
                              workDetail.reflection?.[0]?.reflection_text ||
                              workDetail.groupLesson?.[0]?.body_text ||
                              workDetail.planSummary?.[0]?.body_text ||
                              (workDetail.groupLesson?.[0]?.topic
                                ? `研讨主题：${workDetail.groupLesson[0].topic}`
                                : '')}
                          </div>
                          {workDetail.personalLesson?.[0]?.subject && (
                            <div className="flex gap-3 mt-1 text-xs text-slate-400">
                              {workDetail.personalLesson[0].subject && (
                                <span>学科：{workDetail.personalLesson[0].subject}</span>
                              )}
                              {workDetail.personalLesson[0].grade && (
                                <span>年级：{workDetail.personalLesson[0].grade}</span>
                              )}
                              {workDetail.personalLesson[0].chapter && (
                                <span>章节：{workDetail.personalLesson[0].chapter}</span>
                              )}
                            </div>
                          )}
                          {workDetail.groupLesson?.[0] && (
                            <div className="flex gap-3 mt-1 text-xs text-slate-400">
                              {workDetail.groupLesson[0].subject && (
                                <span>学科：{workDetail.groupLesson[0].subject}</span>
                              )}
                              {workDetail.groupLesson[0].grade && (
                                <span>年级：{workDetail.groupLesson[0].grade}</span>
                              )}
                              {workDetail.groupLesson[0].creator && (
                                <span>主备人：{workDetail.groupLesson[0].creator?.name}</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {workDetail.attachments?.length > 0 && (
                        <div>
                          <p className="text-sm text-slate-400 mb-1">
                            附件（{workDetail.attachments.length}）
                          </p>
                          {workDetail.attachments.map((att: any) => {
                            const isImage = att.file?.mime_type?.startsWith('image/');
                            const isPDF =
                              att.file?.mime_type === 'application/pdf' ||
                              att.file?.file_ext === 'pdf';
                            const isWord =
                              att.file?.mime_type?.includes('word') ||
                              att.file?.file_ext === 'doc' ||
                              att.file?.file_ext === 'docx';
                            const previewUrl = `/api/files/${att.file_id}/preview`;
                            const downloadUrl = `/api/files/${att.file_id}/download`;
                            return (
                              <div
                                key={att.id}
                                className="border border-slate-200 rounded-lg p-2 space-y-2 mb-2"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-slate-700 truncate max-w-[160px]">
                                    {isImage ? '🖼' : isPDF ? '📕' : isWord ? '📝' : '📄'}{' '}
                                    {att.file?.original_name || '附件'}
                                  </span>
                                  <span className="text-xs text-slate-400">
                                    {att.attachment_role}
                                  </span>
                                </div>
                                {isImage ? (
                                  <img
                                    src={previewUrl}
                                    alt={att.file?.original_name || '图片'}
                                    className="w-full max-h-72 object-contain border rounded bg-slate-50"
                                  />
                                ) : isPDF ? (
                                  <iframe
                                    src={previewUrl}
                                    className="w-full h-72 border rounded bg-slate-50"
                                    title="PDF预览"
                                  />
                                ) : isWord ? (
                                  <div className="w-full h-36 border rounded bg-amber-50 flex flex-col items-center justify-center text-center space-y-2">
                                    <span className="text-3xl">📝</span>
                                    <p className="text-sm text-amber-700">
                                      Word 文档暂不支持在线预览
                                    </p>
                                    <p className="text-xs text-amber-500">请下载后使用 Word 打开</p>
                                  </div>
                                ) : att.file?.mime_type ? (
                                  <iframe
                                    src={previewUrl}
                                    className="w-full h-72 border rounded bg-slate-50"
                                    title="附件预览"
                                  />
                                ) : null}
                                <div className="flex gap-2 text-sm">
                                  {isImage || isPDF ? (
                                    <a
                                      href={previewUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-blue-500 hover:text-blue-700 flex-1 text-center py-1 bg-blue-50 rounded"
                                    >
                                      🔍 全屏预览
                                    </a>
                                  ) : null}
                                  <a
                                    href={downloadUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-500 hover:text-blue-700 flex-1 text-center py-1 bg-blue-50 rounded"
                                  >
                                    ⬇ 下载
                                  </a>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {/* 集体备课：参与互动区 */}
                      {workDetail.content_type === 'group_lesson' && (
                        <div className="flex flex-col min-h-0">
                          <p className="text-sm text-slate-400 mb-1 shrink-0">参与互动</p>
                          {(() => {
                            const participantIds = new Set<number>();
                            const participantNames: string[] = [];
                            comments.forEach((c: any) => {
                              if (!participantIds.has(c.teacher_id)) {
                                participantIds.add(c.teacher_id);
                                participantNames.push(c.teacher_name);
                              }
                            });
                            return (
                              <p className="text-sm text-slate-500 mb-2 shrink-0">
                                参与人：
                                {participantNames.length > 0
                                  ? `${participantNames.length} 人（${participantNames.join('、')}）`
                                  : '无'}
                              </p>
                            );
                          })()}
                          <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
                            {comments.map((c: any) => (
                              <div
                                key={c.id}
                                className="bg-slate-50 border border-slate-100 rounded-lg p-2 group"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-slate-700">
                                    {c.teacher_name}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400">
                                      {new Date(c.created_at).toLocaleString('zh-CN')}
                                    </span>
                                    {(teacher?.role === 'admin' ||
                                      c.teacher_id === teacher?.id) && (
                                      <button
                                        onClick={() => deleteComment(c.id, false)}
                                        className="text-xs text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        🗑
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {c.comment_text && (
                                  <p className="text-sm text-slate-600">{c.comment_text}</p>
                                )}
                                {c.file_name && (
                                  <a
                                    href={`/api/files/${c.file_id}/download`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm text-blue-500 mt-1 block hover:underline"
                                  >
                                    📎 {c.file_name}
                                  </a>
                                )}
                              </div>
                            ))}
                            {comments.length === 0 && !workDetailLoading && (
                              <p className="text-sm text-slate-400 text-center py-2">暂无留言</p>
                            )}
                          </div>
                          <div className="shrink-0 pt-2 border-t border-slate-100 space-y-2">
                            {commentFile && (
                              <div className="flex items-center gap-2 text-sm bg-blue-50 rounded px-2 py-1">
                                <span>📎 {commentFile.name}</span>
                                <button
                                  onClick={() => setCommentFile(null)}
                                  className="text-red-400 hover:text-red-600"
                                >
                                  &times;
                                </button>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <input
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    submitComment();
                                  }
                                }}
                                placeholder="输入评论或上传附件..."
                                className="flex-1 border rounded-lg px-3 py-2 text-sm"
                              />
                              <label className="cursor-pointer flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-blue-500 shrink-0">
                                <span className="text-lg">+</span>
                                <input
                                  type="file"
                                  ref={commentFileRef}
                                  className="hidden"
                                  accept=".doc,.docx,.pdf,.jpg,.jpeg,.png,.gif,.txt"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) setCommentFile(f);
                                  }}
                                />
                              </label>
                              <Button
                                size="sm"
                                onClick={submitComment}
                                disabled={
                                  commentSubmitting || (!commentText.trim() && !commentFile)
                                }
                              >
                                {commentSubmitting ? '发送中' : '发送'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                      {/* 个人备课：教学反思 + 留言 */}
                      {workDetail.content_type === 'personal_lesson' && (
                        <div className="flex flex-col min-h-0">
                          <p className="text-sm text-slate-400 mb-2 shrink-0">教学反思</p>
                          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-3 shrink-0">
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">
                              {reflectionText || '无'}
                            </p>
                          </div>
                          <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
                            {plComments.map((c: any) => (
                              <div
                                key={c.id}
                                className="bg-slate-50 border border-slate-100 rounded-lg p-2 group"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-slate-700">
                                    {c.teacher_name}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400">
                                      {new Date(c.created_at).toLocaleString('zh-CN')}
                                    </span>
                                    {(teacher?.role === 'admin' ||
                                      c.teacher_id === teacher?.id) && (
                                      <button
                                        onClick={() => deleteComment(c.id, true)}
                                        className="text-xs text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        🗑
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {c.comment_text && (
                                  <p className="text-sm text-slate-600">{c.comment_text}</p>
                                )}
                                {c.file_name && (
                                  <a
                                    href={`/api/files/${c.file_id}/download`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm text-blue-500 mt-1 block hover:underline"
                                  >
                                    📎 {c.file_name}
                                  </a>
                                )}
                              </div>
                            ))}
                            {plComments.length === 0 && !workDetailLoading && (
                              <p className="text-sm text-slate-400 text-center py-2">暂无留言</p>
                            )}
                          </div>
                          <div className="shrink-0 pt-2 border-t border-slate-100 space-y-2">
                            {commentFile && (
                              <div className="flex items-center gap-2 text-sm bg-blue-50 rounded px-2 py-1">
                                <span>📎 {commentFile.name}</span>
                                <button
                                  onClick={() => setCommentFile(null)}
                                  className="text-red-400 hover:text-red-600"
                                >
                                  &times;
                                </button>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <input
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    submitComment();
                                  }
                                }}
                                placeholder="输入评论或上传附件..."
                                className="flex-1 border rounded-lg px-3 py-2 text-sm"
                              />
                              <label className="cursor-pointer flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-blue-500 shrink-0">
                                <span className="text-lg">+</span>
                                <input
                                  type="file"
                                  ref={commentFileRef}
                                  className="hidden"
                                  accept=".doc,.docx,.pdf,.jpg,.jpeg,.png,.gif,.txt"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) setCommentFile(f);
                                  }}
                                />
                              </label>
                              <Button
                                size="sm"
                                onClick={submitComment}
                                disabled={
                                  commentSubmitting || (!commentText.trim() && !commentFile)
                                }
                              >
                                {commentSubmitting ? '发送中' : '发送'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                      {showDeleteConfirm && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
                          <p className="text-sm text-red-700 font-medium">
                            确认删除「{workDetail.title}」？
                          </p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteWork(selectedWorkId)}
                              disabled={deletingId === selectedWorkId}
                            >
                              {deletingId === selectedWorkId ? '删除中...' : '确认删除'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShowDeleteConfirm(false)}
                            >
                              取消
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-sm text-slate-400">加载失败</div>
                  )}
                </div>
              ) : (
                /* === List View === */
                <>
                  <div className="p-4 border-b border-slate-100 space-y-3">
                    <div className="flex gap-1 flex-wrap">
                      <span className="text-sm text-slate-400 py-1 mr-1">手动录入：</span>
                      {[
                        { k: 'personal_lesson', label: '📖 个人备课' },
                        { k: 'group_lesson', label: '👥 集体备课' },
                        { k: 'plan_summary', label: '📋 计划总结' },
                      ].map((item) => (
                        <button
                          key={item.k}
                          onClick={() => {
                            const now = new Date().toISOString().slice(0, 10);
                            setManualAdd({ type: item.k, open: true, title: '', date: now });
                          }}
                          className="px-2 py-1 rounded text-sm bg-blue-50 text-blue-600 hover:bg-blue-100"
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
                      {['', 'personal_lesson', 'group_lesson', 'reflection', 'plan_summary'].map(
                        (k) => {
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
                        }
                      )}
                    </div>
                  </div>
                  <div className="flex-1 p-3 space-y-2">
                    {filteredWorks.map((w) => (
                      <div
                        key={w.id}
                        onClick={() => loadWorkDetail(w.id)}
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
                </>
              )}
            </div>
            {/* 手动录入弹窗 */}
            {manualAdd?.open && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 space-y-4">
                  <h3 className="text-lg font-semibold">
                    新增 —{' '}
                    {{
                      personal_lesson: '个人备课',
                      group_lesson: '集体备课',
                      plan_summary: '计划总结',
                    }[manualAdd.type] || manualAdd.type}
                  </h3>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">
                      标题 <span className="text-red-400">*</span>
                    </label>
                    <input
                      value={manualAdd.title}
                      onChange={(e) => setManualAdd({ ...manualAdd, title: e.target.value })}
                      placeholder="请输入标题..."
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">日期</label>
                    <input
                      type="date"
                      value={manualAdd.date || ''}
                      onChange={(e) => setManualAdd({ ...manualAdd, date: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">附件</label>
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer px-3 py-1.5 text-sm border rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600">
                        📎 选择文件
                        <input
                          type="file"
                          className="hidden"
                          accept=".doc,.docx,.pdf,.jpg,.jpeg,.png,.txt"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) setManualAdd({ ...manualAdd, file: f });
                          }}
                          ref={(el) => {
                            manualFileRef.current = el;
                          }}
                        />
                      </label>
                      {manualAdd.file && (
                        <span className="text-sm text-slate-500 truncate max-w-[200px]">
                          {manualAdd.file.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setManualAdd(null)}
                      className="px-4 py-2 text-sm border rounded-lg hover:bg-slate-50"
                    >
                      取消
                    </button>
                    <button
                      onClick={saveManual}
                      disabled={!manualAdd.title.trim()}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40"
                    >
                      保存
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
