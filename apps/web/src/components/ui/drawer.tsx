'use client';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { X } from 'lucide-react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}

export function Drawer({ open, onClose, title, children, width = 'max-w-2xl' }: DrawerProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'relative my-3 mr-3 flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)] animate-slide-in',
          width
        )}
      >
        <div className="z-10 flex items-center justify-between border-b border-slate-100 bg-[#f7faff] px-6 py-4">
          <div>
            <h3 className="text-lg font-extrabold text-[#10234f]">{title}</h3>
            <p className="mt-1 text-sm font-medium text-[#8292b4]">查看资料内容、附件与互动记录</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-9 w-9 rounded-full p-0 text-slate-400 hover:bg-white hover:text-blue-600"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
