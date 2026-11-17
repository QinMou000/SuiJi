import { db } from '../../db';
import { getBlogMeta, setBlogMeta } from './meta';
import type { BlogContent, BlogPost, SnapshotPayload } from './types';

let seedPromise: Promise<number> | null = null;

async function seedFromSnapshot(): Promise<number> {
  const existingCount = await db.blogPosts.count();
  if (existingCount > 0) {
    const meta = getBlogMeta();
    if (meta.total !== existingCount) setBlogMeta({ total: existingCount });
    return existingCount;
  }

  const base = import.meta.env.BASE_URL || '/';
  const url = `${base.endsWith('/') ? base : `${base}/`}blog/posts.json`;
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`内置博客快照加载失败（HTTP ${response.status}）`);
  }

  const payload = (await response.json()) as SnapshotPayload;
  if (!payload || !Array.isArray(payload.posts) || payload.posts.length === 0) {
    throw new Error('内置博客快照内容为空');
  }

  const posts: BlogPost[] = [];
  const contents: BlogContent[] = [];
  for (const item of payload.posts) {
    const { content, ...meta } = item;
    posts.push({ ...meta, updatedAt: meta.updatedAt || payload.generatedAt });
    contents.push({ id: item.id, content });
  }

  await db.transaction('rw', db.blogPosts, db.blogContents, async () => {
    await db.blogPosts.bulkPut(posts);
    await db.blogContents.bulkPut(contents);
  });

  setBlogMeta({
    lastSyncAt: payload.generatedAt || null,
    source: 'snapshot',
    total: posts.length,
  });

  return posts.length;
}

/** 首次启动时播种内置快照；并发调用共享同一个 Promise。 */
export function ensureBlogSeeded(): Promise<number> {
  if (seedPromise) return seedPromise;
  seedPromise = seedFromSnapshot().catch(error => {
    seedPromise = null;
    throw error;
  });
  return seedPromise;
}

/** 测试 / 调试用：重置播种状态。 */
export function resetBlogSeedState(): void {
  seedPromise = null;
}
