/* eslint-disable react-refresh/only-export-components -- Provider 与 useToast 需同文件导出 */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

type ToastVariant = 'default' | 'success' | 'error' | 'info';

interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastItem extends ToastInput {
  id: string;
}

interface ToastContextValue {
  toast: (input: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastVariant, React.ReactNode> = {
  default: <Sparkles className="h-4 w-4" />,
  success: <CheckCircle2 className="h-4 w-4" />,
  error: <AlertCircle className="h-4 w-4" />,
  info: <Info className="h-4 w-4" />,
};

const ICON_TONE: Record<ToastVariant, string> = {
  default: 'text-foreground',
  success: 'text-emerald-500',
  error: 'text-destructive',
  info: 'text-long',
};

/** 全局轻提示：顶部玻璃胶囊，最多同时保留 3 条。 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((input: ToastInput) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setItems(prev => [...prev.slice(-2), { ...input, id }]);
    window.setTimeout(
      () => setItems(prev => prev.filter(item => item.id !== id)),
      input.duration ?? 2800,
    );
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[110] flex flex-col items-center gap-2 px-4 pb-[calc(env(safe-area-inset-bottom)+5.75rem)]"
      >
        {items.map(item => {
          const variant = item.variant ?? 'default';
          return (
            <div
              key={item.id}
              className="glass-bar pointer-events-auto flex w-full max-w-md animate-fade-up items-start gap-3 rounded-2xl px-4 py-3 shadow-lift"
              role="status"
            >
              <span className={cn('mt-0.5 shrink-0', ICON_TONE[variant])}>{ICONS[variant]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug">{item.title}</p>
                {item.description && (
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast 必须在 ToastProvider 内使用');
  return context;
}
