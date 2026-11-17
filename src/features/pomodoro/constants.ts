import type { PomodoroMode, PomodoroSettings } from './types';

export const POMODORO_SETTINGS_KEY = 'suiji_pomodoro_settings_v1';
export const POMODORO_RUNTIME_KEY = 'suiji_pomodoro_runtime_v1';

export const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  autoStartBreaks: true,
  autoStartFocus: false,
  soundEnabled: true,
  notificationsEnabled: true,
  keepAwake: false,
};

export const SETTING_LIMITS = {
  focusMinutes: { min: 1, max: 120 },
  shortBreakMinutes: { min: 1, max: 60 },
  longBreakMinutes: { min: 1, max: 60 },
  longBreakInterval: { min: 2, max: 8 },
} as const;

export interface ModeMeta {
  label: string;
  longLabel: string;
  hint: string;
  /** CSS 变量名，用 hsl(var(--x)) 取色 */
  accentVar: string;
  softVar: string;
  notificationTitle: string;
  notificationBody: string;
}

export const MODE_META: Record<PomodoroMode, ModeMeta> = {
  focus: {
    label: '专注',
    longLabel: '专注时间',
    hint: '只做一件事',
    accentVar: '--focus',
    softVar: '--focus-soft',
    notificationTitle: '专注完成',
    notificationBody: '这一轮专注结束了，起身活动一下吧。',
  },
  shortBreak: {
    label: '短休息',
    longLabel: '短休息',
    hint: '放松一下眼睛',
    accentVar: '--short-break',
    softVar: '--short-break-soft',
    notificationTitle: '短休息结束',
    notificationBody: '状态回来了吗？准备开始下一轮专注。',
  },
  longBreak: {
    label: '长休息',
    longLabel: '长休息',
    hint: '离开屏幕走一走',
    accentVar: '--long-break',
    softVar: '--long-break-soft',
    notificationTitle: '长休息结束',
    notificationBody: '休息够了，开始新的一组专注吧。',
  },
};

export const MODE_ORDER: PomodoroMode[] = ['focus', 'shortBreak', 'longBreak'];
