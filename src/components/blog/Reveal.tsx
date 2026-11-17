import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  once?: boolean;
}

/** 滚动进入视口时上浮显影；减少动效时由 CSS 直接显示。 */
export function Reveal({ children, className, delay = 0, once = true }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) observer.disconnect();
          } else if (!once) {
            setVisible(false);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -32px 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [once]);

  return (
    <div
      ref={ref}
      className={cn('reveal', visible && 'reveal-visible', className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
