export type PomodoroMode = 'focus' | 'shortBreak' | 'longBreak';
export type TimerStatus = 'idle' | 'running' | 'paused';

export interface PomodoroSettings {
  /** 专注时长（分钟） */
  focusMinutes: number;
  /** 短休息时长（分钟） */
  shortBreakMinutes: number;
  /** 长休息时长（分钟） */
  longBreakMinutes: number;
  /** 每完成多少个专注进入长休息 */
  longBreakInterval: number;
  /** 专注结束后是否自动开始休息 */
  autoStartBreaks: boolean;
  /** 休息结束后是否自动开始专注 */
  autoStartFocus: boolean;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  keepAwake: boolean;
}

/**
 * 计时运行快照。
 * 关键设计：运行中只持久化 endsAt（目标结束时间戳），
 * 剩余时间永远由 Date.now() 推导，避免切页/后台/重开导致的累计误差。
 */
export interface PomodoroRuntime {
  version: 1;
  mode: PomodoroMode;
  status: TimerStatus;
  /** 本轮计划总时长 */
  durationMs: number;
  /** 运行中：目标结束时间戳；暂停/空闲时为 null */
  endsAt: number | null;
  /** 暂停/空闲时：剩余毫秒 */
  remainingMs: number;
  /** 本轮第一次开始的时间戳（用于计算实际专注时长） */
  startedAt: number | null;
  /** 当前长休息周期内已完成的专注数 */
  focusCycleCount: number;
  /** 本轮暂停次数 */
  pauseCount: number;
  updatedAt: number;
}

export interface PomodoroSession {
  id: string;
  mode: PomodoroMode;
  startedAt: number;
  endedAt: number;
  plannedSec: number;
  actualSec: number;
  /** 是否自然完成 */
  completed: boolean;
  /** 是否中断 / 放弃 */
  abandoned: boolean;
  /** 本轮暂停次数 */
  pauses: number;
  /** 本地日期键 yyyy-MM-dd，便于按天聚合 */
  dateKey: string;
}

export interface DailyFocusStat {
  dateKey: string;
  completedFocus: number;
  focusSeconds: number;
  abandoned: number;
  longBreaks: number;
}
