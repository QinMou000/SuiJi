import React, { useEffect, useState } from 'react';

/** 文章详情顶部阅读进度：2px 渐变线，跟随滚动缩放。 */
export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      const next = documentHeight > 0 ? window.scrollY / documentHeight : 0;
      setProgress(Math.min(1, Math.max(0, next)));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-[2px]">
      <div
        className="h-full w-full origin-left bg-gradient-to-r from-focus via-long to-short transition-transform duration-150 ease-out"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  );
}
