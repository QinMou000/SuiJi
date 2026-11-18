import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { MODE_META } from './constants';
import { formatClock } from './time';
import type { PomodoroMode } from './types';

/** 原生端常驻计时通知插件，见 android/.../PomodoroTimerPlugin.java。 */
interface PomodoroTimerPlugin {
  show(options: {
    title: string;
    body: string;
    endsAt: number;
    remainingMs: number;
    paused: boolean;
  }): Promise<void>;
  hide(): Promise<void>;
  scheduleAlert(options: {
    endsAt: number;
    kind: 'focusEnd' | 'shortBreakEnd' | 'longBreakEnd';
  }): Promise<void>;
  cancelAlerts(): Promise<void>;
}

const PomodoroTimer = registerPlugin<PomodoroTimerPlugin>('PomodoroTimer');

const TIMER_NOTIFICATION_ID = 41001;
/** 结束提醒渠道由原生 PomodoroTimerPlugin 创建，带明确的震动节奏。 */
const SOUND_CHANNEL_ID = 'pomodoro-alert-sound';
const SILENT_CHANNEL_ID = 'pomodoro-alert-quiet';

/** 串行化通知的预约/取消，避免快速暂停继续时旧取消覆盖新预约。 */
let notificationQueue: Promise<void> = Promise.resolve();

function enqueue(task: () => Promise<void>): Promise<void> {
  notificationQueue = notificationQueue.then(task, task).catch(() => undefined);
  return notificationQueue;
}

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

function isAndroidNative(): boolean {
  return Capacitor.getPlatform() === 'android';
}

/** 查询权限，不主动弹窗。 */
export async function hasNotificationPermission(): Promise<boolean> {
  if (isNative()) {
    try {
      const status = await LocalNotifications.checkPermissions();
      return status.display === 'granted';
    } catch {
      return false;
    }
  }
  if (typeof Notification === 'undefined') return false;
  return Notification.permission === 'granted';
}

/** 请求权限（必须在用户手势中调用）。 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (isNative()) {
    try {
      const current = await LocalNotifications.checkPermissions();
      if (current.display === 'granted') return true;
      const requested = await LocalNotifications.requestPermissions();
      return requested.display === 'granted';
    } catch {
      return false;
    }
  }
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

/**
 * 原生端把提醒「预约」到结束时间点。
 * 即使应用进入后台或进程被系统回收，系统仍会在目标时间弹出通知。
 */
export function scheduleTimerNotification(
  mode: PomodoroMode,
  endsAt: number,
  options: { sound: boolean },
): Promise<void> {
  if (!isNative() || endsAt <= Date.now() + 500) return Promise.resolve();

  return enqueue(async () => {
    try {
      if (!(await hasNotificationPermission())) return;
      await LocalNotifications.cancel({ notifications: [{ id: TIMER_NOTIFICATION_ID }] });

      const meta = MODE_META[mode];
      await LocalNotifications.schedule({
        notifications: [
          {
            id: TIMER_NOTIFICATION_ID,
            title: meta.notificationTitle,
            body: meta.notificationBody,
            channelId: options.sound ? SOUND_CHANNEL_ID : SILENT_CHANNEL_ID,
            autoCancel: true,
            extra: { mode },
            schedule: {
              at: new Date(endsAt),
              allowWhileIdle: true,
            },
          },
        ],
      });
    } catch (error) {
      console.warn('预约本地通知失败', error);
    }
  });
}

/**
 * 计时进行中的常驻通知：Android 下拉状态栏与锁屏都会显示。
 * 运行中由系统 chronometer 自动倒计时，暂停时显示静态剩余时间。
 */
export function showTimerNotification(
  mode: PomodoroMode,
  state: { endsAt: number | null; remainingMs: number; paused: boolean },
): Promise<void> {
  if (!isAndroidNative()) return Promise.resolve();

  const meta = MODE_META[mode];
  const title = state.paused ? `${meta.label} · 已暂停` : `${meta.label}中`;
  const body = state.paused ? `剩余 ${formatClock(state.remainingMs)}` : meta.hint;

  return enqueue(async () => {
    try {
      await PomodoroTimer.show({
        title,
        body,
        endsAt: state.endsAt ?? 0,
        remainingMs: Math.max(0, Math.round(state.remainingMs)),
        paused: state.paused,
      });
    } catch (error) {
      console.warn('显示计时通知失败', error);
    }
  });
}

export function hideTimerNotification(): Promise<void> {
  if (!isAndroidNative()) return Promise.resolve();
  return enqueue(async () => {
    try {
      await PomodoroTimer.hide();
    } catch {
      // 插件不可用或通知已不存在时忽略
    }
  });
}

function alertKindForMode(mode: PomodoroMode): 'focusEnd' | 'shortBreakEnd' | 'longBreakEnd' {
  if (mode === 'shortBreak') return 'shortBreakEnd';
  if (mode === 'longBreak') return 'longBreakEnd';
  return 'focusEnd';
}

/**
 * 预约本轮结束时的原生震动。用 AlarmManager + BroadcastReceiver 实现，
 * 不依赖通知渠道的震动开关，锁屏/后台也能在结束时间点震动。
 */
export function scheduleTransitionVibration(endsAt: number, mode: PomodoroMode): Promise<void> {
  if (!isAndroidNative() || endsAt <= Date.now() + 500) return Promise.resolve();
  return enqueue(async () => {
    try {
      await PomodoroTimer.scheduleAlert({ endsAt, kind: alertKindForMode(mode) });
    } catch (error) {
      console.warn('预约结束震动失败', error);
    }
  });
}

export function cancelTransitionVibrations(): Promise<void> {
  if (!isAndroidNative()) return Promise.resolve();
  return enqueue(async () => {
    try {
      await PomodoroTimer.cancelAlerts();
    } catch {
      // 没有已预约闹钟时忽略
    }
  });
}

export function cancelTimerNotification(): Promise<void> {
  if (!isNative()) return Promise.resolve();
  return enqueue(async () => {
    try {
      await LocalNotifications.cancel({ notifications: [{ id: TIMER_NOTIFICATION_ID }] });
    } catch {
      // 没有已预约通知时取消会失败，忽略
    }
  });
}

/** Web 端进程存活时用浏览器通知提醒。 */
export function sendWebNotification(mode: PomodoroMode): void {
  if (isNative()) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

  const meta = MODE_META[mode];
  try {
    const notification = new Notification(meta.notificationTitle, {
      body: meta.notificationBody,
      icon: '/icon-192.png',
      tag: 'suiji-pomodoro',
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (error) {
    console.warn('浏览器通知发送失败', error);
  }
}
