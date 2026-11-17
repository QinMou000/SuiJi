import React, { useEffect, useState } from 'react';
import { Minimize2, Pause, Play } from 'lucide-react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { DiscCarouselTimer } from '../components/pomodoro/DiscCarouselTimer';
import { FocusAmbience } from '../components/pomodoro/FocusAmbience';
import { usePomodoro } from '../features/pomodoro/PomodoroProvider';
import { MODE_META } from '../features/pomodoro/constants';
import type { PomodoroMode } from '../features/pomodoro/types';
import { useFocusOverview } from '../features/pomodoro/useSessions';
import { formatMinutesCompact } from '../features/pomodoro/time';
import { cn } from '../lib/utils';

/** 番茄钟主界面：三盘 Disc Carousel + 沉浸计时 + 今日概览。 */
export function Pomodoro() {
  const {
    settings,
    runtime,
    mode,
    status,
    progress,
    timeLabel,
    isRunning,
    isPaused,
    start,
    pause,
    switchMode,
  } = usePomodoro();
  const { today } = useFocusOverview();

  const [immersive, setImmersive] = useState(isRunning);
  const meta = MODE_META[mode];

  useEffect(() => {
    // 开始 / 继续计时时进入沉浸；暂停、结束、重置时恢复。
    // 用户主动退出全屏后，计时仍会继续，但不再自动展开。
    setImmersive(isRunning);
  }, [isRunning]);

  const accent = `hsl(var(${meta.accentVar}))`;
  const accentForeground = `hsl(var(${meta.accentVar}-foreground))`;

  const primaryLabel = isRunning
    ? pauseLabel(mode)
    : isPaused
      ? '继续'
      : mode === 'focus'
        ? '开始专注'
        : '开始休息';

  const handleModeChange = (nextMode: PomodoroMode) => {
    if (nextMode === mode) return;
    // 滑动切换直接生效：不再弹确认窗口；计时中切换会按原有逻辑结束本轮。
    switchMode(nextMode);
  };

  return (
    <Layout immersive={immersive}>
      <div
        className="relative"
        style={
          {
            '--mode-color': accent,
            // 页面顶部（含状态栏区域）由这张页自己的氛围光着色，
            // 内容再按安全区下沉，避免顶部出现一条纯色断层。
            marginTop: 'calc(-1 * (env(safe-area-inset-top) + 0.75rem))',
            paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)',
          } as React.CSSProperties
        }
      >
        {/* 模式氛围光 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-8 -z-10 h-[520px]"
          style={{
            background: `radial-gradient(80% 60% at 50% 24%, hsl(var(${meta.accentVar}) / 0.16), transparent 68%)`,
          }}
        />

        {/* 沉浸计时的环境光：色相与光源位置随本轮进度缓慢变化 */}
        <FocusAmbience mode={mode} elapsed={1 - progress} visible={immersive} />

        <section className="flex flex-col items-center">
          <DiscCarouselTimer
            mode={mode}
            status={status}
            progress={progress}
            timeLabel={timeLabel}
            focusCycleCount={runtime.focusCycleCount}
            longBreakInterval={settings.longBreakInterval}
            settings={settings}
            immersive={immersive}
            onSelectMode={handleModeChange}
          />
        </section>

        {/* 非沉浸状态下的控制、统计与记录 */}
        <div
          className={cn(
            'transition-all duration-500 ease-spring',
            immersive
              ? 'pointer-events-none -translate-y-2 opacity-0'
              : 'translate-y-0 opacity-100',
          )}
        >
          <div className="mt-4 flex items-center justify-center">
            <Button
              size="lg"
              data-testid="timer-primary"
              onClick={isRunning ? pause : start}
              className="min-w-[11.5rem] gap-2 px-8 text-[15px] font-semibold shadow-[0_16px_36px_-16px_hsl(var(--glass-shadow)/0.55)]"
              style={{ backgroundColor: accent, color: accentForeground }}
            >
              {isRunning ? (
                <Pause className="h-4 w-4" fill="currentColor" strokeWidth={0} />
              ) : (
                <Play className="h-4 w-4" fill="currentColor" strokeWidth={0} />
              )}
              {primaryLabel}
            </Button>
          </div>

          <p className="mt-3 text-center text-[10px] text-muted-foreground/80">
            {isRunning
              ? '切到其他页面计时不会中断'
              : `专注 ${settings.focusMinutes} / 短休 ${settings.shortBreakMinutes} / 长休 ${settings.longBreakMinutes} 分钟`}
          </p>

          <section className="mt-8">
            <div className="surface grid grid-cols-3 divide-x divide-border/60 rounded-card py-3.5">
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-lg font-semibold timer-digits">{today.completedFocus}</span>
                <span className="text-[10px] text-muted-foreground">今日番茄</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-lg font-semibold timer-digits">
                  {formatMinutesCompact(today.focusSeconds)}
                  <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">min</span>
                </span>
                <span className="text-[10px] text-muted-foreground">专注时长</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-lg font-semibold timer-digits">{today.abandoned}</span>
                <span className="text-[10px] text-muted-foreground">中断次数</span>
              </div>
            </div>
          </section>
        </div>

        {/* 沉浸模式背景：只留表盘、暂停与退出全屏 */}
        <div
          aria-hidden
          className={cn(
            'pointer-events-none fixed inset-0 z-40 bg-background/85 transition-opacity duration-500 ease-spring',
            immersive ? 'opacity-100' : 'opacity-0',
          )}
        />

        <button
          type="button"
          onClick={() => setImmersive(false)}
          aria-label="退出全屏"
          className={cn(
            'fixed right-4 top-[max(env(safe-area-inset-top),1rem)] z-[70] inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-background/80 text-muted-foreground shadow-float backdrop-blur-xl transition-all duration-500 ease-spring',
            immersive ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0',
          )}
        >
          <Minimize2 className="h-5 w-5" />
        </button>

        <div
          className={cn(
            'fixed inset-x-0 bottom-0 z-[70] flex justify-center px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] transition-all duration-500 ease-spring',
            immersive ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-8 opacity-0',
          )}
        >
          <Button
            size="lg"
            onClick={pause}
            aria-label="暂停计时"
            className="min-w-[10.5rem] gap-2 rounded-full px-8 text-[15px] font-semibold shadow-lift"
            style={{ backgroundColor: accent, color: accentForeground }}
          >
            <Pause className="h-4 w-4" fill="currentColor" strokeWidth={0} />
            暂停
          </Button>
        </div>
      </div>
    </Layout>
  );
}

function pauseLabel(mode: PomodoroMode): string {
  if (mode === 'focus') return '暂停';
  return '暂停休息';
}
