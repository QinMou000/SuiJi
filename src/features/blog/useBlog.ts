import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { useToast } from '../../components/ui/Toast';
import { ensureBlogSeeded } from './seed';
import { setBlogMeta, useBlogMeta } from './meta';
import { syncBlog } from './sync';
import type {
  BlogPost,
  BlogPostWithContent,
  BlogSyncProgress,
  BlogSyncResult,
  BlogSyncSource,
} from './types';

export function useBlogFeed() {
  const posts = useLiveQuery(() => db.blogPosts.orderBy('date').reverse().toArray(), []);
  const [error, setError] = useState<string | null>(null);
  const meta = useBlogMeta();

  useEffect(() => {
    let alive = true;
    ensureBlogSeeded().catch(seedError => {
      if (alive) {
        setError(seedError instanceof Error ? seedError.message : String(seedError));
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (posts && posts.length > 0 && meta.total !== posts.length) {
      setBlogMeta({ total: posts.length });
    }
  }, [posts, meta.total]);

  return {
    posts,
    error,
    loading: posts === undefined,
    meta,
  };
}

export function useBlogPost(id: string | undefined) {
  const post = useLiveQuery(async () => {
    if (!id) return undefined;
    const meta = await db.blogPosts.get(id);
    if (!meta) return undefined;
    const content = await db.blogContents.get(id);
    return { ...meta, content: content?.content ?? '' } as BlogPostWithContent;
  }, [id]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    ensureBlogSeeded().catch(seedError => {
      if (alive) {
        setError(seedError instanceof Error ? seedError.message : String(seedError));
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  return { post, error, loading: post === undefined };
}

export interface BlogSyncViewState {
  syncing: boolean;
  progress: BlogSyncProgress | null;
  result: BlogSyncResult | null;
  error: string | null;
  sync: () => Promise<void>;
  reset: () => void;
}

export function useBlogSync(): BlogSyncViewState {
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<BlogSyncProgress | null>(null);
  const [result, setResult] = useState<BlogSyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const syncingRef = useRef(false);

  const reset = useCallback(() => {
    setProgress(null);
    setResult(null);
    setError(null);
  }, []);

  const sync = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    setError(null);
    setResult(null);
    setProgress({
      phase: 'listing',
      total: 0,
      completed: 0,
      added: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      message: '正在连接博客源…',
    });

    try {
      const synced = await syncBlog(setProgress);
      setResult(synced);
      if (synced.failed > 0) {
        toast({
          variant: 'error',
          title: `同步完成，${synced.failed} 篇失败`,
          description: '已成功的文章已保存，可稍后重试。',
          duration: 4200,
        });
      } else if (synced.added === 0 && synced.updated === 0) {
        toast({
          variant: 'success',
          title: '博客已是最新',
          description: `${synced.total} 篇文章，无需更新。`,
        });
      } else {
        toast({
          variant: 'success',
          title: '博客同步完成',
          description: `新增 ${synced.added} 篇，更新 ${synced.updated} 篇。`,
          duration: 4200,
        });
      }
    } catch (syncError) {
      const message = syncError instanceof Error ? syncError.message : String(syncError);
      setError(message);
      toast({
        variant: 'error',
        title: '同步失败',
        description: message,
        duration: 5000,
      });
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [toast]);

  return { syncing, progress, result, error, sync, reset };
}

export function useBlogCategories(posts: BlogPost[] | undefined) {
  return useMemo(() => {
    const counts = new Map<string, number>();
    for (const post of posts ?? []) {
      const categories = post.categories.length > 0 ? post.categories : [post.category];
      for (const category of categories) {
        counts.set(category, (counts.get(category) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN'))
      .map(([name, count]) => ({ name, count }));
  }, [posts]);
}

export function sourceLabel(source: BlogSyncSource): string {
  if (source === 'snapshot') return '内置快照';
  if (source === 'github') return 'GitHub 镜像';
  if (source === 'restored') return '备份恢复';
  return '未同步';
}
