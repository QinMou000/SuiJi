import React, { useRef } from 'react';
import { cn } from '../../lib/utils';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
}

/** 鼠标悬停时的 3D 倾斜与高光跟随；触摸设备保持平面。 */
export function TiltCard({ children, className, intensity = 7 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const reset = () => {
    const element = ref.current;
    if (!element) return;
    cancelAnimationFrame(frame.current);
    element.style.setProperty('--rx', '0deg');
    element.style.setProperty('--ry', '0deg');
    element.style.setProperty('--mx', '50%');
    element.style.setProperty('--my', '50%');
  };

  const handleMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return;
    const element = ref.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      element.style.setProperty('--rx', `${(0.5 - y) * intensity}deg`);
      element.style.setProperty('--ry', `${(x - 0.5) * intensity}deg`);
      element.style.setProperty('--mx', `${x * 100}%`);
      element.style.setProperty('--my', `${y * 100}%`);
    });
  };

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      className={cn(
        'post-card transition-transform duration-300 ease-spring',
        '[@media(hover:hover)]:hover:shadow-lift',
        className,
      )}
      style={{
        transform: 'perspective(1000px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))',
      }}
    >
      {children}
    </div>
  );
}
