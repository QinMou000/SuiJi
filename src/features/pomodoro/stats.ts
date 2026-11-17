import { dateKeyOf, todayKey } from './time';
import type { DailyFocusStat, PomodoroSession } from './types';

export function summarizeSessions(sessions: PomodoroSession[]) {
  let completedFocus = 0;
  let focusSeconds = 0;
  let abandoned = 0;
  let completedBreaks = 0;

  for (const session of sessions) {
    if (session.mode === 'focus') {
      if (session.completed) {
        completedFocus += 1;
        focusSeconds += session.actualSec;
      }
      if (session.abandoned) abandoned += 1;
    } else if (session.completed) {
      completedBreaks += 1;
    }
  }

  return { completedFocus, focusSeconds, abandoned, completedBreaks, total: sessions.length };
}

export function buildDailyStats(sessions: PomodoroSession[]): Map<string, DailyFocusStat> {
  const map = new Map<string, DailyFocusStat>();

  for (const session of sessions) {
    const stat =
      map.get(session.dateKey) ??
      ({
        dateKey: session.dateKey,
        completedFocus: 0,
        focusSeconds: 0,
        abandoned: 0,
        longBreaks: 0,
      } satisfies DailyFocusStat);

    if (session.mode === 'focus') {
      if (session.completed) {
        stat.completedFocus += 1;
        stat.focusSeconds += session.actualSec;
      }
      if (session.abandoned) stat.abandoned += 1;
    } else if (session.mode === 'longBreak' && session.completed) {
      stat.longBreaks += 1;
    }

    map.set(session.dateKey, stat);
  }

  return map;
}

/** 最近 N 天（含今天）的每日聚合，缺失日期补零。 */
export function lastNDays(sessions: PomodoroSession[], days = 7) {
  const map = buildDailyStats(sessions);
  const result: Array<{
    dateKey: string;
    label: string;
    weekday: string;
    minutes: number;
    tomatoes: number;
    abandoned: number;
  }> = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const key = dateKeyOf(date.getTime());
    const stat = map.get(key);
    result.push({
      dateKey: key,
      label: offset === 0 ? '今天' : `${date.getMonth() + 1}/${date.getDate()}`,
      weekday: weekdays[date.getDay()],
      minutes: stat ? Math.round(stat.focusSeconds / 60) : 0,
      tomatoes: stat?.completedFocus ?? 0,
      abandoned: stat?.abandoned ?? 0,
    });
  }

  return result;
}

/** 连续专注天数：今天还没开始专注时，从昨天往前算，避免上午断签。 */
export function computeStreak(sessions: PomodoroSession[]): number {
  const activeDays = new Set(
    sessions.filter(session => session.mode === 'focus' && session.completed).map(session => session.dateKey),
  );
  if (activeDays.size === 0) return 0;

  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);

  if (!activeDays.has(dateKeyOf(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (activeDays.has(dateKeyOf(cursor.getTime())) && streak < 3660) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function todaySessions(sessions: PomodoroSession[]): PomodoroSession[] {
  const key = todayKey();
  return sessions.filter(session => session.dateKey === key);
}

export function groupSessionsByDay(sessions: PomodoroSession[]) {
  const groups = new Map<string, PomodoroSession[]>();
  for (const session of sessions) {
    const list = groups.get(session.dateKey) ?? [];
    list.push(session);
    groups.set(session.dateKey, list);
  }
  return Array.from(groups.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

export function formatDateKeyLabel(key: string): string {
  const [year, month, day] = key.split('-').map(Number);
  if (!year || !month || !day) return key;
  const target = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - target.getTime()) / 86_400_000);
  if (diff === 0) return '今天';
  if (diff === 1) return '昨天';
  if (diff > 1 && diff < 7) return `${diff} 天前`;
  return `${month} 月 ${day} 日`;
}

export function modeSessionLabel(mode: PomodoroSession['mode']): string {
  if (mode === 'focus') return '专注';
  if (mode === 'shortBreak') return '短休息';
  return '长休息';
}
