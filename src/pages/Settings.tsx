import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  BarChart3,
  Github,
  Monitor,
  Moon,
  RefreshCw,
  SlidersHorizontal,
  Sun,
  Zap,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Switch } from '../components/ui/Switch';
import { SegmentedControl, type SegmentedOption } from '../components/ui/SegmentedControl';
import { ListRow } from '../components/ui/List';
import { SyncPanel } from '../components/blog/SyncPanel';
import { db } from '../db';
import { useTheme, type ThemeMode } from '../hooks/useTheme';
import { useBlogMeta } from '../features/blog/meta';
import { sourceLabel, useBlogSync } from '../features/blog/useBlog';
import { formatRelativeTime } from '../features/blog/parse';

const THEME_OPTIONS: SegmentedOption<ThemeMode>[] = [
  { value: 'system', label: '跟随系统', icon: <Monitor className="h-3.5 w-3.5" /> },
  { value: 'light', label: '浅色', icon: <Sun className="h-3.5 w-3.5" /> },
  { value: 'dark', label: '深色', icon: <Moon className="h-3.5 w-3.5" /> },
];

const GROUP_LABEL = 'mb-1.5 px-1 text-[11px] font-semibold text-muted-foreground';

export function SettingsPage() {
  const navigate = useNavigate();
  const { themeMode, setTheme } = useTheme();
  const [imageProxyEnabled, setImageProxyEnabled] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);

  const blogCount = useLiveQuery(() => db.blogPosts.count());
  const blogMeta = useBlogMeta();
  const { syncing, progress, result, error, sync, reset } = useBlogSync();

  useEffect(() => {
    setImageProxyEnabled(localStorage.getItem('suiji_image_proxy_enabled') === 'true');
  }, []);

  const handleProxyToggle = () => {
    const next = !imageProxyEnabled;
    setImageProxyEnabled(next);
    localStorage.setItem('suiji_image_proxy_enabled', String(next));
  };

  const handleSync = () => {
    setSyncOpen(true);
    if (syncing) return;
    if (result || error) reset();
    void sync();
  };

  return (
    <Layout motion="none" mainClassName="flex flex-col pb-24">
      {/* 按可用高度摊开：grid 显式分配四行，整页刚好铺满一屏，不滚动也不留空档 */}
      <div className="grid min-h-0 flex-1 gap-4 grid-rows-[auto_1.9fr_1.4fr_0.7fr]">
        {/* 外观 */}
        <section className="shrink-0">
          <p className={GROUP_LABEL}>外观</p>
          <SegmentedControl
            value={themeMode}
            options={THEME_OPTIONS}
            onChange={setTheme}
            ariaLabel="外观主题"
          />
        </section>

        {/* 同步源：整页最大的卡片，放来源、统计和同步按钮 */}
        <section className="flex min-h-0 flex-[1.9] flex-col">
          <p className={GROUP_LABEL}>同步源</p>
          <div className="surface relative flex min-h-0 flex-1 flex-col justify-between overflow-hidden rounded-card p-3.5">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full bg-focus/12 blur-2xl"
            />

            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground">
                  CURRENT SOURCE
                </p>
                <p className="mt-1 truncate text-base font-semibold tracking-tight">
                  Gitee <span className="text-muted-foreground">/</span> GitHub 镜像
                </p>
              </div>
              <Badge variant="outline">{sourceLabel(blogMeta.source)}</Badge>
            </div>

            <p className="relative text-[11px] leading-relaxed text-muted-foreground">
              内置快照可离线阅读，点同步只拉取新增或变更的文章。
            </p>

            <div className="relative grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-secondary/45 px-3 py-2">
                <p className="text-[10px] text-muted-foreground">文章</p>
                <p className="mt-1 text-lg font-semibold leading-none timer-digits">
                  {blogCount ?? 0}
                  <span className="ml-1 text-[10px] font-normal text-muted-foreground">篇</span>
                </p>
              </div>
              <div className="rounded-2xl bg-secondary/45 px-3 py-2">
                <p className="text-[10px] text-muted-foreground">上次同步</p>
                <p className="mt-1 truncate text-sm font-semibold">
                  {formatRelativeTime(blogMeta.lastSyncAt)}
                </p>
              </div>
            </div>

            <Button
              onClick={handleSync}
              disabled={syncing}
              className="relative w-full gap-2 rounded-full bg-[linear-gradient(110deg,hsl(var(--focus)),hsl(var(--long-break)))] text-white shadow-[0_12px_30px_-14px_hsl(var(--focus)/0.9)] hover:brightness-105"
            >
              <RefreshCw className={syncing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
              {syncing ? '同步中…' : '立即同步'}
            </Button>

            <div className="relative flex items-center gap-3 text-[10px] text-muted-foreground">
              <a
                href="https://qinmou000.github.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 transition-colors hover:text-foreground"
              >
                原站
                <ArrowUpRight className="h-2.5 w-2.5" />
              </a>
              <a
                href="https://gitee.com/wang-qin928/personal_post"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 transition-colors hover:text-foreground"
              >
                Gitee
                <ArrowUpRight className="h-2.5 w-2.5" />
              </a>
              <a
                href="https://github.com/QinMou000"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 transition-colors hover:text-foreground"
              >
                <Github className="h-2.5 w-2.5" />
                GitHub
              </a>
              <span className="ml-auto text-muted-foreground/60">数据存本机</span>
            </div>
          </div>
        </section>

        {/* 专注：进入计时页的入口在底部 Dock，这里只留统计与计时偏好 */}
        <section className="flex min-h-0 flex-[2] flex-col">
          <p className={GROUP_LABEL}>专注</p>
          <div className="surface flex min-h-0 flex-1 flex-col divide-y divide-border/60 overflow-hidden rounded-card">
            <ListRow
              className="flex-1 py-0"
              icon={<BarChart3 className="h-5 w-5" />}
              label="专注统计"
              description="7 天趋势、每日番茄与中断记录"
              onClick={() => navigate('/stats')}
            />
            <ListRow
              className="flex-1 py-0"
              icon={<SlidersHorizontal className="h-5 w-5" />}
              label="计时偏好"
              description="自定义时长、长休息间隔与提醒"
              onClick={() => navigate('/pomodoro/settings')}
            />
          </div>
        </section>

        {/* 通用 */}
        <section className="flex min-h-0 flex-1 flex-col">
          <p className={GROUP_LABEL}>通用</p>
          <div className="surface flex min-h-0 flex-1 items-center rounded-card px-4">
            <div className="flex w-full items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-foreground/80">
                <Zap className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">增强图片加载</p>
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                  公共代理加速外链图片，开启系统代理时请关闭
                </p>
              </div>
              <Switch
                checked={imageProxyEnabled}
                onChange={handleProxyToggle}
                aria-label="增强图片加载"
              />
            </div>
          </div>
        </section>
      </div>

      <SyncPanel
        open={syncOpen}
        onClose={() => setSyncOpen(false)}
        syncing={syncing}
        progress={progress}
        result={result}
        error={error}
        onRetry={handleSync}
      />
    </Layout>
  );
}
