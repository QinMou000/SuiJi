import React, { useId } from 'react';
import { cn } from '../../lib/utils';

interface ProgressRingProps {
  /** 剩余进度 0–1（1 为满环） */
  progress: number;
  size?: number;
  stroke?: number;
  /** 任意 CSS 颜色，通常传 hsl(var(--focus)) */
  color?: string;
  running?: boolean;
  paused?: boolean;
  className?: string;
  children?: React.ReactNode;
  ariaLabel?: string;
}

/**
 * 倒计时圆环。
 * - 主环表示「剩余时间」，随时间顺时针收缩；
 * - 内圈虚线缓慢旋转，模拟手绘scribble的呼吸感；
 * - 端点圆点带柔和光晕，暂停时降透明度。
 */
export function ProgressRing({
  progress,
  size = 300,
  stroke = 9,
  color = 'hsl(var(--foreground))',
  running = false,
  paused = false,
  className,
  children,
  ariaLabel = '倒计时进度',
}: ProgressRingProps) {
  const rawId = useId();
  const gradientId = `ring-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const safeProgress = Math.min(1, Math.max(0, progress));

  const center = size / 2;
  const radius = center - stroke / 2 - 3;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - safeProgress);

  const angle = safeProgress * 360 - 90;
  const radians = (angle * Math.PI) / 180;
  const dotX = center + radius * Math.cos(radians);
  const dotY = center + radius * Math.sin(radians);
  const showDot = safeProgress > 0.001 && safeProgress < 0.9995;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 -rotate-90"
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round((1 - safeProgress) * 100)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity={0.95} />
            <stop offset="100%" stopColor={color} stopOpacity={0.55} />
          </linearGradient>
        </defs>

        {/* 轨道 */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="hsl(var(--foreground) / 0.07)"
          strokeWidth={stroke}
        />

        {/* 手绘感内圈虚线 */}
        <circle
          cx={center}
          cy={center}
          r={radius - stroke - 12}
          fill="none"
          stroke="hsl(var(--foreground) / 0.16)"
          strokeWidth={1}
          strokeDasharray="1 8"
          strokeLinecap="round"
          className={cn('origin-center', running && 'animate-spin-slow')}
        />

        {/* 进度环 */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            transition: 'stroke-dashoffset 1s linear, opacity 0.4s ease',
            opacity: paused ? 0.55 : 1,
            filter: running ? `drop-shadow(0 0 6px ${color})` : undefined,
          }}
        />
      </svg>

      {/* 端点圆点 */}
      {showDot && (
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute h-3 w-3 rounded-full',
            paused ? 'opacity-50' : 'opacity-100',
          )}
          style={{
            left: dotX - 6,
            top: dotY - 6,
            backgroundColor: color,
            boxShadow: `0 0 0 3px hsl(var(--background)), 0 0 14px ${color}`,
            transition: 'left 1s linear, top 1s linear, opacity 0.4s ease',
          }}
        />
      )}

      <div className="relative z-10 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
