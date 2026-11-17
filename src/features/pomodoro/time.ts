import type { PomodoroMode, PomodoroRuntime, PomodoroSettings } from './types';

export const MINUTE_MS = 60_000;

export function minutesToMs(minutes: number): number {
  return Math.max(1, Math.round(minutes)) * MINUTE_MS;
}

export function durationForMode(settings: PomodoroSettings, mode: PomodoroMode): number {
  switch (mode) {
    case 'focus':
      return minutesToMs(settings.focusMinutes);
    case 'shortBreak':
      return minutesToMs(settings.shortBreakMinutes);
    case 'longBreak':
      return minutesToMs(settings.longBreakMinutes);
  }
}

/** 倒计时展示：小于 1 小时用 MM:SS，大于等于 1 小时用 H:MM:SS。 */
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}

/** 人类可读时长：45 秒 / 25 分钟 / 1 小时 20 分钟 */
export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  if (safe < 60) return `${safe} 秒`;
  const totalMinutes = Math.round(safe / 60);
  if (totalMinutes < 60) return `${totalMinutes} 分钟`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours} 小时 ${minutes} 分钟` : `${hours} 小时`;
}

/** 用于统计卡片的分钟数（始终以分钟为单位，避免 "1.3 min" 这类误读）。 */
export function formatMinutesCompact(seconds: number): string {
  return `${Math.round(Math.max(0, seconds) / 60)}`;
}

export function dateKeyOf(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayKey(): string {
  return dateKeyOf(Date.now());
}

/** 依据番茄工作法推导下一阶段与周期计数。 */
export function nextModeFor(
  mode: PomodoroMode,
  focusCycleCount: number,
  longBreakInterval: number,
): { mode: PomodoroMode; focusCycleCount: number } {
  if (mode !== 'focus') {
    return { mode: 'focus', focusCycleCount };
  }
  const count = focusCycleCount + 1;
  if (count >= longBreakInterval) {
    return { mode: 'longBreak', focusCycleCount: 0 };
  }
  return { mode: 'shortBreak', focusCycleCount: count };
}

/** 运行中由时间戳推导剩余；暂停/空闲直接用快照值。 */
export function remainingOf(runtime: PomodoroRuntime, now = Date.now()): number {
  if (runtime.status === 'running' && runtime.endsAt) {
    return Math.max(0, runtime.endsAt - now);
  }
  return Math.max(0, runtime.remainingMs);
}

/** 本轮已进行的时间（不含暂停时间）。 */
export function elapsedOf(runtime: PomodoroRuntime, now = Date.now()): number {
  if (!runtime.startedAt) return 0;
  const remaining = remainingOf(runtime, now);
  return Math.min(runtime.durationMs, Math.max(0, runtime.durationMs - remaining));
}

export function createRuntime(
  settings: PomodoroSettings,
  mode: PomodoroMode = 'focus',
  focusCycleCount = 0,
): PomodoroRuntime {
  const durationMs = durationForMode(settings, mode);
  return {
    version: 1,
    mode,
    status: 'idle',
    durationMs,
    endsAt: null,
    remainingMs: durationMs,
    startedAt: null,
    focusCycleCount,
    pauseCount: 0,
    updatedAt: Date.now(),
  };
}
