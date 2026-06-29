'use client';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { UserSettingsModal } from './user-settings-modal';

const AVATARS = {
  male: [
    'from-blue-500 to-cyan-400',
    'from-indigo-500 to-blue-400',
    'from-teal-500 to-emerald-400',
    'from-slate-600 to-slate-400',
  ],
  female: [
    'from-pink-400 to-rose-300',
    'from-purple-500 to-violet-400',
    'from-orange-400 to-amber-300',
    'from-fuchsia-500 to-pink-400',
  ],
};

function AvatarCircle({
  name,
  gender,
  size = 28,
}: {
  name: string;
  gender?: string | null;
  size?: number;
}) {
  const idx = (name?.charCodeAt(0) || 0) % 4;
  const colors = (gender === 'female' ? AVATARS.female : AVATARS.male)[idx];
  return (
    <div
      className={`rounded-full bg-gradient-to-br ${colors} flex items-center justify-center text-white font-bold shadow-inner shrink-0`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {name?.[0]}
    </div>
  );
}

export function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [teacher, setTeacher] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMenu = () => {
    if (menuTimerRef.current) clearTimeout(menuTimerRef.current);
    setMenuOpen(true);
  };
  const closeMenu = () => {
    menuTimerRef.current = setTimeout(() => setMenuOpen(false), 150);
  };

  useEffect(() => {
    const t = localStorage.getItem('teacher');
    if (!t) {
      router.push('/login');
      return;
    }
    setTeacher(JSON.parse(t));
    fetch('/api/public/school')
      .then((r) => r.json())
      .then((j) => {
        if (j.data) setSchool(j.data);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!teacher) return null;

  const navItems = [
    { href: '/home', label: '首页' },
    { href: '/workspace', label: 'AI工作台' },
    { href: '/group-lessons', label: '集体备课' },
    { href: '/personal-lessons', label: '个人备课' },
    { href: '/plans', label: '计划与总结' },
    { href: '/reflections', label: '教学反思' },
  ];

  return (
    <header className="h-[72px] bg-white border-b border-slate-200 flex items-center px-6 shrink-0 z-10 sticky top-0">
      <Link href="/home" className="flex items-center gap-3 mr-8 shrink-0">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden">
          {school?.logo_data ? (
            <img src={school.logo_data} alt="logo" className="h-12 w-12 object-contain" />
          ) : school?.logo_file_id ? (
            <img
              src={`/api/files/${school.logo_file_id}/preview`}
              alt="logo"
              className="h-12 w-12 object-contain"
            />
          ) : (
            <span
              className="text-[28px] font-bold text-[#1E2A44] select-none"
              style={{
                fontFamily: "'HarmonyOS Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif",
              }}
            >
              {school?.short_name?.[0] || '校'}
            </span>
          )}
        </div>
        <div className="hidden sm:flex flex-col gap-[4px]">
          <p
            className="text-[18px] font-bold leading-6 tracking-normal text-[#1E2A44] whitespace-nowrap"
            style={{
              fontFamily: "'HarmonyOS Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif",
            }}
          >
            {school?.short_name || 'AI 教师工作空间'}
          </p>
          <p
            className="text-xs font-medium leading-[18px] text-[#8A94A6] whitespace-nowrap"
            style={{
              fontFamily: "'HarmonyOS Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif",
            }}
          >
            智能备课平台
          </p>
        </div>
      </Link>
      <nav className="flex gap-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${
              pathname === item.href || pathname.startsWith(item.href + '/')
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <Link
          href={`/teacher/${teacher.id}`}
          className="px-3 py-1.5 text-sm text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
          title="我的空间"
        >
          👤 我的空间
        </Link>
        {teacher.role === 'admin' && (
          <Link
            href="/admin/teachers"
            className="px-3 py-1.5 text-sm text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
            title="后台管理"
          >
            ⚙️ 后台管理
          </Link>
        )}
        <div className="relative" onMouseEnter={openMenu} onMouseLeave={closeMenu}>
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition">
            <AvatarCircle name={teacher.name} gender={(teacher as any)?.gender} size={28} />
            <span>{teacher.name}</span>
            <svg
              className="w-3 h-3 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {/* Invisible bridge to fill the gap between button and menu */}
          <div className="absolute left-0 right-0 h-2 top-full" />
          <div
            className={`absolute right-0 top-[calc(100%+8px)] w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 transition-opacity duration-150 ${menuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
          >
            <div className="px-4 py-2 border-b border-slate-100">
              <p className="text-sm font-medium text-slate-800">{teacher.name}</p>
              <p className="text-xs text-slate-400">
                {teacher.role === 'admin' ? '管理员' : '教师'}
              </p>
            </div>
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
            >
              ⚙️ 设置
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/login';
              }}
              className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
            >
              退出登录
            </button>
          </div>
        </div>
      </div>
      {teacher && (
        <UserSettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          teacher={teacher}
        />
      )}
    </header>
  );
}
