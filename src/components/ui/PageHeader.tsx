import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backTo?: string;
  actions?: React.ReactNode;
  className?: string;
  /** 透明顶栏，用于内容自带背景的页面 */
  transparent?: boolean;
}

/** 二级页顶栏：返回按钮 + 标题 + 右侧操作，固定在安全区下方。 */
export function PageHeader({
  title,
  subtitle,
  onBack,
  backTo,
  actions,
  className,
  transparent = false,
}: PageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) return onBack();
    if (backTo) return navigate(backTo);
    navigate(-1);
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full pt-[env(safe-area-inset-top)]',
        transparent ? 'bg-transparent' : 'glass-bar border-x-0 border-t-0 rounded-none',
        className,
      )}
    >
      <div className="flex h-14 items-center justify-between gap-3 px-3">
        <button
          type="button"
          onClick={handleBack}
          aria-label="返回"
          className="-ml-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground transition-all hover:bg-secondary/60 active:scale-90"
        >
          <ChevronLeft className="h-6 w-6" strokeWidth={2} />
        </button>

        <div className="min-w-0 flex-1 text-center">
          <h1 className="truncate text-[15px] font-semibold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="truncate text-[10px] font-medium tracking-wide text-muted-foreground">{subtitle}</p>
          )}
        </div>

        <div className="flex min-w-10 shrink-0 items-center justify-end gap-0.5">{actions}</div>
      </div>
    </header>
  );
}
