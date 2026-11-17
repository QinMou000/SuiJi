import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import type { PomodoroSession } from './types';
import { computeStreak, summarizeSessions, todaySessions } from './stats';

/** 订阅全部番茄会话（按开始时间倒序）。数据量级为个人使用，内存聚合足够。 */
export function usePomodoroSessions(): PomodoroSession[] | undefined {
  return useLiveQuery(() => db.pomodoroSessions.orderBy('startedAt').reverse().toArray(), []);
}

/** 今日概览 + 连续天数，供首页与专注页复用。 */
export function useFocusOverview() {
  const sessions = usePomodoroSessions();

  return useMemo(() => {
    if (!sessions) {
      return {
        loading: true,
        sessions: [] as PomodoroSession[],
        all: [] as PomodoroSession[],
        today: { completedFocus: 0, focusSeconds: 0, abandoned: 0, completedBreaks: 0, total: 0 },
        streak: 0,
      };
    }
    const today = todaySessions(sessions);
    return {
      loading: false,
      sessions: today,
      all: sessions,
      today: summarizeSessions(today),
      streak: computeStreak(sessions),
    };
  }, [sessions]);
}
