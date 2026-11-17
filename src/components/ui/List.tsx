import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SectionHeadingProps {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeading({ title, hint, action, className }: SectionHeadingProps) {
  return (
    <div className={cn('mb-3 flex items-end justify-between gap-3 px-1', className)}>
      <div>
        <h2 className="eyebrow">{title}</h2>
        {hint && <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

interface ListRowProps {
  icon?: React.ReactNode;
  label: string;
  description?: string;
  onClick?: () => void;
  href?: string;
  trailing?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  className?: string;
}

/** 设置/列表通用行：图标瓦片 + 标题说明 + 尾部控件。 */
export function ListRow({
  icon,
  label,
  description,
  onClick,
  href,
  trailing,
  disabled = false,
  danger = false,
  className,
}: ListRowProps) {
  const content = (
    <>
      {icon && (
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
            danger ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-foreground/80',
          )}
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-sm font-medium',
            danger ? 'text-destructive' : 'text-foreground',
          )}
        >
          {label}
        </span>
        {description && (
          <span className="mt-0.5 block text-[11px] font-normal leading-relaxed text-muted-foreground">
            {description}
          </span>
        )}
      </span>
      {trailing !== undefined ? (
        <span className="shrink-0 text-muted-foreground">{trailing}</span>
      ) : onClick || href ? (
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
      ) : null}
    </>
  );

  const classes = cn(
    'flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors',
    'hover:bg-secondary/45 active:bg-secondary/70 disabled:opacity-40',
    className,
  );

  if (href) {
    return (
      <a href={href} className={classes} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={classes}>
      {content}
    </button>
  );
}

/** 模式名轮播（Effect Atlas 的 Masked Word Flip 简化版）。 */
export function MaskedText({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cn('inline-flex h-[1.18em] items-center overflow-hidden align-bottom', className)}>
      <span key={text} className="block animate-word-in whitespace-nowrap">
        {text}
      </span>
    </span>
  );
}
