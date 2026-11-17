import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../../lib/utils';

/**
 * 标题逐字入场：每个字从散开的位置带着旋转弹进来，身后拖一串自己的残影，
 * 落定时残影收拢。参考 Effect Atlas 的弹跳文字 + 拖影入场两种效果。
 */
export function SplitTitle({ text }: { text: string }) {
  return (
    <span className="hero-split">
      {Array.from(text).map((char, index) => (
        <span
          key={`${char}-${index}`}
          aria-hidden
          className="hero-char"
          style={
            {
              '--i': index,
              // 相邻字往相反方向甩，入场时才有错落感
              '--dir': index % 2 === 0 ? -1 : 1,
            } as CSSProperties
          }
        >
          {char}
        </span>
      ))}
    </span>
  );
}

/** 一行字从左侧甩进来，尾巴上是一串半透明的自己。 */
export function SmearText({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <span className={cn('hero-smear', className)} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </span>
  );
}
