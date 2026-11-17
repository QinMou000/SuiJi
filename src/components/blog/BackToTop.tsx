import React, { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { cn } from '../../lib/utils';

/** 阅读到深处后出现的回顶按钮。 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY > 560);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <button
      type="button"
      aria-label="回到顶部"
      onClick={() => {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      }}
      className={cn(
        'glass-bar fixed bottom-[max(env(safe-area-inset-bottom),1.25rem)] right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full transition-all duration-300 ease-spring',
        visible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-3 opacity-0',
      )}
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
