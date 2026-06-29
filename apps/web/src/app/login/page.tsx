'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCaptcha } from '@/hooks/useCaptcha';
import { Captcha } from '@/components/captcha';

export default function LoginPage() {
  const router = useRouter();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaCode, setCaptchaCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [school, setSchool] = useState<any>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [cpError, setCpError] = useState('');
  const [cpLoading, setCpLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const captcha = useCaptcha();

  useEffect(() => {
    setMounted(true);
    fetch('/api/public/school')
      .then((r) => r.json())
      .then((j) => {
        if (j.data) setSchool(j.data);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (showChangePassword) return;
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
      if (json.data.mustChangePassword) {
        setShowChangePassword(true);
      } else {
        router.push('/home');
      }
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setCpError('');
    if (!validatePasswordStrength(newPassword)) {
      setCpError('密码需8-32位，且至少包含大写字母、小写字母、数字、特殊字符中的两类');
      return;
    }
    if (newPassword !== confirmPassword) {
      setCpError('两次密码不一致');
      return;
    }
    if (newPassword === password) {
      setCpError('新密码不能与当前密码一致');
      return;
    }
    setCpLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + (localStorage.getItem('accessToken') || ''),
        },
        body: JSON.stringify({ currentPassword: password, newPassword }),
      });
      const json = await res.json();
      if (json.code !== 0) {
        setCpError(json.message || '修改失败');
        return;
      }
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('teacher');
      alert('密码修改成功，请使用新密码重新登录');
      window.location.reload();
    } catch {
      setCpError('网络错误');
    } finally {
      setCpLoading(false);
    }
  };

  const validatePasswordStrength = (pwd: string) => {
    if (!pwd || pwd.length < 8 || pwd.length > 32) return false;
    let cats = 0;
    if (/[A-Z]/.test(pwd)) cats++;
    if (/[a-z]/.test(pwd)) cats++;
    if (/[0-9]/.test(pwd)) cats++;
    if (/[!@#$%^&*()_+\-=[\]{};:,.<>?/]/.test(pwd)) cats++;
    return cats >= 2;
  };

  const caps = [
    { icon: '🔒', title: '安全可靠', desc: '数据加密保护' },
    { icon: '🤖', title: '智能高效', desc: 'AI 自动识别整理' },
    { icon: '☁️', title: '云端同步', desc: '多端实时同步' },
  ];

  return (
    <div className="relative flex min-h-screen lg:min-h-0 lg:h-screen lg:overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img
          src={school?.login_bg_data || '/images/login-campus-hero.png'}
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/30 via-slate-900/20 to-blue-900/25" />
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row w-full min-h-screen lg:h-screen lg:overflow-hidden">
        {/* Left */}
        <div className="flex-1 flex flex-col justify-between p-6 sm:p-8 lg:p-12 xl:p-16 text-white lg:min-w-0">
          <div className="space-y-6 lg:space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center overflow-hidden shrink-0">
                {school?.logo_data ? (
                  <img
                    src={school.logo_data}
                    alt="logo"
                    className="w-full h-full object-contain p-1.5"
                  />
                ) : (
                  <span className="text-xl sm:text-2xl">📚</span>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold truncate">
                  {school?.name || 'AI 教师工作空间'}
                </h2>
                <p className="text-xs text-white/70">智能备课助手</p>
              </div>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-tight">
                欢迎回来
              </h1>
              <p className="text-sm sm:text-base text-white/80 mt-2">让备课更高效 · 让教学更精彩</p>
            </div>
            <div className="space-y-2">
              {['智能识别教学资料', 'AI 自动整理备课内容', '学校资源统一共享'].map((f, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span className="text-sm text-white/90">{f}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden sm:grid grid-cols-3 gap-3 lg:gap-4 xl:gap-5 mt-8">
            {caps.map((c, i) => (
              <div
                key={i}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-3 lg:p-4 border border-white/10 hover:bg-white/15 transition-colors"
              >
                <div className="text-lg lg:text-xl mb-1.5">{c.icon}</div>
                <p className="text-xs lg:text-sm font-semibold">{c.title}</p>
                <p className="text-[10px] lg:text-xs text-white/60 mt-0.5">{c.desc}</p>
              </div>
            ))}
          </div>
          <div className="sm:hidden flex gap-3 mt-6 overflow-x-auto pb-2">
            {caps.map((c, i) => (
              <div
                key={i}
                className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10 flex items-center gap-2 shrink-0"
              >
                <span className="text-base">{c.icon}</span>
                <div>
                  <p className="text-xs font-semibold">{c.title}</p>
                  <p className="text-[10px] text-white/60">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Card */}
        <div className="flex items-center justify-center p-4 sm:p-6 lg:p-8 xl:p-12 lg:w-[480px] xl:w-[520px] lg:shrink-0">
          <div
            className={
              'w-full max-w-[400px] lg:max-w-none transition-opacity duration-700 ' +
              (mounted ? 'opacity-100' : 'opacity-0')
            }
          >
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl lg:rounded-3xl shadow-2xl shadow-black/20 p-6 sm:p-8 lg:p-10 overflow-y-auto max-h-[92vh] lg:max-h-[88vh]">
              <div className="mb-6 lg:mb-8">
                <h2 className="text-xl lg:text-2xl font-bold text-slate-900">教师登录</h2>
                <p className="text-sm text-slate-500 mt-1">使用手机号登录教师工作空间</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">手机号</label>
                  <div className="relative">
                    <div className="absolute left-0 top-0 h-full w-10 lg:w-11 flex items-center justify-center text-slate-400">
                      <svg
                        className="w-4 h-4 lg:w-5 lg:h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                    </div>
                    <input
                      type="tel"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="请输入手机号"
                      maxLength={11}
                      autoComplete="username"
                      className="w-full h-10 lg:h-11 pl-10 lg:pl-11 pr-4 rounded-xl border border-slate-200 bg-white/60 text-sm focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">密码</label>
                  <div className="relative">
                    <div className="absolute left-0 top-0 h-full w-10 lg:w-11 flex items-center justify-center text-slate-400">
                      <svg
                        className="w-4 h-4 lg:w-5 lg:h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="请输入密码"
                      autoComplete="current-password"
                      className="w-full h-10 lg:h-11 pl-10 lg:pl-11 pr-10 lg:pr-11 rounded-xl border border-slate-200 bg-white/60 text-sm focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      className="absolute right-0 top-0 h-full w-10 lg:w-11 flex items-center justify-center text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? (
                        <svg
                          className="w-4 h-4 lg:w-5 lg:h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-4 h-4 lg:w-5 lg:h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">验证码</label>
                  <div className="flex gap-2.5 lg:gap-3">
                    <div className="relative flex-1">
                      <div className="absolute left-0 top-0 h-full w-10 lg:w-11 flex items-center justify-center text-slate-400">
                        <svg
                          className="w-4 h-4 lg:w-5 lg:h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                          />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={captchaCode}
                        onChange={(e) => setCaptchaCode(e.target.value)}
                        placeholder="输入答案"
                        maxLength={4}
                        className="w-full h-10 lg:h-11 pl-10 lg:pl-11 pr-3 rounded-xl border border-slate-200 bg-white/60 text-sm focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all text-center tracking-widest"
                        required
                      />
                    </div>
                    <div className="shrink-0 flex items-center">
                      <Captcha
                        imageBase64={captcha.imageBase64}
                        loading={captcha.loading}
                        error={captcha.error}
                        onRefresh={captcha.refresh}
                        height={44}
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 lg:h-11 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-sm font-semibold text-white hover:from-blue-700 hover:to-blue-600 hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      登录中...
                    </>
                  ) : (
                    '登录'
                  )}
                </button>
              </form>

              <div className="mt-5 lg:mt-6 flex items-center justify-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-xs text-slate-400">数据传输加密保护</span>
              </div>
            </div>
            <p className="text-center text-xs text-white/50 mt-3 lg:mt-4">
              V1.0.0 · 建议使用 Chrome、Edge 浏览器
            </p>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl lg:rounded-3xl shadow-2xl max-w-md w-full mx-4 p-6 sm:p-8">
            <div className="mb-6">
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
                <svg
                  className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="text-lg lg:text-xl font-bold text-slate-800">修改初始密码</h3>
              <p className="text-sm text-slate-500 mt-1">首次登录需要修改密码后才能继续使用系统</p>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">当前密码</label>
                <input
                  type="text"
                  value={password}
                  disabled
                  className="w-full h-10 lg:h-11 rounded-xl border bg-slate-100 px-4 text-sm text-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">新密码</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="8-32位，至少两类字符"
                  autoComplete="new-password"
                  className="w-full h-10 lg:h-11 rounded-xl border px-4 text-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none"
                />
                <p className="text-xs text-slate-400 mt-1">
                  需包含大写、小写、数字、特殊字符中的至少两类
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">确认密码</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入新密码"
                  autoComplete="new-password"
                  className="w-full h-10 lg:h-11 rounded-xl border px-4 text-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none"
                />
              </div>
              {cpError && (
                <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-600">
                  {cpError}
                </div>
              )}
              <button
                type="submit"
                disabled={cpLoading}
                className="w-full h-10 lg:h-11 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-sm font-semibold text-white hover:from-blue-700 hover:to-blue-600 transition-all flex items-center justify-center gap-2"
              >
                {cpLoading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    修改中...
                  </>
                ) : (
                  '确认修改'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
