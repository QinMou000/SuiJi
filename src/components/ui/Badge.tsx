import React from 'react';
import { cn } from '../../lib/utils';

type BadgeVariant = 'neutral' | 'outline' | 'focus' | 'short' | 'long' | 'success' | 'danger';

const VARIANTS: Record<BadgeVariant, string> = {
  neutral: 'bg-secondary text-secondary-foreground',
  outline: 'border border-border text-muted-foreground',
  focus: 'bg-focus/10 text-focus',
  short: 'bg-short/10 text-short',
  long: 'bg-long/10 text-long',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  danger: 'bg-destructive/10 text-destructive',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold leading-5',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
