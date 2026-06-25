'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, password }),
      });
      const json = await res.json();
      if (json.code !== 0) {
        setError(json.message || '登录失败');
        return;
      }
      localStorage.setItem('accessToken', json.data.tokenPair.accessToken);
      localStorage.setItem('refreshToken', json.data.tokenPair.refreshToken);
      localStorage.setItem('teacher', JSON.stringify(json.data.teacher));
      router.push('/home');
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-3xl mb-3">📚</div>
          <h1 className="text-2xl font-bold text-gray-800">AI 教师工作空间</h1>
          <p className="text-sm text-gray-500 mt-1">备课资料共享与 AI 自动归档</p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-8 shadow-lg shadow-indigo-100/50 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">手机号</label>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="请输入11位手机号"
              maxLength={11}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 transition"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 transition"
              required
            />
          </div>
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
        <p className="text-center text-xs text-gray-400 mt-6">V1.0 · 仅限在职教师登录</p>
      </div>
    </div>
  );
}
