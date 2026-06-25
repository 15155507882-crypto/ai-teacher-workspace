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
      router.push('/workspace');
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-50">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--color-primary-600)] text-white text-2xl mb-4 shadow-lg shadow-blue-200">
            📚
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text-strong)]">AI 教师工作空间</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">智能备课助手</p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="rounded-[var(--radius-xl)] bg-[var(--color-bg-surface)] p-8 shadow-[var(--shadow-float)] space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-normal)] mb-1.5">
              手机号
            </label>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="请输入11位手机号"
              maxLength={11}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-4 py-2.5 text-sm text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary-500)] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-primary-500)] transition"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-normal)] mb-1.5">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-4 py-2.5 text-sm text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary-500)] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-primary-500)] transition"
              required
            />
          </div>
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--color-primary-600)] py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-500)] disabled:opacity-50 transition shadow-sm"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
        <p className="text-center text-xs text-[var(--color-text-muted)] mt-6">
          V1.0 · 仅限在职教师登录
        </p>
      </div>
    </div>
  );
}
