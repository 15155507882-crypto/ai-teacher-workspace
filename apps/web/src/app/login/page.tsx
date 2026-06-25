'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCaptcha } from '@/hooks/useCaptcha';
import { Captcha } from '@/components/captcha';

export default function LoginPage() {
  const router = useRouter();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [school, setSchool] = useState<any>(null);
  const captcha = useCaptcha();

  useEffect(() => {
    fetch('/api/public/school')
      .then((r) => r.json())
      .then((j) => {
        if (j.data) setSchool(j.data);
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
        body: JSON.stringify({ mobile, password, captchaId: captcha.captchaId, captchaCode }),
      });
      const json = await res.json();
      if (json.code !== 0) {
        setError(json.message || '登录失败');
        if (json.message?.includes('验证码')) captcha.refresh();
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit(e);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="hidden lg:flex w-[480px] bg-gradient-to-br from-blue-600 to-indigo-700 flex-col items-center justify-center p-12 text-white">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-4xl mb-6 mx-auto">
            📚
          </div>
          <h1 className="text-3xl font-bold mb-2">{school?.name || 'AI 教师工作空间'}</h1>
          <p className="text-blue-200 text-sm">智能备课助手 · 学校备课资料共享平台</p>
        </div>
        <div className="mt-12 text-center text-blue-200/60 text-xs">
          <p>全校教师均可在线查看备课资料</p>
          <p className="mt-1">AI 自动识别 · 自动归档 · 自动关联</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[380px]">
          <div className="lg:hidden text-center mb-8">
            <div className="text-3xl mb-2">📚</div>
            <h1 className="text-xl font-bold text-slate-800">
              {school?.short_name || 'AI 教师工作空间'}
            </h1>
          </div>
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-4"
            onKeyDown={handleKeyDown}
          >
            <h2 className="text-lg font-bold text-slate-800 mb-1">登录</h2>
            <p className="text-sm text-slate-500 -mt-2 mb-2">使用手机号登录教师工作空间</p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">手机号</label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="请输入手机号"
                maxLength={11}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                required
                tabIndex={1}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                required
                tabIndex={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">验证码</label>
              <div className="flex items-center gap-3">
                <Captcha
                  imageBase64={captcha.imageBase64}
                  loading={captcha.loading}
                  error={captcha.error}
                  onRefresh={captcha.refresh}
                />
                <input
                  type="text"
                  value={captchaCode}
                  onChange={(e) => setCaptchaCode(e.target.value)}
                  placeholder="输入答案"
                  maxLength={4}
                  className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:bg-white focus:outline-none transition text-center font-mono"
                  required
                  tabIndex={3}
                />
              </div>
            </div>
            {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-sm"
              tabIndex={4}
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>
          <p className="text-center text-xs text-slate-400 mt-4">V1.0 · 仅限在职教师登录</p>
        </div>
      </div>
    </div>
  );
}
