import { useSyncExternalStore } from 'react';
import type { BlogMeta, BlogSyncSource } from './types';

const KEY = 'suiji_blog_meta_v1';
const DEFAULT_META: BlogMeta = { lastSyncAt: null, source: null, total: 0 };

function isSource(value: unknown): value is BlogSyncSource {
  return value === 'snapshot' || value === 'github' || value === 'restored' || value === null;
}

function readMeta(): BlogMeta {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_META };
    const parsed = JSON.parse(raw) as Partial<BlogMeta>;
    return {
      lastSyncAt:
        typeof parsed.lastSyncAt === 'number' && Number.isFinite(parsed.lastSyncAt)
          ? parsed.lastSyncAt
          : null,
      source: isSource(parsed.source) ? parsed.source : null,
      total: typeof parsed.total === 'number' && parsed.total >= 0 ? parsed.total : 0,
    };
  } catch {
    return { ...DEFAULT_META };
  }
}

let current = readMeta();
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getBlogMeta(): BlogMeta {
  return current;
}

export function setBlogMeta(patch: Partial<BlogMeta>): void {
  const next = { ...current, ...patch };
  if (
    next.lastSyncAt === current.lastSyncAt &&
    next.source === current.source &&
    next.total === current.total
  ) {
    return;
  }
  current = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 存储失败时保持内存状态可用
  }
  listeners.forEach(listener => listener());
}

export function useBlogMeta(): BlogMeta {
  return useSyncExternalStore(subscribe, getBlogMeta, getBlogMeta);
}
