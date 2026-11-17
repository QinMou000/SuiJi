import React, { useEffect, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
  /** 小数位数，默认 0 */
  decimals?: number;
}

/** 数字滚动过渡：从旧值缓动到新值，尊重 reduce-motion。 */
export function AnimatedNumber({ value, duration = 650, className, decimals = 0 }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const previousRef = useRef(value);

  useEffect(() => {
    const from = previousRef.current;
    const to = value;
    previousRef.current = value;
    if (from === to) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(to);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (to - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return (
    <span className={cn('timer-digits', className)}>
      {display.toFixed(decimals)}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('relative overflow-hidden rounded-2xl bg-secondary/70', className)}
      aria-hidden
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-background/60 to-transparent" />
    </div>
  );
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-border bg-secondary/40 text-muted-foreground">
        {icon}
      </div>
      <p className="text-base font-semibold tracking-tight">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-[16rem] text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

interface StepperProps {
  label: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}

/** 设置项里的数字步进器：两端按钮 + 中间可读数值。 */
export function Stepper({
  label,
  description,
  value,
  min,
  max,
  step = 1,
  unit = '分钟',
  onChange,
}: StepperProps) {
  const clamp = (next: number) => Math.min(max, Math.max(min, next));

  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1 rounded-full bg-secondary/70 p-1">
        <button
          type="button"
          aria-label={`减少${label}`}
          disabled={value <= min}
          onClick={() => onChange(clamp(value - step))}
          className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground active:scale-90 disabled:opacity-30"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="min-w-[3.6rem] text-center text-sm font-semibold timer-digits">
          {value}
          <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">{unit}</span>
        </span>
        <button
          type="button"
          aria-label={`增加${label}`}
          disabled={value >= max}
          onClick={() => onChange(clamp(value + step))}
          className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground active:scale-90 disabled:opacity-30"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
