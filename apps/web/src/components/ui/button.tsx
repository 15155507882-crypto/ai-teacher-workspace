import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-[10px] text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--color-primary)] text-white shadow-sm hover:bg-[var(--color-primary-hover)] active:scale-[0.98]',
        secondary:
          'bg-white border border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-bg-muted)]',
        outline:
          'border border-[var(--color-border)] bg-white text-[var(--color-text-body)] hover:bg-[var(--color-bg-muted)]',
        ghost: 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)]',
        destructive: 'bg-[var(--color-danger)] text-white hover:opacity-90',
      },
      size: {
        sm: 'h-8 px-3 text-sm rounded-[8px]',
        default: 'h-10 px-4 text-sm',
        lg: 'h-11 px-6 text-sm',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  )
);
Button.displayName = 'Button';
