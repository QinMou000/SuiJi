import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { BarChart3, Flame, History, Timer, Trash2, TrendingDown } from 'lucide-react';
import { db } from '../db';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { Sheet } from '../components/ui/Sheet';
import { AnimatedNumber, EmptyState, Skeleton } from '../components/ui/Feedback';
import { SectionHeading } from '../components/ui/List';
import { useToast } from '../components/ui/Toast';
import { usePomodoroSessions } from '../features/pomodoro/useSessions';
import { MODE_META } from '../features/pomodoro/constants';
import {
  computeStreak,
  formatDateKeyLabel,
  groupSessionsByDay,
  lastNDays,
  modeSessionLabel,
  summarizeSessions,
} from '../features/pomodoro/stats';
import { formatDuration, todayKey } from '../features/pomodoro/time';
import { cn } from '../lib/utils';

type Filter = 'all' | 'focus' | 'break';

const FILTER_OPTIONS = [
  { value: 'all' as Filter, label: '全部' },
  { value: 'focus' as Filter, label: '专注' },
  { value: 'break' as Filter, label: '休息' },
];

/** 专注统计：累计概览、最近 7 天柱状图、按天分组的历史记录。 */
export function FocusStats() {
  const sessions = usePomodoroSessions();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const all = useMemo(() => sessions ?? [], [sessions]);
  const summary = useMemo(() => summarizeSessions(all), [all]);
  const week = useMemo(() => lastNDays(all, 7), [all]);
  const streak = useMemo(() => computeStreak(all), [all]);
  const maxMinutes = Math.max(1, ...week.map(day => day.minutes));
  const today = todayKey();

  const filtered = useMemo(
    () =>
      all.filter(session => {
        if (filter === 'all') return true;
        if (filter === 'focus') return session.mode === 'focus';
        return session.mode !== 'focus';
      }),
    [all, filter],
  );

  const groups = useMemo(() => groupSessionsByDay(filtered), [filtered]);

  const handleClear = async () => {
    setClearing(true);
    try {
      await db.pomodoroSessions.clear();
      toast({ title: '专注记录已清空' });
      setConfirmClear(false);
    } catch (error) {
      console.error('清空专注记录失败', error);
      toast({ variant: 'error', title: '清空失败，请重试' });
    } finally {
      setClearing(false);
    }
  };

  const summaryTiles = [
    {
      label: '累计番茄',
      value: summary.completedFocus,
      suffix: '个',
      icon: <Timer className="h-4 w-4 text-focus" />,
    },
    {
      label: '累计专注',
      value: Math.round(summary.focusSeconds / 60),
      suffix: 'min',
      icon: <BarChart3 className="h-4 w-4 text-long" />,
    },
    {
      label: '连续天数',
      value: streak,
      suffix: '天',
      icon: <Flame className="h-4 w-4 text-short" />,
    },
    {
      label: '中断次数',
      value: summary.abandoned,
      suffix: '次',
      icon: <TrendingDown className="h-4 w-4 text-muted-foreground" />,
    },
  ];

  return (
    <div className="mx-auto min-h-screen max-w-md">
      <PageHeader
        title="专注统计"
        subtitle="只保存在本机"
        backTo="/"
        actions={
          <button
            type="button"
            aria-label="清空专注记录"
            disabled={all.length === 0}
            onClick={() => setConfirmClear(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-destructive active:scale-90 disabled:opacity-30"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        }
      />

      <div className="space-y-6 px-4 py-4 pb-16">
        {sessions === undefined ? (
          <div className="grid grid-cols-2 gap-2.5">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : (
          <section className="grid grid-cols-2 gap-2.5">
            {summaryTiles.map(tile => (
              <div key={tile.label} className="surface flex flex-col gap-2 rounded-card p-4">
                <div className="flex items-center justify-between">
                  {tile.icon}
                  <span className="text-[10px] text-muted-foreground">{tile.label}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <AnimatedNumber
                    value={tile.value}
                    className="text-[1.65rem] font-semibold leading-none"
                  />
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {tile.suffix}
                  </span>
                </div>
              </div>
            ))}
          </section>
        )}

        <section className="surface rounded-card p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">最近 7 天</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">每日专注分钟数</p>
            </div>
            <Badge variant="focus">
              {week.reduce((total, day) => total + day.minutes, 0)} 分钟
            </Badge>
          </div>

          <div className="flex h-40 items-end gap-1.5">
            {week.map((day, index) => {
              const active = day.minutes > 0;
              const isToday = day.dateKey === today;
              return (
                <div
                  key={day.dateKey}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                >
                  <span
                    className={cn(
                      'text-[9px] tabular-nums',
                      active ? 'font-medium text-foreground' : 'text-muted-foreground/50',
                    )}
                  >
                    {active ? day.minutes : ''}
                  </span>
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full origin-bottom animate-bar-grow rounded-t-[6px]"
                      style={{
                        height: active
                          ? `${Math.max(8, (day.minutes / maxMinutes) * 100)}%`
                          : '3px',
                        backgroundColor: active
                          ? isToday
                            ? 'hsl(var(--focus))'
                            : 'hsl(var(--focus) / 0.55)'
                          : 'hsl(var(--foreground) / 0.08)',
                        animationDelay: `${index * 45}ms`,
                      }}
                    />
                  </div>
                  <span
                    className={cn(
                      'text-[9px]',
                      isToday
                        ? 'font-semibold text-foreground'
                        : 'text-muted-foreground',
                    )}
                  >
                    {day.weekday}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <SectionHeading
            title="历史记录"
            action={
              <span className="text-[11px] text-muted-foreground">{filtered.length} 条</span>
            }
          />
          <SegmentedControl
            value={filter}
            options={FILTER_OPTIONS}
            onChange={setFilter}
            size="sm"
            ariaLabel="筛选记录类型"
            className="mb-3"
          />

          {groups.length === 0 ? (
            <EmptyState
              icon={<History className="h-6 w-6" />}
              title="还没有专注记录"
              description="完成一个番茄后，这里会按天保存你的节奏。"
              action={
                <Button onClick={() => navigate('/')} className="gap-1.5">
                  <Timer className="h-4 w-4" />
                  去开始专注
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {groups.map(([dateKey, items]) => {
                const focusMinutes = items
                  .filter(item => item.mode === 'focus' && item.completed)
                  .reduce((total, item) => total + item.actualSec, 0);
                const tomatoes = items.filter(
                  item => item.mode === 'focus' && item.completed,
                ).length;

                return (
                  <div key={dateKey} className="surface overflow-hidden rounded-card">
                    <div className="flex items-center justify-between bg-secondary/35 px-4 py-2.5">
                      <span className="text-xs font-semibold">
                        {formatDateKeyLabel(dateKey)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {tomatoes} 个番茄 · {Math.round(focusMinutes / 60)} 分钟
                      </span>
                    </div>
                    <div className="divide-y divide-border/50 px-4">
                      {items.map(session => {
                        const meta = MODE_META[session.mode];
                        return (
                          <div key={session.id} className="flex items-center gap-3 py-3">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: `hsl(var(${meta.accentVar}))` }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-[13px] font-medium">
                                  {modeSessionLabel(session.mode)}
                                </p>
                                <span className="shrink-0 text-[10px] text-muted-foreground">
                                  {format(session.startedAt, 'HH:mm')} –{' '}
                                  {format(session.endedAt, 'HH:mm')}
                                </span>
                              </div>
                              <p className="mt-0.5 text-[10px] text-muted-foreground">
                                {formatDuration(session.actualSec)}
                                {session.pauses > 0 ? ` · 暂停 ${session.pauses} 次` : ''}
                              </p>
                            </div>
                            <Badge variant={session.completed ? 'success' : 'danger'}>
                              {session.completed ? '完成' : '中断'}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <p className="text-center text-[10px] leading-relaxed text-muted-foreground/70">
          专注记录保存在本机 IndexedDB，不会上传到任何服务器。
        </p>
      </div>

      <Sheet
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="清空专注记录？"
        description="所有番茄、专注时长与中断记录都会被删除，且无法恢复。"
        showClose={false}
        footer={
          <div className="flex gap-2.5">
            <Button variant="secondary" fullWidth onClick={() => setConfirmClear(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              fullWidth
              loading={clearing}
              onClick={() => void handleClear()}
              className="gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              确认清空
            </Button>
          </div>
        }
      >
        <p className="rounded-2xl bg-secondary/60 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          当前共有 {all.length} 条记录，其中 {summary.completedFocus} 个完成的番茄。
          旧版笔记不会被删除。
        </p>
      </Sheet>
    </div>
  );
}
