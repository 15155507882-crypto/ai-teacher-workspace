'use client';
import React from 'react';

export function AppButton({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
}) {
  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
  };
  const variants: Record<string, string> = {
    primary: 'bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-500)]',
    secondary:
      'bg-[var(--color-bg-muted)] text-[var(--color-text-normal)] hover:bg-[var(--color-border)]',
    ghost: 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)]',
    danger: 'bg-[var(--color-danger)] text-white hover:opacity-90',
  };
  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition rounded-lg disabled:opacity-40 ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function AppInput({
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary-500)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary-500)] transition ${className}`}
      {...props}
    />
  );
}

export function AppCard({
  children,
  className = '',
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-[var(--shadow-card)] ${onClick ? 'cursor-pointer hover:border-[var(--color-primary-500)] transition' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
