'use client';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';

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
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div
        className={cn(
          'relative w-full bg-white shadow-2xl overflow-y-auto animate-slide-in',
          width
        )}
      >
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400">
            ✕
          </Button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
