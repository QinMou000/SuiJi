import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { PomodoroMode } from '../../features/pomodoro/types';
import { cn } from '../../lib/utils';

/**
 * 每种模式的环境光基色（HSL 色相）与一整轮下来的色相漂移：
 * 专注越往后越暖，短休息往后偏青，长休息往后偏紫。
 */
const LIGHT: Record<PomodoroMode, { hue: number; drift: number }> = {
  focus: { hue: 18, drift: 42 },
  shortBreak: { hue: 154, drift: -26 },
  longBreak: { hue: 226, drift: 30 },
};

interface FocusAmbienceProps {
  mode: PomodoroMode;
  /** 本轮已经过去的比例 0 → 1 */
  elapsed: number;
  /** 只在表盘放大（沉浸计时）时亮起来 */
  visible: boolean;
}

/**
 * 沉浸计时的环境光。
 * 主光、补光、地面反光三团很淡的径向光；色相与位置按本轮进度缓慢推进，
 * 光团自己再用二十几秒的周期漂移，所以静止看表盘时光也是在动的。
 */
export function FocusAmbience({ mode, elapsed, visible }: FocusAmbienceProps) {
  // 心跳是 250ms 一次，这里量化成 40 步：样式只在真正跨步时变化，
  // 变化交给 CSS 的长过渡去抹平，不必每 250ms 重算。
  const step = Math.round(Math.min(1, Math.max(0, elapsed)) * 40) / 40;

  const style = useMemo<CSSProperties>(() => {
    const { hue, drift } = LIGHT[mode];
    const shift = drift * step;
    return {
      '--ambience-hue': (hue + shift).toFixed(1),
      '--ambience-hue-alt': (hue + 46 + shift * 1.3).toFixed(1),
      // 光源整轮缓慢平移并轻微放大，让“时间在走”这件事有画面上的体现
      transform: `translate3d(${(-4 * step).toFixed(2)}%, ${(3 * step).toFixed(2)}%, 0) scale(${(
        1 + 0.05 * step
      ).toFixed(3)})`,
    } as CSSProperties;
  }, [mode, step]);

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none fixed inset-0 z-[45] overflow-hidden transition-opacity duration-[900ms] ease-spring',
        visible ? 'opacity-100' : 'opacity-0',
      )}
    >
      <div className="ambience-field" style={style}>
        <span className="ambience-orb ambience-orb--key" />
        <span className="ambience-orb ambience-orb--fill" />
        <span className="ambience-orb ambience-orb--floor" />
      </div>
    </div>
  );
}
