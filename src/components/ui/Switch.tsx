import React from 'react';
import { cn } from '../../lib/utils';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

/** 无障碍开关：滑块用 CSS transform，避免 reflow。 */
export function Switch({ checked, onChange, disabled, className, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={props['aria-label']}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-7 w-[3.05rem] shrink-0 rounded-full border transition-colors duration-300 ease-spring',
        'after:absolute after:-inset-2 after:content-[""]',
        checked ? 'border-primary bg-primary' : 'border-border bg-secondary',
        'active:scale-[0.96] disabled:opacity-40',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute top-1/2 h-[1.4rem] w-[1.4rem] -translate-y-1/2 rounded-full bg-white shadow-sm transition-[left] duration-300 ease-spring',
          checked ? 'left-[1.5rem]' : 'left-[0.15rem]',
        )}
      />
    </button>
  );
}
