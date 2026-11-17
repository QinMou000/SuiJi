import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive' | 'soft';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-foreground shadow-[0_1px_0_0_hsl(0_0%_100%/0.12)_inset] hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost: 'text-foreground hover:bg-secondary/70',
  outline: 'border border-border bg-transparent text-foreground hover:bg-secondary/50',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  soft: 'bg-foreground/[0.06] text-foreground hover:bg-foreground/[0.1]',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-[13px] gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-14 px-7 text-base gap-2.5',
  icon: 'h-11 w-11',
  'icon-sm': 'h-9 w-9',
  'icon-lg': 'h-[3.75rem] w-[3.75rem]',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

/**
 * 基础按钮：shadcn 式 variant/size API，统一 44px 触控下限与按压反馈。
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading = false, fullWidth = false, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'relative inline-flex select-none items-center justify-center overflow-hidden rounded-full font-medium',
        'transition-all duration-200 ease-spring active:scale-[0.97]',
        'disabled:pointer-events-none disabled:opacity-40',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
