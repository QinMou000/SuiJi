import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { MODE_META } from './constants';
import type { PomodoroMode } from './types';

const TIMER_NOTIFICATION_ID = 41001;
const SOUND_CHANNEL_ID = 'pomodoro-sound';
const SILENT_CHANNEL_ID = 'pomodoro-silent';

let channelsReady = false;
/** 串行化通知的预约/取消，避免快速暂停继续时旧取消覆盖新预约。 */
let notificationQueue: Promise<void> = Promise.resolve();

function enqueue(task: () => Promise<void>): Promise<void> {
  notificationQueue = notificationQueue.then(task, task).catch(() => undefined);
  return notificationQueue;
}

async function ensureChannels(): Promise<void> {
  if (channelsReady) return;
  try {
    await LocalNotifications.createChannel({
      id: SOUND_CHANNEL_ID,
      name: '番茄时钟提醒',
      description: '专注与休息结束的提示音',
      importance: 4,
      visibility: 1,
      vibration: true,
      lights: true,
      sound: 'pomodoro.wav',
    });
    await LocalNotifications.createChannel({
      id: SILENT_CHANNEL_ID,
      name: '番茄时钟静默提醒',
      description: '只在通知栏显示，不播放提示音',
      importance: 3,
      visibility: 1,
      vibration: false,
      lights: true,
    });
    channelsReady = true;
  } catch (error) {
    console.warn('创建通知频道失败', error);
  }
}

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
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
      await ensureChannels();
      await LocalNotifications.cancel({ notifications: [{ id: TIMER_NOTIFICATION_ID }] });

      const meta = MODE_META[mode];
      await LocalNotifications.schedule({
        notifications: [
          {
            id: TIMER_NOTIFICATION_ID,
            title: meta.notificationTitle,
            body: meta.notificationBody,
            channelId: options.sound ? SOUND_CHANNEL_ID : SILENT_CHANNEL_ID,
            sound: options.sound ? 'pomodoro.wav' : undefined,
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
      icon: '/favicon.svg',
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
