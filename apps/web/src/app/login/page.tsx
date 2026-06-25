'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [schoolName, setSchoolName] = useState('AI 教师工作空间');

  useEffect(() => {
    fetch('/api/public/school')
      .then((r) => r.json())
      .then((j) => {
        if (j.data?.short_name) setSchoolName(j.data.short_name);
      })
      .catch(() => {});
  }, []);

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
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-100">
      <div className="w-full max-w-[420px] px-4">
        <div className="text-center mb-10 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[var(--radius-xl)] bg-[var(--color-primary-600)] text-white shadow-lg shadow-blue-200/50 mb-5">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </div>
          <h1 className="text-display text-[var(--color-text-strong)] mb-1">{schoolName}</h1>
          <p className="text-body text-[var(--color-text-muted)]">智能备课助手</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[var(--radius-dialog)] bg-[var(--color-bg-surface)] p-8 shadow-[var(--shadow-float)] space-y-4 animate-fade-in-up"
          style={{ animationDelay: '80ms' }}
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
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-4 py-3 text-sm text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary-500)] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-primary-500)] transition"
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
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-4 py-3 text-sm text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary-500)] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-primary-500)] transition"
              required
            />
          </div>
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 flex items-center gap-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg h-11 bg-[var(--color-primary-600)] text-sm font-medium text-white hover:bg-[var(--color-primary-500)] disabled:opacity-50 transition shadow-sm"
          >
            {loading ? '登录中...' : '登录进入工作空间'}
          </button>
        </form>

        <p className="text-center text-tiny text-[var(--color-text-muted)] mt-6">
          V1.0 · 仅限在职教师登录
        </p>
      </div>
    </div>
  );
}
