import React, { useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpenText, Settings, Timer } from 'lucide-react';
import { cn } from '../lib/utils';
import { usePomodoroClock, usePomodoroState } from '../features/pomodoro/PomodoroProvider';
import { MODE_META } from '../features/pomodoro/constants';
import { formatClock, remainingOf } from '../features/pomodoro/time';

interface LayoutProps {
  children: React.ReactNode;
  mainClassName?: string;
  motion?: 'slide' | 'none';
  /** 沉浸计时：隐藏底部 Dock，把画面让给放大的表盘 */
  immersive?: boolean;
}

const NAV_ITEMS = [
  {
    to: '/blog',
    icon: BookOpenText,
    label: '博客',
    match: (path: string) => path.startsWith('/blog'),
  },
  {
    to: '/',
    icon: Timer,
    label: '专注',
    match: (path: string) =>
      path === '/' || path.startsWith('/pomodoro') || path.startsWith('/stats'),
  },
  {
    to: '/settings',
    icon: Settings,
    label: '设置',
    match: (path: string) => path.startsWith('/settings'),
  },
];

/** 计时中时，把剩余时间直接显示在 Dock 的「专注」标签上，避免悬浮块遮挡内容。 */
function useDockTimerLabel() {
  const { status, mode, runtime } = usePomodoroState();
  const now = usePomodoroClock();
  if (status === 'idle') return null;
  return {
    mode,
    timeLabel: formatClock(remainingOf(runtime, now)),
    running: status === 'running',
  };
}

/**
 * 应用主框架。
 * 不再有顶部标题/品牌栏：内容直接从安全区开始，由页面自己的 Hero、表盘或分区承担视觉重心。
 * 底部 Dock 的选中胶囊与 48px 导航项、60px Dock 内边距保持同心圆角。
 */
export function Layout({ children, mainClassName, motion = 'slide', immersive = false }: LayoutProps) {
  const location = useLocation();
  const dockTimer = useDockTimerLabel();
  const [indicator, setIndicator] = useState({ left: 0, width: 0, visible: false });
  const isFocusSurface =
    location.pathname === '/' || location.pathname === '/pomodoro';
  const focusTimer = isFocusSurface ? null : dockTimer;

  const dockRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const activeIndex = NAV_ITEMS.findIndex(item => item.match(location.pathname));

  useLayoutEffect(() => {
    const update = () => {
      const dock = dockRef.current;
      const item = activeIndex >= 0 ? itemRefs.current[activeIndex] : null;
      if (!dock || !item) {
        setIndicator(previous => ({ ...previous, visible: false }));
        return;
      }
      const dockRect = dock.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();
      // left-0 的绝对定位基准是 padding box，需扣掉 Dock 的 1px 边框
      setIndicator({
        left: itemRect.left - dockRect.left - dock.clientLeft,
        width: itemRect.width,
        visible: true,
      });
    };

    update();
    const frame = requestAnimationFrame(update);
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
    };
  }, [activeIndex, location.pathname]);

  return (
    <div className="relative mx-auto flex min-h-screen max-w-md flex-col">
      <main
        key={location.pathname}
        className={cn(
          'flex-1 px-4 pb-32 pt-[calc(env(safe-area-inset-top)+0.75rem)]',
          motion === 'slide' && 'page-slide',
          mainClassName,
        )}
      >
        {children}
      </main>

      {/* 浮动胶囊 Dock：选中胶囊与容器内边距同心 */}
      <nav
        aria-label="主导航"
        aria-hidden={immersive}
        className={cn(
          'fixed left-1/2 z-50 -translate-x-1/2 transition-all duration-500 ease-spring',
          immersive && 'pointer-events-none translate-y-6 opacity-0',
        )}
        style={{ bottom: 'max(env(safe-area-inset-bottom), 0.9rem)' }}
      >
        <div ref={dockRef} className="glass-bar relative flex items-center gap-1 rounded-full p-1.5">
          <span
            aria-hidden
            className={cn(
              'absolute inset-y-1.5 left-0 rounded-full bg-secondary/90 ring-1 ring-foreground/5 transition-all duration-420 ease-spring',
              'shadow-[0_4px_16px_-6px_hsl(var(--focus)/0.45)]',
              indicator.visible ? 'opacity-100' : 'opacity-0',
            )}
            style={{
              width: indicator.width,
              transform: `translateX(${indicator.left}px)`,
            }}
          />

          {NAV_ITEMS.map((item, index) => {
            const active = index === activeIndex;
            const showTimer = item.to === '/' && Boolean(focusTimer);
            const timerAccent = focusTimer
              ? `hsl(var(${MODE_META[focusTimer.mode].accentVar}))`
              : undefined;

            return (
              <Link
                key={item.to}
                to={item.to}
                ref={element => {
                  itemRefs.current[index] = element;
                }}
                aria-current={active ? 'page' : undefined}
                aria-label={showTimer ? `专注，剩余 ${focusTimer?.timeLabel}` : item.label}
                className={cn(
                  'relative z-10 flex h-12 w-[4.6rem] flex-col items-center justify-center gap-0.5 rounded-full transition-colors active:scale-90',
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <item.icon
                  className={cn(
                    'h-[19px] w-[19px] transition-transform duration-300',
                    active && 'scale-105',
                  )}
                  strokeWidth={active ? 2.3 : 1.9}
                />
                <span
                  data-testid={showTimer ? 'mini-timer' : undefined}
                  className={cn(
                    'text-[10px] font-medium',
                    showTimer && 'timer-digits text-[9px] font-semibold tabular-nums',
                  )}
                  style={showTimer ? { color: timerAccent } : undefined}
                >
                  {showTimer ? focusTimer?.timeLabel : item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
