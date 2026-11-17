import React, { useEffect, useState } from 'react';
import { ChevronLeft, Share2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ArticleHeaderProps {
  title: string;
  category: string;
  onBack: () => void;
  onShare: () => void;
}

/**
 * 文章顶栏：返回与分享常驻；题目与分类在正文里有一套大字标题，
 * 这里只在滚过正文标题之后淡入，避免同一个标题连在一起出现两次。
 */
export function ArticleHeader({ title, category, onBack, onShare }: ArticleHeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 96);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <header
      className="glass-bar sticky top-0 z-40 w-full rounded-none border-x-0 border-t-0 pt-[env(safe-area-inset-top)]"
      style={{ backgroundColor: 'hsl(var(--background))' }}
    >
      <div className="flex min-h-14 items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="返回博客"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary/60 active:scale-90"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <div
          className={cn(
            'min-w-0 flex-1 text-center transition-opacity duration-300',
            scrolled ? 'opacity-100' : 'opacity-0',
          )}
        >
          <h1 className="line-clamp-2 text-[13px] font-semibold leading-[1.3] tracking-tight">
            {title}
          </h1>
          <p className="mt-0.5 truncate text-[9px] font-semibold tracking-[0.18em] text-focus">
            {category}
          </p>
        </div>

        <button
          type="button"
          onClick={onShare}
          aria-label="分享文章"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground active:scale-90"
        >
          <Share2 className="h-[18px] w-[18px]" />
        </button>
      </div>
    </header>
  );
}
