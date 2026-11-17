import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  /** 是否显示右上角关闭按钮 */
  showClose?: boolean;
}

/**
 * 移动端底部弹层：遮罩 + 玻璃面板 + 拖拽条。
 * 关闭时保留 220ms 退出动画，避免面板瞬间消失。
 */
export function Sheet({ open, onClose, title, description, children, footer, className, showClose = true }: SheetProps) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  // 关闭回调存 ref：父组件因计时心跳频繁重渲染时，不重置焦点与滚动锁
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      restoreFocusRef.current = document.activeElement as HTMLElement | null;
      return;
    }
    if (!mounted) return;
    setClosing(true);
    const timer = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
      restoreFocusRef.current?.focus?.();
    }, 220);
    return () => window.clearTimeout(timer);
  }, [open, mounted]);

  useEffect(() => {
    if (!mounted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const focusTimer = window.setTimeout(() => panelRef.current?.focus(), 60);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center" role="presentation">
      <div
        className={cn(
          'absolute inset-0 bg-black/45 backdrop-blur-[3px]',
          closing ? 'opacity-0 transition-opacity duration-200' : 'animate-fade-in',
        )}
        onClick={onClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'relative w-full max-w-md outline-none',
          closing ? 'animate-slide-down' : 'animate-slide-up',
        )}
      >
        <div
          className={cn(
            'mx-2 mb-[max(env(safe-area-inset-bottom),0.5rem)] overflow-hidden rounded-[2rem] border border-border/70 bg-background/95 shadow-[0_-18px_60px_-20px_hsl(var(--glass-shadow)/0.45)] backdrop-blur-2xl',
            className,
          )}
        >
          <div className="flex justify-center pt-2.5">
            <span className="h-1 w-9 rounded-full bg-foreground/15" aria-hidden />
          </div>

          {(title || showClose) && (
            <div className="flex items-start justify-between gap-4 px-5 pb-1 pt-3">
              <div className="min-w-0">
                {title && <h2 className="text-lg font-semibold tracking-tight">{title}</h2>}
                {description && (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
                )}
              </div>
              {showClose && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="关闭"
                  className="-mr-2 -mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground active:scale-90"
                >
                  <X className="h-[18px] w-[18px]" />
                </button>
              )}
            </div>
          )}

          <div className="max-h-[70vh] overflow-y-auto px-5 py-3">{children}</div>

          {footer && (
            <div className="border-t border-border/60 px-5 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
