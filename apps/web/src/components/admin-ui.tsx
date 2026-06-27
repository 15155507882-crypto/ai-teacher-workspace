'use client';
import React, { useState } from 'react';

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
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        className={`relative ${width} w-full bg-white rounded-2xl shadow-xl mx-4 animate-fade-in-up`}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">
            &times;
          </button>
        </div>
        <div className="p-5">{children}</div>
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
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative max-w-sm w-full bg-white rounded-2xl shadow-xl mx-4 p-6 animate-fade-in-up">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4 text-2xl">
            ⚠️
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">{title}</h3>
          {description && <p className="text-sm text-slate-500 mb-4">{description}</p>}
        </div>
        <div className="flex gap-2 justify-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700"
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
    <span className={`inline-flex rounded-md px-2 py-0.5 text-sm font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// Filter bar
export function AdminFilterBar({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-3 mb-4">{children}</div>;
}

// Page header
export function AdminPageHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-xl font-bold text-slate-800">{title}</h2>
      {action}
    </div>
  );
}
