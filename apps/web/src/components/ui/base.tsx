'use client';
import React from 'react';

export function AppButton({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'ai-action';
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-xs gap-1.5 h-9',
    md: 'px-4 py-2 text-sm gap-2 h-10',
    lg: 'px-6 py-2.5 text-sm gap-2 h-11',
  };
  const variants: Record<string, string> = {
    primary:
      'bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-500)] shadow-sm',
    secondary:
      'bg-[var(--color-bg-muted)] text-[var(--color-text-normal)] hover:bg-[var(--color-border)] border border-[var(--color-border)]',
    ghost: 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)]',
    danger: 'bg-[var(--color-danger)] text-white hover:opacity-90',
    'ai-action':
      'bg-[var(--color-primary-50)] text-[var(--color-primary-600)] hover:bg-[var(--color-primary-600)] hover:text-white font-medium',
  };
  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 rounded-[var(--radius-md)] disabled:opacity-40 disabled:cursor-not-allowed ${sizes[size]} ${variants[variant]} ${className}`}
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
      className={`w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-3 py-2.5 text-sm text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary-500)] focus:bg-[var(--color-bg-surface)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary-500)] transition-all h-11 ${className}`}
      {...props}
    />
  );
}

export function AppCard({
  children,
  className = '',
  onClick,
  hover,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-[var(--shadow-card)] transition-all duration-150 ${
        onClick || hover
          ? 'cursor-pointer hover:border-[var(--color-primary-500)] hover:shadow-[var(--shadow-float)]'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function AppTag({
  color = 'default',
  children,
}: {
  color?: 'blue' | 'green' | 'orange' | 'red' | 'default';
  children: React.ReactNode;
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    orange: 'bg-orange-50 text-orange-700',
    red: 'bg-red-50 text-red-700',
    default: 'bg-gray-100 text-gray-600',
  };
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${colors[color]}`}
    >
      {children}
    </span>
  );
}
