'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function WorkspacePage() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const getToken = () => localStorage.getItem('accessToken');

  useEffect(() => {
    const t = localStorage.getItem('teacher');
    if (!t || !getToken()) {
      router.push('/login');
      return;
    }
    setTeacher(JSON.parse(t));
    initWorkspace();
  }, []);

  const initWorkspace = async () => {
    try {
      const [sessRes] = await Promise.all([
        fetch('/api/ai/session', { headers: { Authorization: `Bearer ${getToken()}` } }),
      ]);
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
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (json.code === 0) {
        // Poll for result
        const msgId = json.data.messageId;
        setMessages((prev) => [
          ...prev,
          { id: Date.now(), sender_type: 'teacher', text_content: text },
        ]);
        pollResult(msgId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const pollResult = async (msgId: number) => {
    const poll = setInterval(async () => {
      const res = await fetch(`/api/ai/recognition/${msgId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.code === 0 && json.data?.status === 'completed') {
        clearInterval(poll);
        initWorkspace(); // Refresh messages
      }
    }, 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch('/api/ai/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      });
      const json = await res.json();
      if (json.code === 0) {
        // Send as chat
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
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = async (msgId: number, result: any, title?: string) => {
    const res = await fetch('/api/ai/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({
        messageId: msgId,
        type: result.type,
        title: title || result.title_candidate,
        subject: result.subject,
        grade: result.grade,
        linkedContentId: result.extracted_entities?.recommended_lesson?.id,
        extractedEntities: result.extracted_entities,
      }),
    });
    const json = await res.json();
    if (json.data?.conflict) {
      // Version conflict: prompt user
      alert(json.data.message);
      return;
    }
    initWorkspace();
  };

  if (loading)
    return <div className="flex min-h-screen items-center justify-center">加载中...</div>;

  return (
    <div className="mx-auto flex h-screen max-w-2xl flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <h1 className="font-bold">AI 工作台</h1>
          <p className="text-xs text-gray-400">{teacher?.name}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/home" className="text-xs text-blue-500">
            首页
          </Link>
          <Link href={`/teacher/${teacher?.id}`} className="text-xs text-blue-500">
            我的空间
          </Link>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg: any) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender_type === 'teacher' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
                msg.sender_type === 'teacher'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {msg.text_content}
              {msg.sender_type === 'teacher' && msg.id && (
                <div className="mt-2 flex gap-2 text-xs">
                  <button
                    onClick={async () => {
                      const res = await fetch(`/api/ai/recognition/${msg.id}`, {
                        headers: { Authorization: `Bearer ${getToken()}` },
                      });
                      const json = await res.json();
                      if (json.data?.status === 'completed') {
                        handleConfirm(msg.id, json.data.result);
                      }
                    }}
                    className="underline"
                  >
                    确认保存
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">
            👋 开始上传备课资料或输入文字，我会帮你整理归档。
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t p-4 flex items-center gap-2">
        <label className="cursor-pointer text-xl" title="上传文件">
          📎
          <input
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            accept=".doc,.docx,.ppt,.pptx,.pdf,.jpg,.jpeg,.png,.txt"
            disabled={uploading}
          />
        </label>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="输入文字或拖拽文件..."
          className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button
          onClick={sendMessage}
          className="rounded-full bg-blue-600 px-4 py-2 text-sm text-white"
        >
          发送
        </button>
      </div>
    </div>
  );
}
