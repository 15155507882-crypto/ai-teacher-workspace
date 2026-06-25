'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function WorkspacePage() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const getToken = () => localStorage.getItem('accessToken');

  useEffect(() => {
    const t = localStorage.getItem('teacher');
    if (t) setTeacher(JSON.parse(t));
    initWorkspace();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initWorkspace = async () => {
    try {
      const sessRes = await fetch('/api/ai/session', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const sJson = await sessRes.json();
      if (sJson.code === 0 && sJson.data) {
        setSession(sJson.data);
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
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ text }),
    });
    const json = await res.json();
    if (json.code === 0) pollResult(json.data.messageId);
  };

  const pollResult = (msgId: number) => {
    const poll = setInterval(async () => {
      const res = await fetch(`/api/ai/recognition/${msgId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.code === 0 && json.data?.status === 'completed') {
        clearInterval(poll);
        initWorkspace();
      }
    }, 1500);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
        setMessages((prev) => [
          ...prev,
          { id: Date.now(), sender_type: 'teacher', text_content: `📎 ${file.name}` },
        ]);
        pollResult(cjson.data.messageId);
      }
    }
  };

  const quickConfirm = async (msgId: number) => {
    const res = await fetch(`/api/ai/recognition/${msgId}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const json = await res.json();
    if (json.data?.status !== 'completed') return;
    const r = json.data.result;
    await fetch('/api/ai/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({
        messageId: msgId,
        type: r.type,
        title: r.title_candidate,
        subject: r.subject,
        grade: r.grade,
        linkedContentId: r.extracted_entities?.recommended_lesson?.id,
        extractedEntities: r.extracted_entities,
      }),
    });
    initWorkspace();
  };

  if (loading) return <div className="p-8 text-center text-gray-400">加载中...</div>;

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col bg-white">
      <div className="border-b border-gray-100 px-6 py-4">
        <h1 className="text-lg font-bold text-gray-800">AI 工作台</h1>
        <p className="text-xs text-gray-400">上传课件或输入文字，我会帮你整理归档</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="py-20 text-center">
            <div className="text-4xl mb-3">👋</div>
            <p className="text-gray-400 text-sm">开始上传或输入备课资料</p>
            <p className="text-gray-300 text-xs mt-1">支持 Word、PPT、PDF、图片</p>
          </div>
        )}
        {messages.map((msg: any) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender_type === 'teacher' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                msg.sender_type === 'teacher'
                  ? 'bg-indigo-600 text-white rounded-br-md'
                  : 'bg-gray-100 text-gray-700 rounded-bl-md'
              }`}
            >
              {msg.text_content}
              {msg.sender_type === 'ai' && msg.message_type === 'action' && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <button
                    onClick={() => quickConfirm(msg.id || msg.id)}
                    className="text-xs text-indigo-600 hover:underline mr-3"
                  >
                    ✅ 确认保存
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-100 px-6 py-4 flex items-center gap-3 bg-white">
        <label className="cursor-pointer text-gray-400 hover:text-indigo-500 text-xl">
          📎
          <input
            type="file"
            className="hidden"
            onChange={handleUpload}
            accept=".doc,.docx,.ppt,.pptx,.pdf,.jpg,.jpeg,.png,.txt"
          />
        </label>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="输入文字或拖拽文件到此处..."
          className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-5 py-2.5 text-sm focus:border-indigo-400 focus:bg-white focus:outline-none transition"
        />
        <button
          onClick={sendMessage}
          className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition"
        >
          发送
        </button>
      </div>
    </div>
  );
}
