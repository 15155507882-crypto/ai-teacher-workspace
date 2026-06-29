'use client';
import React from 'react';

// Dialog wrapper
export function AdminDialog({
  open,
  onClose,
  title,
  children,
  width = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative ${width} w-full bg-white rounded-2xl shadow-[0_24px_80px_rgba(15,23,42,0.22)] mx-4 animate-fade-in-up`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h3 className="text-lg font-bold text-[#10234f]">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            &times;
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// Delete confirm dialog
export function AdminDeleteDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-w-md w-full bg-white rounded-2xl shadow-[0_24px_80px_rgba(15,23,42,0.22)] mx-4 p-6 animate-fade-in-up">
        <div className="text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500 mx-auto mb-5">
            <svg
              className="h-7 w-7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-[#10234f] mb-2">{title}</h3>
          {description && <p className="text-sm text-[#7587ad] mb-5">{description}</p>}
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 text-[#53688f] hover:bg-slate-50 transition"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2.5 text-sm font-medium rounded-xl bg-red-600 text-white hover:bg-red-700 shadow-sm transition"
          >
            确认删除
          </button>
        </div>
      </div>
    </div>
  );
}

// Status tag
export function AdminStatusTag({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: '在职', cls: 'bg-green-50 text-green-700' },
    resigned: { label: '离职', cls: 'bg-gray-100 text-gray-500' },
    disabled: { label: '停用', cls: 'bg-orange-50 text-orange-700' },
    teacher: { label: '教师', cls: 'bg-blue-50 text-blue-700' },
    admin: { label: '管理员', cls: 'bg-purple-50 text-purple-700' },
  };
  const cfg = map[status] || { label: status, cls: 'bg-gray-50 text-gray-600' };
  return (
    <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// Filter bar
export function AdminFilterBar({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3 mb-5">{children}</div>;
}

// Page header
export function AdminPageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-1 rounded-full bg-blue-500" />
          <h2 className="text-2xl font-extrabold text-[#0f2354] tracking-normal">{title}</h2>
        </div>
        {subtitle && <p className="mt-2 ml-4 text-sm font-medium text-[#7587ad]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
