'use client';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ChevronDown,
  GraduationCap,
  LogOut,
  School,
  Settings,
  Users,
  LayoutList,
  Shield,
  Home,
} from 'lucide-react';

interface MenuItem {
  href?: string;
  label: string;
  key: string;
  icon: React.ReactNode;
  children?: { href: string; label: string; key: string; icon: React.ReactNode }[];
}

const menuItems: MenuItem[] = [
  {
    href: '/admin/teachers',
    label: '教师管理',
    key: 'teachers',
    icon: <Users className="h-[22px] w-[22px]" />,
  },
  {
    href: '/admin/departments',
    label: '组织管理',
    key: 'departments',
    icon: <LayoutList className="h-[22px] w-[22px]" />,
  },
  {
    href: '/admin/home-groups',
    label: '备课组',
    key: 'home-groups',
    icon: <School className="h-[22px] w-[22px]" />,
  },
  {
    href: '/admin/roles',
    label: '角色管理',
    key: 'roles',
    icon: <Shield className="h-[22px] w-[22px]" />,
  },
  {
    label: '系统设置',
    key: 'sys-settings',
    icon: <Settings className="h-[22px] w-[22px]" />,
    children: [
      {
        href: '/admin/settings/school',
        label: '学校信息',
        key: 'school',
        icon: <GraduationCap className="h-4 w-4" />,
      },
      {
        href: '/admin/settings/academic-years',
        label: '学年管理',
        key: 'academic-years',
        icon: <LayoutList className="h-4 w-4" />,
      },
      {
        href: '/admin/settings/ai-config',
        label: 'AI 配置',
        key: 'ai-config',
        icon: <Settings className="h-4 w-4" />,
      },
      {
        href: '/admin/settings/ai-logs',
        label: 'AI 日志',
        key: 'ai-logs',
        icon: <LayoutList className="h-4 w-4" />,
      },
    ],
  },
];

function isChildActive(pathname: string, children?: { href: string }[]) {
  if (!children) return false;
  return children.some((c) => pathname.startsWith(c.href));
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [teacher, setTeacher] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const sysChildren = menuItems.find((m) => m.key === 'sys-settings')?.children;
  const [expanded, setExpanded] = useState(() => isChildActive(pathname, sysChildren));

  useEffect(() => {
    setExpanded(isChildActive(pathname, sysChildren));
  }, [pathname, sysChildren]);

  useEffect(() => {
    const t = localStorage.getItem('teacher');
    if (!t || JSON.parse(t).role !== 'admin') {
      router.push('/workspace');
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

  const logout = () => {
    localStorage.clear();
    router.push('/login');
  };

  return (
    <div className="flex h-screen bg-[linear-gradient(180deg,#f6f9ff_0%,#fbfdff_52%,#f6f9ff_100%)]">
      {/* ===== Sidebar: 280px ===== */}
      <aside className="w-[280px] shrink-0 bg-white border-r border-[#E8EEF7] flex flex-col">
        {/* ===== Brand Header: 160px ===== */}
        <div
          className="relative h-[160px] shrink-0 overflow-hidden"
          style={{ background: 'linear-gradient(180deg, #F8FBFF 0%, #F4F8FF 100%)' }}
        >
          {/* Decorative wave (bottom-right, 8% opacity) */}
          <svg
            className="absolute bottom-0 right-0 pointer-events-none"
            width="160"
            height="80"
            viewBox="0 0 160 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ opacity: 0.08 }}
          >
            <path
              d="M0 80C20 55 40 20 60 30C80 40 100 60 120 45C140 30 155 15 160 10V80H0Z"
              fill="#2E6CFF"
            />
            <path
              d="M0 80C30 60 50 45 70 50C90 55 110 70 130 60C150 50 158 40 160 38V80H0Z"
              fill="#2E6CFF"
              opacity="0.5"
            />
          </svg>

          <div className="relative z-10 flex flex-col items-center px-6 pt-6">
            {/* Logo: 56x56, rounded 16px */}
            <div className="mb-3">
              {school?.logo_data ? (
                <div className="rounded-2xl bg-white p-1.5 shadow-[0_8px_24px_rgba(41,88,170,.08)]">
                  <img
                    src={school.logo_data}
                    alt="学校 Logo"
                    className="h-14 w-14 rounded-xl object-contain"
                  />
                </div>
              ) : school?.logo_file_id ? (
                <div className="rounded-2xl bg-white p-1.5 shadow-[0_8px_24px_rgba(41,88,170,.08)]">
                  <img
                    src={`/api/files/${school.logo_file_id}/preview`}
                    alt="学校 Logo"
                    className="h-14 w-14 rounded-xl object-contain"
                  />
                </div>
              ) : (
                <div className="rounded-2xl bg-white p-1.5 shadow-[0_8px_24px_rgba(41,88,170,.08)]">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-2xl font-bold text-white">
                    {school?.short_name?.[0] || '校'}
                  </div>
                </div>
              )}
            </div>

            {/* School Name */}
            <h2
              className="text-[26px] font-bold tracking-[0.5px] text-[#10234f] leading-none"
              style={{
                fontFamily: "'HarmonyOS Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif",
              }}
            >
              {school?.short_name || '宣城五小'}
            </h2>

            {/* Subtitle */}
            <p className="mt-1 text-[14px] font-medium text-[#7b8cab]">AI智慧备课管理平台</p>

            {/* Version Badge */}
            <span className="mt-1.5 inline-flex h-7 items-center gap-1 rounded-full bg-[#EEF5FF] px-3.5 text-[13px] font-semibold text-[#2E6CFF]">
              <span className="text-xs">🏫</span>
              校园版 V2.0
            </span>
          </div>

          {/* Bottom border */}
          <div className="absolute bottom-0 left-0 right-0 border-b border-[#edf2fb]" />
        </div>

        {/* ===== Navigation: flex-1 ===== */}
        <nav className="flex-1 overflow-y-auto px-4 pt-[18px] pb-2 space-y-2">
          {menuItems.map((item) => {
            if (item.children) {
              const isActive = isChildActive(pathname, item.children);
              return (
                <div key={item.key}>
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className={`w-full text-left rounded-[14px] h-12 px-4 text-[16px] font-semibold transition flex items-center gap-3 ${
                      isActive ? 'text-[#10234f] bg-[#EEF4FF]' : 'text-[#29466F] hover:bg-[#F6F9FF]'
                    }`}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {expanded && (
                    <div className="mt-1 ml-7 pl-3 space-y-1 border-l-2 border-[#E8EEF7]">
                      {item.children.map((child) => {
                        const childActive = pathname.startsWith(child.href);
                        return (
                          <button
                            key={child.key}
                            onClick={() => router.push(child.href)}
                            className={`w-full text-left rounded-[14px] h-12 px-4 text-[15px] font-semibold transition flex items-center gap-2.5 ${
                              childActive
                                ? 'text-[#10234f] bg-[#EEF4FF] border-l-[4px] border-[#2E6CFF] -ml-[19px] pl-[19px]'
                                : 'text-[#53688F] hover:bg-[#F6F9FF] hover:text-[#29466F]'
                            }`}
                          >
                            <span className="shrink-0">{child.icon}</span>
                            {child.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            const itemActive = pathname === item.href;
            return (
              <button
                key={item.key}
                onClick={() => router.push(item.href!)}
                className={`w-full text-left rounded-[14px] h-12 px-4 text-[16px] font-semibold transition flex items-center gap-3 ${
                  itemActive
                    ? 'text-[#10234f] bg-[#EEF4FF] border-l-[4px] border-[#2E6CFF] -ml-1 pl-3'
                    : 'text-[#29466F] hover:bg-[#F6F9FF]'
                }`}
              >
                <span className="shrink-0">{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* ===== Bottom User: 110px ===== */}
        <div className="h-[110px] shrink-0 border-t border-[#E8EEF7] px-4 py-3 flex flex-col justify-between">
          {/* User info row */}
          <div className="flex items-center gap-3">
            {/* Avatar: 48px gradient circle with initial */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-xl font-bold text-white shadow-[0_4px_12px_rgba(37,99,235,.25)]">
              {teacher.name?.[0] || '管'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[18px] font-semibold text-[#10234f] truncate leading-tight">
                {teacher.name}
              </p>
              <p className="text-[13px] font-medium text-[#8A98B5] truncate leading-tight mt-0.5">
                系统管理员
              </p>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-[#8A98B5]" />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/home')}
              className="flex-1 h-9 flex items-center justify-center gap-1.5 rounded-[14px] border border-[#E8EEF7] text-[13px] font-semibold text-[#53688F] hover:bg-[#F6F9FF] hover:text-[#29466F] transition"
            >
              <Home className="h-4 w-4" />
              首页
            </button>
            <button
              onClick={logout}
              className="flex-1 h-9 flex items-center justify-center gap-1.5 rounded-[14px] border border-red-200 bg-white text-[13px] font-semibold text-red-500 hover:bg-red-50 transition"
            >
              <LogOut className="h-4 w-4" />
              退出
            </button>
          </div>
        </div>
      </aside>

      {/* ===== Main Content ===== */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
