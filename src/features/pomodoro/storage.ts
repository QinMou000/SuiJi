import {
  DEFAULT_SETTINGS,
  POMODORO_RUNTIME_KEY,
  POMODORO_SETTINGS_KEY,
  SETTING_LIMITS,
} from './constants';
import type { PomodoroMode, PomodoroRuntime, PomodoroSettings, TimerStatus } from './types';

const MODES: PomodoroMode[] = ['focus', 'shortBreak', 'longBreak'];
const STATUSES: TimerStatus[] = ['idle', 'running', 'paused'];

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** 清洗设置：防止旧版本/手工改 localStorage 写入非法值。 */
export function sanitizeSettings(input: Partial<PomodoroSettings> | null | undefined): PomodoroSettings {
  const source = input ?? {};
  const pickBoolean = (value: unknown, fallback: boolean) =>
    typeof value === 'boolean' ? value : fallback;

  return {
    focusMinutes: clampNumber(
      source.focusMinutes,
      DEFAULT_SETTINGS.focusMinutes,
      SETTING_LIMITS.focusMinutes.min,
      SETTING_LIMITS.focusMinutes.max,
    ),
    shortBreakMinutes: clampNumber(
      source.shortBreakMinutes,
      DEFAULT_SETTINGS.shortBreakMinutes,
      SETTING_LIMITS.shortBreakMinutes.min,
      SETTING_LIMITS.shortBreakMinutes.max,
    ),
    longBreakMinutes: clampNumber(
      source.longBreakMinutes,
      DEFAULT_SETTINGS.longBreakMinutes,
      SETTING_LIMITS.longBreakMinutes.min,
      SETTING_LIMITS.longBreakMinutes.max,
    ),
    longBreakInterval: clampNumber(
      source.longBreakInterval,
      DEFAULT_SETTINGS.longBreakInterval,
      SETTING_LIMITS.longBreakInterval.min,
      SETTING_LIMITS.longBreakInterval.max,
    ),
    autoStartBreaks: pickBoolean(source.autoStartBreaks, DEFAULT_SETTINGS.autoStartBreaks),
    autoStartFocus: pickBoolean(source.autoStartFocus, DEFAULT_SETTINGS.autoStartFocus),
    soundEnabled: pickBoolean(source.soundEnabled, DEFAULT_SETTINGS.soundEnabled),
    notificationsEnabled: pickBoolean(
      source.notificationsEnabled,
      DEFAULT_SETTINGS.notificationsEnabled,
    ),
    keepAwake: pickBoolean(source.keepAwake, DEFAULT_SETTINGS.keepAwake),
  };
}

export function loadSettings(): PomodoroSettings {
  try {
    const raw = localStorage.getItem(POMODORO_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return sanitizeSettings(JSON.parse(raw) as Partial<PomodoroSettings>);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: PomodoroSettings): void {
  try {
    localStorage.setItem(POMODORO_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // 隐私模式 / 存储配额不足时静默降级，内存状态仍然可用
  }
}

/** 校验运行快照；任何关键字段非法都返回 null，让调用方新建空闲态。 */
export function loadRuntime(): PomodoroRuntime | null {
  try {
    const raw = localStorage.getItem(POMODORO_RUNTIME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PomodoroRuntime>;
    if (parsed.version !== 1) return null;
    if (!parsed.mode || !MODES.includes(parsed.mode)) return null;
    if (!parsed.status || !STATUSES.includes(parsed.status)) return null;

    const durationMs =
      typeof parsed.durationMs === 'number' && parsed.durationMs > 0 ? parsed.durationMs : 0;
    if (durationMs <= 0) return null;

    const remainingMs =
      typeof parsed.remainingMs === 'number' && parsed.remainingMs >= 0
        ? Math.min(parsed.remainingMs, durationMs)
        : durationMs;

    const endsAt =
      typeof parsed.endsAt === 'number' && Number.isFinite(parsed.endsAt) ? parsed.endsAt : null;
    // 运行态必须有 endsAt，否则无法准确恢复
    if (parsed.status === 'running' && endsAt === null) return null;

    return {
      version: 1,
      mode: parsed.mode,
      status: parsed.status,
      durationMs,
      endsAt: parsed.status === 'running' ? endsAt : null,
      remainingMs,
      startedAt:
        typeof parsed.startedAt === 'number' && Number.isFinite(parsed.startedAt)
          ? parsed.startedAt
          : null,
      focusCycleCount:
        typeof parsed.focusCycleCount === 'number' && parsed.focusCycleCount >= 0
          ? Math.round(parsed.focusCycleCount)
          : 0,
      pauseCount:
        typeof parsed.pauseCount === 'number' && parsed.pauseCount >= 0
          ? Math.round(parsed.pauseCount)
          : 0,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function saveRuntime(runtime: PomodoroRuntime): void {
  try {
    localStorage.setItem(POMODORO_RUNTIME_KEY, JSON.stringify(runtime));
  } catch {
    // 忽略存储失败
  }
}

export function clearRuntime(): void {
  try {
    localStorage.removeItem(POMODORO_RUNTIME_KEY);
  } catch {
    // 忽略
  }
}
