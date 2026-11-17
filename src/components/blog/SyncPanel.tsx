import React from 'react';
import { CheckCircle2, CloudDownload, Loader2, RefreshCw, Sparkles, XCircle } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import type { BlogSyncProgress, BlogSyncResult } from '../../features/blog/types';
import { cn } from '../../lib/utils';

interface SyncPanelProps {
  open: boolean;
  onClose: () => void;
  syncing: boolean;
  progress: BlogSyncProgress | null;
  result: BlogSyncResult | null;
  error: string | null;
  onRetry: () => void;
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={cn('text-lg font-semibold timer-digits', tone)}>{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

/** 手动同步面板：进度环 + 增量统计 + 失败重试。 */
export function SyncPanel({
  open,
  onClose,
  syncing,
  progress,
  result,
  error,
  onRetry,
}: SyncPanelProps) {
  const total = progress?.total ?? 0;
  const completed = progress?.completed ?? 0;
  const percent = result
    ? 100
    : syncing
      ? progress?.phase === 'listing'
        ? 6
        : total > 0
          ? Math.min(98, Math.round((completed / total) * 100))
          : 12
      : 0;

  const stats = result ?? {
    added: progress?.added ?? 0,
    updated: progress?.updated ?? 0,
    skipped: progress?.skipped ?? 0,
    failed: progress?.failed ?? 0,
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="同步博客"
      description="只拉取新增或变更的文章，已读内容不会被覆盖。"
      showClose={!syncing}
      footer={
        error ? (
          <div className="flex gap-2.5">
            <Button variant="secondary" fullWidth onClick={onClose}>
              稍后再说
            </Button>
            <Button fullWidth onClick={onRetry} className="gap-1.5">
              <RefreshCw className="h-4 w-4" />
              重试
            </Button>
          </div>
        ) : syncing ? (
          <Button variant="secondary" fullWidth onClick={onClose}>
            后台同步，先看看别的
          </Button>
        ) : (
          <Button fullWidth onClick={onClose} className="gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            完成
          </Button>
        )
      }
    >
      <div className="flex flex-col items-center py-1">
        <div
          className="relative flex h-36 w-36 items-center justify-center rounded-full transition-all duration-500"
          style={{
            background: `conic-gradient(hsl(var(--focus)) ${percent * 3.6}deg, hsl(var(--foreground) / 0.08) 0deg)`,
            boxShadow: syncing ? '0 0 48px -12px hsl(var(--focus) / 0.45)' : undefined,
          }}
        >
          <div className="absolute inset-[7px] rounded-full bg-background/95 backdrop-blur" />
          <div className="relative flex flex-col items-center gap-1">
            {syncing ? (
              <Loader2 className="mb-0.5 h-6 w-6 animate-spin text-focus" />
            ) : error ? (
              <XCircle className="mb-0.5 h-6 w-6 text-destructive" />
            ) : (
              <Sparkles className="mb-0.5 h-6 w-6 text-focus" />
            )}
            <span className="text-3xl font-semibold timer-digits leading-none">
              {syncing ? `${percent}%` : error ? '!' : result ? '✓' : '0%'}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {syncing ? '同步中' : error ? '同步失败' : result ? '已完成' : '准备同步'}
            </span>
          </div>
        </div>

        <p className="mt-5 min-h-[2.5rem] px-4 text-center text-xs leading-relaxed text-muted-foreground">
          {error
            ? error
            : progress?.message
              ? progress.message
              : '正在连接博客源…'}
        </p>

        {(syncing || result) && (
          <div className="mt-1 grid w-full grid-cols-4 divide-x divide-border/60 rounded-2xl bg-secondary/45 py-3">
            <Stat label="新增" value={stats.added} tone="text-short" />
            <Stat label="更新" value={stats.updated} tone="text-focus" />
            <Stat label="跳过" value={stats.skipped} tone="text-muted-foreground" />
            <Stat label="失败" value={stats.failed} tone={stats.failed ? 'text-destructive' : ''} />
          </div>
        )}

        {result && (
          <p className="mt-3 text-[10px] text-muted-foreground">
            共 {result.total} 篇 · 用时 {(result.durationMs / 1000).toFixed(1)} 秒
            {result.removed > 0 ? ` · 移除 ${result.removed} 篇` : ''}
          </p>
        )}

        {!syncing && !result && !error && (
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <CloudDownload className="h-3.5 w-3.5" />
            文章会缓存到本机，断网也能继续读
          </div>
        )}
      </div>
    </Sheet>
  );
}
