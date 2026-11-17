/* eslint-disable react-refresh/only-export-components -- Provider 与 hooks 需同文件导出 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db';
import { useToast } from '../../components/ui/Toast';
import { DEFAULT_SETTINGS, MODE_META } from './constants';
import {
  createRuntime,
  dateKeyOf,
  durationForMode,
  elapsedOf,
  formatClock,
  nextModeFor,
  remainingOf,
} from './time';
import { loadRuntime, loadSettings, saveRuntime, saveSettings, sanitizeSettings } from './storage';
import type {
  PomodoroMode,
  PomodoroRuntime,
  PomodoroSession,
  PomodoroSettings,
  TimerStatus,
} from './types';
import {
  playChime,
  playPauseCue,
  playStartCue,
  unlockAudio,
  vibrateForCompletion,
} from './sound';
import {
  cancelTimerNotification,
  ensureNotificationPermission,
  hasNotificationPermission,
  scheduleTimerNotification,
  sendWebNotification,
} from './notifications';

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}

interface PomodoroStateValue {
  settings: PomodoroSettings;
  runtime: PomodoroRuntime;
  mode: PomodoroMode;
  status: TimerStatus;
  durationMs: number;
  isRunning: boolean;
  isPaused: boolean;
  isIdle: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  switchMode: (mode: PomodoroMode) => void;
  updateSettings: (patch: Partial<PomodoroSettings>) => void;
  restoreDefaults: () => void;
  requestNotifications: () => Promise<boolean>;
}

interface PomodoroContextValue extends PomodoroStateValue {
  remainingMs: number;
  elapsedMs: number;
  progress: number;
  timeLabel: string;
}

const PomodoroStateContext = createContext<PomodoroStateValue | null>(null);
/** 心跳单独成 Context：只有真正需要逐秒刷新的组件才订阅。 */
const PomodoroClockContext = createContext<number>(Date.now());

/** 累计专注不足该秒数时，重置不计为「中断」，避免噪声记录。 */
const ABANDON_THRESHOLD_SEC = { focus: 60, break: 30 } as const;

async function persistSession(session: PomodoroSession): Promise<void> {
  try {
    await db.pomodoroSessions.add(session);
  } catch (error) {
    console.error('保存番茄记录失败', error);
  }
}

function buildSession(
  runtime: PomodoroRuntime,
  options: { endedAt: number; completed: boolean; abandoned: boolean },
): PomodoroSession | null {
  if (!runtime.startedAt) return null;
  const plannedSec = Math.round(runtime.durationMs / 1000);
  const actualSec = options.completed
    ? plannedSec
    : Math.max(0, Math.round((options.endedAt - runtime.startedAt) / 1000));

  return {
    id: uuidv4(),
    mode: runtime.mode,
    startedAt: runtime.startedAt,
    endedAt: options.endedAt,
    plannedSec,
    actualSec,
    completed: options.completed,
    abandoned: options.abandoned,
    pauses: runtime.pauseCount,
    dateKey: dateKeyOf(runtime.startedAt),
  };
}

/**
 * 番茄钟全局状态机。
 *
 * 准确性策略：
 * 1. 运行中只信任 `endsAt` 时间戳，渲染用 250ms 心跳只是「刷新画面」；
 * 2. 切页 = 组件不卸载，计时不中断；
 * 3. 进入后台 / 重回前台通过 visibilitychange + Capacitor appStateChange 重算；
 * 4. 进程被杀：endsAt 存在 localStorage，原生端通知已预约；重启后补记完成态。
 */
export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();

  // 同步读取本地快照：首帧就是真实状态，避免先写默认值再恢复
  const [settings, setSettings] = useState<PomodoroSettings>(() => loadSettings());
  const [runtime, setRuntime] = useState<PomodoroRuntime>(() => {
    const restored = loadRuntime();
    return restored ?? createRuntime(loadSettings());
  });
  const [now, setNow] = useState(() => Date.now());

  const settingsRef = useRef(settings);
  const runtimeRef = useRef(runtime);
  const restoredRef = useRef(false);
  const finalizingRef = useRef(false);

  const commit = useCallback((next: PomodoroRuntime) => {
    runtimeRef.current = next;
    setRuntime(next);
  }, []);

  const commitSettings = useCallback((next: PomodoroSettings) => {
    settingsRef.current = next;
    setSettings(next);
    saveSettings(next);
  }, []);

  useEffect(() => {
    saveRuntime(runtime);
  }, [runtime]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const timeLabel = formatClock(remainingOf(runtime, now));

  /* ---------------- 完成 / 中断记录 ---------------- */

  const finalize = useCallback(
    (reason: 'natural' | 'restored') => {
      const current = runtimeRef.current;
      if (current.status !== 'running' || finalizingRef.current) return;
      finalizingRef.current = true;

      try {
        const currentSettings = settingsRef.current;
        const completedAt = current.endsAt ?? Date.now();
        const session = buildSession(current, {
          endedAt: completedAt,
          completed: true,
          abandoned: false,
        });
        if (session) void persistSession(session);

        const wasFocus = current.mode === 'focus';
        const advanced = nextModeFor(
          current.mode,
          current.focusCycleCount,
          currentSettings.longBreakInterval,
        );
        const nextDuration = durationForMode(currentSettings, advanced.mode);
        const nextStart = Date.now();
        const shouldAutoStart =
          reason === 'natural' &&
          (advanced.mode === 'focus'
            ? currentSettings.autoStartFocus
            : currentSettings.autoStartBreaks);

        const nextRuntime: PomodoroRuntime = {
          version: 1,
          mode: advanced.mode,
          status: shouldAutoStart ? 'running' : 'idle',
          durationMs: nextDuration,
          endsAt: shouldAutoStart ? nextStart + nextDuration : null,
          remainingMs: nextDuration,
          startedAt: shouldAutoStart ? nextStart : null,
          focusCycleCount: advanced.focusCycleCount,
          pauseCount: 0,
          updatedAt: nextStart,
        };

        commit(nextRuntime);
        setNow(Date.now());

        if (shouldAutoStart && nextRuntime.endsAt) {
          void scheduleTimerNotification(nextRuntime.mode, nextRuntime.endsAt, {
            sound: currentSettings.soundEnabled,
          });
        } else {
          void cancelTimerNotification();
        }

        // 前台由 WebAudio 发声；应用切到后台时交给已预约的系统通知。
        if (currentSettings.soundEnabled && reason === 'natural' && !document.hidden) {
          playChime(wasFocus ? 'focusEnd' : 'breakEnd');
          vibrateForCompletion(wasFocus ? 'focusEnd' : 'breakEnd');
        }
        if (reason === 'natural') {
          void sendWebNotification(current.mode);
        }

        const nextMeta = MODE_META[advanced.mode];
        const title = reason === 'restored'
          ? '已补记离线期间的计时'
          : wasFocus
            ? '专注完成'
            : `${MODE_META[current.mode].label}结束`;
        const description = reason === 'restored'
          ? `本轮已按完成记录，当前切换到${nextMeta.label}。`
          : wasFocus
            ? advanced.mode === 'longBreak'
              ? `连续完成 ${currentSettings.longBreakInterval} 个番茄，自动进入长休息。`
              : `已切换到${nextMeta.label}${shouldAutoStart ? '，开始放松吧。' : '，准备好后点击开始。'}`
            : `状态回来了，已切换到专注${shouldAutoStart ? '，继续吧。' : '。'}`;

        toast({
          variant: 'success',
          title,
          description,
          duration: 4200,
        });
      } finally {
        finalizingRef.current = false;
      }
    },
    [commit, toast],
  );

  /* ---------------- 计时心跳 ---------------- */

  useEffect(() => {
    if (runtime.status !== 'running' || !runtime.endsAt) return;
    const endsAt = runtime.endsAt;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const currentNow = Date.now();
      setNow(currentNow);
      if (currentNow >= endsAt) finalize('natural');
    };

    tick();
    const interval = window.setInterval(tick, 250);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [runtime.status, runtime.endsAt, finalize]);

  /* ---------------- 恢复 / 前后台切换 ---------------- */

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const current = runtimeRef.current;

    if (current.status === 'running') {
      if (current.endsAt && current.endsAt <= Date.now()) {
        finalize('restored');
      } else if (current.endsAt) {
        setNow(Date.now());
        if (settingsRef.current.notificationsEnabled) {
          void scheduleTimerNotification(current.mode, current.endsAt, {
            sound: settingsRef.current.soundEnabled,
          });
        }
      }
    } else if (current.status === 'paused' && current.remainingMs <= 0) {
      const duration = durationForMode(settingsRef.current, current.mode);
      commit({
        ...current,
        status: 'idle',
        durationMs: duration,
        remainingMs: duration,
        endsAt: null,
        startedAt: null,
        updatedAt: Date.now(),
      });
    }
  }, [commit, finalize]);

  useEffect(() => {
    const checkExpiry = () => {
      if (document.visibilityState !== 'visible') return;
      const current = runtimeRef.current;
      const currentNow = Date.now();
      setNow(currentNow);
      if (current.status === 'running' && current.endsAt && currentNow >= current.endsAt) {
        finalize('natural');
      }
    };

    document.addEventListener('visibilitychange', checkExpiry);

    let handle: PluginListenerHandle | null = null;
    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) checkExpiry();
    })
      .then(listener => {
        handle = listener;
      })
      .catch(() => undefined);

    return () => {
      document.removeEventListener('visibilitychange', checkExpiry);
      handle?.remove();
    };
  }, [finalize]);

  /* ---------------- 页面标题同步 ---------------- */

  useEffect(() => {
    const baseTitle = '随记 · 博客与专注';
    if (runtime.status === 'running' || runtime.status === 'paused') {
      document.title = `${timeLabel} · ${MODE_META[runtime.mode].label} — 随记`;
    } else {
      document.title = baseTitle;
    }
    return () => {
      document.title = baseTitle;
    };
  }, [timeLabel, runtime.status, runtime.mode]);

  /* ---------------- 屏幕常亮 ---------------- */

  useEffect(() => {
    if (!settings.keepAwake || runtime.status !== 'running') return;

    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      const wakeLock = (
        navigator as Navigator & {
          wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
        }
      ).wakeLock;
      if (!wakeLock) return;
      try {
        sentinel = await wakeLock.request('screen');
      } catch {
        // 部分 WebView 不支持或用户拒绝，静默忽略
      }
    };

    void acquire();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void acquire();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      void sentinel?.release().catch(() => undefined);
    };
  }, [settings.keepAwake, runtime.status]);

  /* ---------------- 操作 ---------------- */

  const start = useCallback(() => {
    const current = runtimeRef.current;
    if (current.status === 'running') return;
    const currentSettings = settingsRef.current;
    const currentNow = Date.now();

    unlockAudio();

    if (currentSettings.soundEnabled) {
      playStartCue();
    }

    let next: PomodoroRuntime;
    if (current.status === 'paused') {
      next = {
        ...current,
        status: 'running',
        endsAt: currentNow + Math.max(1000, current.remainingMs),
        updatedAt: currentNow,
      };
    } else {
      const duration = durationForMode(currentSettings, current.mode);
      next = {
        ...current,
        status: 'running',
        durationMs: duration,
        remainingMs: duration,
        endsAt: currentNow + duration,
        startedAt: currentNow,
        pauseCount: 0,
        updatedAt: currentNow,
      };
    }

    commit(next);
    setNow(currentNow);

    if (currentSettings.notificationsEnabled) {
      void ensureNotificationPermission().then(granted => {
        if (!granted) {
          commitSettings({ ...settingsRef.current, notificationsEnabled: false });
          toast({
            variant: 'error',
            title: '系统通知未开启',
            description: '计时仍会继续，结束时用应用内提示音提醒。',
          });
          return;
        }
        if (next.endsAt) {
          void scheduleTimerNotification(next.mode, next.endsAt, {
            sound: currentSettings.soundEnabled,
          });
        }
      });
    }
  }, [commit, commitSettings, toast]);

  const pause = useCallback(() => {
    const current = runtimeRef.current;
    if (current.status !== 'running' || !current.endsAt) return;
    const currentNow = Date.now();
    const remaining = Math.max(0, current.endsAt - currentNow);

    if (remaining <= 500) {
      finalize('natural');
      return;
    }

    commit({
      ...current,
      status: 'paused',
      endsAt: null,
      remainingMs: remaining,
      pauseCount: current.pauseCount + 1,
      updatedAt: currentNow,
    });
    setNow(currentNow);
    void cancelTimerNotification();
    if (settingsRef.current.soundEnabled) playPauseCue();
  }, [commit, finalize]);

  const reset = useCallback(() => {
    const current = runtimeRef.current;
    const currentSettings = settingsRef.current;
    const currentNow = Date.now();
    let recorded = false;

    if ((current.status === 'running' || current.status === 'paused') && current.startedAt) {
      const remaining = remainingOf(current, currentNow);
      const actualSec = Math.max(0, Math.round((current.durationMs - remaining) / 1000));
      const threshold =
        current.mode === 'focus' ? ABANDON_THRESHOLD_SEC.focus : ABANDON_THRESHOLD_SEC.break;
      if (actualSec >= threshold) {
        const session = buildSession(current, {
          endedAt: currentNow,
          completed: false,
          abandoned: true,
        });
        if (session) {
          void persistSession({ ...session, actualSec });
          recorded = true;
        }
      }
    }

    const duration = durationForMode(currentSettings, current.mode);
    commit({
      ...current,
      status: 'idle',
      durationMs: duration,
      remainingMs: duration,
      endsAt: null,
      startedAt: null,
      pauseCount: 0,
      updatedAt: currentNow,
    });
    setNow(currentNow);
    void cancelTimerNotification();
    if (currentSettings.soundEnabled) playPauseCue();

    toast({
      title: recorded ? '本轮已放弃并记录' : '已重置计时',
      description: recorded ? '这次专注会计入「中断」统计。' : undefined,
    });
  }, [commit, toast]);

  const skip = useCallback(() => {
    const current = runtimeRef.current;
    const currentSettings = settingsRef.current;
    const currentNow = Date.now();

    if ((current.status === 'running' || current.status === 'paused') && current.startedAt) {
      const remaining = remainingOf(current, currentNow);
      const actualSec = Math.max(0, Math.round((current.durationMs - remaining) / 1000));
      const threshold =
        current.mode === 'focus' ? ABANDON_THRESHOLD_SEC.focus : ABANDON_THRESHOLD_SEC.break;
      if (actualSec >= threshold) {
        const session = buildSession(current, {
          endedAt: currentNow,
          completed: false,
          abandoned: true,
        });
        if (session) void persistSession({ ...session, actualSec });
      }
    }

    const targetMode: PomodoroMode = current.mode === 'focus' ? 'shortBreak' : 'focus';
    const duration = durationForMode(currentSettings, targetMode);
    commit({
      ...current,
      mode: targetMode,
      status: 'idle',
      durationMs: duration,
      remainingMs: duration,
      endsAt: null,
      startedAt: null,
      pauseCount: 0,
      updatedAt: currentNow,
    });
    setNow(currentNow);
    void cancelTimerNotification();
    if (currentSettings.soundEnabled) {
      unlockAudio();
      playStartCue();
    }
    toast({ title: `已跳过，切换到${MODE_META[targetMode].label}` });
  }, [commit, toast]);

  const switchMode = useCallback(
    (mode: PomodoroMode) => {
      const current = runtimeRef.current;
      if (mode === current.mode) return;
      const currentSettings = settingsRef.current;
      const currentNow = Date.now();

      if ((current.status === 'running' || current.status === 'paused') && current.startedAt) {
        const remaining = remainingOf(current, currentNow);
        const actualSec = Math.max(0, Math.round((current.durationMs - remaining) / 1000));
        const threshold =
          current.mode === 'focus' ? ABANDON_THRESHOLD_SEC.focus : ABANDON_THRESHOLD_SEC.break;
        if (actualSec >= threshold) {
          const session = buildSession(current, {
            endedAt: currentNow,
            completed: false,
            abandoned: true,
          });
          if (session) void persistSession({ ...session, actualSec });
        }
      }

      const duration = durationForMode(currentSettings, mode);
      commit({
        ...current,
        mode,
        status: 'idle',
        durationMs: duration,
        remainingMs: duration,
        endsAt: null,
        startedAt: null,
        pauseCount: 0,
        updatedAt: currentNow,
      });
      setNow(currentNow);
      void cancelTimerNotification();
      if (currentSettings.soundEnabled) {
        unlockAudio();
        playStartCue();
      }
    },
    [commit],
  );

  const updateSettings = useCallback(
    (patch: Partial<PomodoroSettings>) => {
      const next = sanitizeSettings({ ...settingsRef.current, ...patch });
      const previous = settingsRef.current;
      commitSettings(next);

      if (patch.notificationsEnabled === false) {
        void cancelTimerNotification();
      }
      if (patch.soundEnabled !== undefined) {
        const current = runtimeRef.current;
        if (current.status === 'running' && current.endsAt && next.notificationsEnabled) {
          // 声音开关对应不同的通知频道，运行中切换时重新预约
          void scheduleTimerNotification(current.mode, current.endsAt, {
            sound: next.soundEnabled,
          });
        }
      }
      if (patch.notificationsEnabled === true && previous.notificationsEnabled === false) {
        void ensureNotificationPermission().then(granted => {
          if (!granted) {
            commitSettings({ ...settingsRef.current, notificationsEnabled: false });
            toast({
              variant: 'error',
              title: '通知权限未开启',
              description: '请在系统设置中允许「随记」发送通知。',
            });
            return;
          }
          const current = runtimeRef.current;
          if (current.status === 'running' && current.endsAt) {
            void scheduleTimerNotification(current.mode, current.endsAt, {
              sound: settingsRef.current.soundEnabled,
            });
          }
        });
      }

      const current = runtimeRef.current;
      if (current.status !== 'running') {
        const duration = durationForMode(next, current.mode);
        if (current.status === 'idle') {
          commit({
            ...current,
            durationMs: duration,
            remainingMs: duration,
            updatedAt: Date.now(),
          });
        } else if (current.status === 'paused') {
          const remaining = Math.min(current.remainingMs, duration);
          if (remaining <= 0) {
            commit({
              ...current,
              status: 'idle',
              durationMs: duration,
              remainingMs: duration,
              endsAt: null,
              startedAt: null,
              updatedAt: Date.now(),
            });
          } else {
            commit({
              ...current,
              durationMs: duration,
              remainingMs: remaining,
              updatedAt: Date.now(),
            });
          }
        }
      }
    },
    [commit, commitSettings, toast],
  );

  const restoreDefaults = useCallback(() => {
    updateSettings(DEFAULT_SETTINGS);
    toast({ title: '已恢复默认时长', description: '25 / 5 / 15 分钟，每 4 个番茄长休息。' });
  }, [toast, updateSettings]);

  const requestNotifications = useCallback(async () => {
    const granted = await ensureNotificationPermission();
    commitSettings({ ...settingsRef.current, notificationsEnabled: granted });
    if (granted) {
      const current = runtimeRef.current;
      if (current.status === 'running' && current.endsAt) {
        void scheduleTimerNotification(current.mode, current.endsAt, {
          sound: settingsRef.current.soundEnabled,
        });
      }
      toast({ variant: 'success', title: '系统通知已开启' });
    } else {
      toast({ variant: 'error', title: '未获得通知权限', description: '可在系统设置中手动开启。' });
    }
    return granted;
  }, [commitSettings, toast]);

  /* 若用户在系统设置里关闭了通知，回到前台时同步开关状态 */
  useEffect(() => {
    if (!settings.notificationsEnabled) return;
    const sync = async () => {
      if (document.visibilityState !== 'visible') return;
      const granted = await hasNotificationPermission();
      if (!granted && settingsRef.current.notificationsEnabled) {
        // 不强行改用户设置，仅取消已预约通知，避免误导
        void cancelTimerNotification();
      }
    };
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, [settings.notificationsEnabled]);

  const stateValue = useMemo<PomodoroStateValue>(
    () => ({
      settings,
      runtime,
      mode: runtime.mode,
      status: runtime.status,
      durationMs: runtime.durationMs,
      isRunning: runtime.status === 'running',
      isPaused: runtime.status === 'paused',
      isIdle: runtime.status === 'idle',
      start,
      pause,
      reset,
      skip,
      switchMode,
      updateSettings,
      restoreDefaults,
      requestNotifications,
    }),
    [
      settings,
      runtime,
      start,
      pause,
      reset,
      skip,
      switchMode,
      updateSettings,
      restoreDefaults,
      requestNotifications,
    ],
  );

  return (
    <PomodoroStateContext.Provider value={stateValue}>
      <PomodoroClockContext.Provider value={now}>{children}</PomodoroClockContext.Provider>
    </PomodoroStateContext.Provider>
  );
}

/** 只订阅状态与操作，不随心跳重渲染（列表页 / 设置页用）。 */
export function usePomodoroState(): PomodoroStateValue {
  const context = useContext(PomodoroStateContext);
  if (!context) throw new Error('usePomodoroState 必须在 PomodoroProvider 内使用');
  return context;
}

/** 订阅每秒心跳（计时器页面 / 顶部迷你胶囊用）。 */
export function usePomodoroClock(): number {
  return useContext(PomodoroClockContext);
}

/** 完整计时视图：状态 + 由时间戳推导的剩余时间。 */
export function usePomodoro(): PomodoroContextValue {
  const state = usePomodoroState();
  const now = usePomodoroClock();

  const remainingMs = remainingOf(state.runtime, now);
  const elapsedMs = elapsedOf(state.runtime, now);
  const progress =
    state.runtime.durationMs > 0
      ? Math.min(1, Math.max(0, remainingMs / state.runtime.durationMs))
      : 0;
  const timeLabel = formatClock(remainingMs);

  return useMemo(
    () => ({
      ...state,
      remainingMs,
      elapsedMs,
      progress,
      timeLabel,
    }),
    [state, remainingMs, elapsedMs, progress, timeLabel],
  );
}

/** 供页面判断当前平台，避免重复 import。 */
export const pomodoroPlatform = { isNative: Capacitor.isNativePlatform() };
