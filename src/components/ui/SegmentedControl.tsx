import React from 'react';
import { cn } from '../../lib/utils';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
  ariaLabel?: string;
}

/**
 * 分段控件：滑块指示器随选项平移（Effect Atlas 式的弹性位移）。
 * 纯 CSS transform，无布局抖动。
 */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className,
  size = 'md',
  ariaLabel,
}: SegmentedControlProps<T>) {
  const activeIndex = Math.max(0, options.findIndex(o => o.value === value));

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('glass-inset relative flex rounded-full p-1', className)}
    >
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 rounded-full bg-background shadow-[0_2px_8px_-2px_hsl(var(--glass-shadow)/0.25)] ring-1 ring-black/[0.03] transition-transform duration-380 ease-spring dark:bg-secondary"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {options.map(option => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative z-10 inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2 font-medium transition-colors duration-200',
              size === 'sm' ? 'h-9 text-xs' : 'h-10 text-[13px]',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80',
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
