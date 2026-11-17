import React, { useEffect, useState } from 'react';
import {
  BellRing,
  BellOff,
  CheckCircle2,
  RotateCcw,
  Volume2,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Switch } from '../components/ui/Switch';
import { Badge } from '../components/ui/Badge';
import { SectionHeading } from '../components/ui/List';
import { Stepper } from '../components/ui/Feedback';
import { usePomodoroState } from '../features/pomodoro/PomodoroProvider';
import { DEFAULT_SETTINGS, MODE_META, SETTING_LIMITS } from '../features/pomodoro/constants';
import { hasNotificationPermission } from '../features/pomodoro/notifications';
import { playChime, unlockAudio } from '../features/pomodoro/sound';

function SwitchRow({
  title,
  description,
  checked,
  onChange,
  extra,
}: {
  title: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {extra}
        <Switch checked={checked} onChange={onChange} aria-label={title} />
      </div>
    </div>
  );
}

/** 计时偏好：时长、节奏、提醒与屏幕常亮。所有修改即时保存。 */
export function PomodoroSettings() {
  const {
    settings,
    updateSettings,
    restoreDefaults,
    requestNotifications,
  } = usePomodoroState();
  const [notificationsGranted, setNotificationsGranted] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    void hasNotificationPermission().then(granted => {
      if (alive) setNotificationsGranted(granted);
    });
    return () => {
      alive = false;
    };
  }, [settings.notificationsEnabled]);

  const preview = [
    { mode: 'focus' as const, minutes: settings.focusMinutes },
    { mode: 'shortBreak' as const, minutes: settings.shortBreakMinutes },
    { mode: 'longBreak' as const, minutes: settings.longBreakMinutes },
  ];

  return (
    <div className="mx-auto min-h-screen max-w-md">
      <PageHeader title="计时偏好" subtitle="所有修改即时保存" backTo="/" />

      <div className="space-y-6 px-4 py-4 pb-16">
        {/* 当前配置预览 */}
        <section className="glass overflow-hidden rounded-panel p-4">
          <div className="grid grid-cols-3 gap-2">
            {preview.map(item => {
              const meta = MODE_META[item.mode];
              return (
                <div key={item.mode} className="flex flex-col items-center gap-1">
                  <span
                    className="h-1.5 w-8 rounded-full"
                    style={{ backgroundColor: `hsl(var(${meta.accentVar}))` }}
                  />
                  <span className="mt-1 text-2xl font-semibold timer-digits leading-none">
                    {item.minutes}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {meta.label} · 分钟
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-4 border-t border-border/60 pt-3 text-center text-[11px] text-muted-foreground">
            每完成 {settings.longBreakInterval} 个专注 · 自动进入一次长休息
          </p>
        </section>

        <section>
          <SectionHeading title="时长" hint="运行中修改会在下一轮生效" />
          <div className="surface divide-y divide-border/60 rounded-card px-4">
            <Stepper
              label="专注时长"
              description="一个番茄的默认长度"
              value={settings.focusMinutes}
              min={SETTING_LIMITS.focusMinutes.min}
              max={SETTING_LIMITS.focusMinutes.max}
              onChange={value => updateSettings({ focusMinutes: value })}
            />
            <Stepper
              label="短休息"
              description="每轮专注后的短暂停顿"
              value={settings.shortBreakMinutes}
              min={SETTING_LIMITS.shortBreakMinutes.min}
              max={SETTING_LIMITS.shortBreakMinutes.max}
              onChange={value => updateSettings({ shortBreakMinutes: value })}
            />
            <Stepper
              label="长休息"
              description="完成一组番茄后的恢复时间"
              value={settings.longBreakMinutes}
              min={SETTING_LIMITS.longBreakMinutes.min}
              max={SETTING_LIMITS.longBreakMinutes.max}
              onChange={value => updateSettings({ longBreakMinutes: value })}
            />
          </div>
        </section>

        <section>
          <SectionHeading title="节奏" />
          <div className="surface divide-y divide-border/60 rounded-card px-4">
            <Stepper
              label="长休息间隔"
              description="完成几个专注后进入长休息"
              value={settings.longBreakInterval}
              min={SETTING_LIMITS.longBreakInterval.min}
              max={SETTING_LIMITS.longBreakInterval.max}
              unit="个"
              onChange={value => updateSettings({ longBreakInterval: value })}
            />
            <SwitchRow
              title="自动开始休息"
              description="专注结束后立即开始倒计时"
              checked={settings.autoStartBreaks}
              onChange={value => updateSettings({ autoStartBreaks: value })}
            />
            <SwitchRow
              title="自动开始下一个专注"
              description="休息结束后自动进入专注（默认关闭）"
              checked={settings.autoStartFocus}
              onChange={value => updateSettings({ autoStartFocus: value })}
            />
          </div>
        </section>

        <section>
          <SectionHeading title="提醒" hint="离开应用也会提醒你" />
          <div className="surface divide-y divide-border/60 rounded-card px-4">
            <SwitchRow
              title="提示音"
              description="计时结束时播放合成提示音"
              checked={settings.soundEnabled}
              onChange={value => updateSettings({ soundEnabled: value })}
              extra={
                <button
                  type="button"
                  onClick={() => {
                    unlockAudio();
                    playChime('focusEnd');
                  }}
                  className="inline-flex h-8 items-center gap-1 rounded-full bg-secondary px-2.5 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground active:scale-95"
                >
                  <Volume2 className="h-3 w-3" />
                  试听
                </button>
              }
            />

            <SwitchRow
              title="系统通知"
              description={
                notificationsGranted === false
                  ? '尚未授权，打开开关时会请求系统权限'
                  : '结束时在通知栏提醒，并在后台保持准时'
              }
              checked={settings.notificationsEnabled}
              onChange={value => updateSettings({ notificationsEnabled: value })}
              extra={
                <Badge variant={notificationsGranted ? 'success' : 'outline'}>
                  {notificationsGranted ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" /> 已授权
                    </>
                  ) : (
                    <>
                      <BellOff className="h-3 w-3" /> 未授权
                    </>
                  )}
                </Badge>
              }
            />

            {!notificationsGranted && (
              <div className="flex items-center justify-between gap-3 py-3.5">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  授权后即使切到其他 App，也会在计时结束时收到通知。
                </p>
                <Button
                  size="sm"
                  variant="soft"
                  className="shrink-0 gap-1.5"
                  onClick={() => void requestNotifications()}
                >
                  <BellRing className="h-3.5 w-3.5" />
                  立即授权
                </Button>
              </div>
            )}

            <SwitchRow
              title="保持屏幕常亮"
              description="专注时避免手机自动锁屏（更耗电）"
              checked={settings.keepAwake}
              onChange={value => updateSettings({ keepAwake: value })}
            />
          </div>
        </section>

        <section className="space-y-2.5">
          <Button
            variant="secondary"
            fullWidth
            onClick={restoreDefaults}
            className="gap-1.5"
          >
            <RotateCcw className="h-4 w-4" />
            恢复默认时长
          </Button>
        </section>

        <p className="px-2 text-center text-[10px] leading-relaxed text-muted-foreground/70">
          番茄工作法：专注 {DEFAULT_SETTINGS.focusMinutes} 分钟，短休息{' '}
          {DEFAULT_SETTINGS.shortBreakMinutes} 分钟；每完成 {DEFAULT_SETTINGS.longBreakInterval} 个番茄，
          长休息 {DEFAULT_SETTINGS.longBreakMinutes} 分钟。
        </p>
      </div>
    </div>
  );
}
