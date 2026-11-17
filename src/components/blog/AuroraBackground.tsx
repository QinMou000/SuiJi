import React from 'react';
import { cn } from '../../lib/utils';

interface AuroraBackgroundProps {
  className?: string;
  intense?: boolean;
}

/** 博客 Hero 的极光背景：三层缓慢漂移的模糊光斑 + 网格。 */
export function AuroraBackground({ className, intense = false }: AuroraBackgroundProps) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      {/* 顶部两盏暖光：各自呼吸、漂移，叠加起来色相在珊瑚与琥珀之间来回 */}
      <div className="hero-warm" />
      <div className="hero-warm hero-warm--amber" />

      <div
        className={cn(
          'aurora-blob animate-aurora-1 h-[22rem] w-[22rem] -left-24 -top-20',
          intense ? 'opacity-70 dark:opacity-45' : 'opacity-50 dark:opacity-30',
        )}
        style={{ backgroundColor: 'hsl(var(--focus) / 0.55)' }}
      />
      <div
        className={cn(
          'aurora-blob animate-aurora-2 h-[26rem] w-[26rem] -right-28 top-10',
          intense ? 'opacity-60 dark:opacity-40' : 'opacity-45 dark:opacity-25',
        )}
        style={{ backgroundColor: 'hsl(var(--long-break) / 0.5)' }}
      />
      <div
        className={cn(
          'aurora-blob animate-aurora-1 h-[18rem] w-[18rem] left-1/3 top-24',
          intense ? 'opacity-50 dark:opacity-35' : 'opacity-35 dark:opacity-20',
        )}
        style={{
          backgroundColor: 'hsl(var(--short-break) / 0.45)',
          animationDelay: '-8s',
          animationDuration: '32s',
        }}
      />
      <div className="hero-grid absolute inset-0 opacity-70" />
      {/* 收尾渐隐必须显式抬高层级：极光光斑带 filter/will-change 会被提升成独立合成层，
          绘制顺序会压过后面这层同级的渐变块，导致 Hero 底部露出一条色带。 */}
      <div className="absolute inset-x-0 bottom-0 z-10 h-52 bg-gradient-to-b from-transparent to-background" />
    </div>
  );
}
