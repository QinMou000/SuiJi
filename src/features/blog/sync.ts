import { db } from '../../db';
import { setBlogMeta } from './meta';
import { normalizeLineEndings, parseBlogMarkdown } from './parse';
import type {
  BlogContent,
  BlogPost,
  BlogSyncProgress,
  BlogSyncResult,
  RemoteBlogEntry,
} from './types';

const GITHUB_REPO = 'QinMou000/QinMou000.github.io';
const BRANCH = 'main';
const POSTS_DIR = 'source/_posts';
const LISTING_URL = `https://data.jsdelivr.com/v1/packages/gh/${GITHUB_REPO}@${BRANCH}`;
const RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_REPO}/${BRANCH}/${POSTS_DIR}`;
const CDN_BASE = `https://cdn.jsdelivr.net/gh/${GITHUB_REPO}@${BRANCH}/${POSTS_DIR}`;
const GITEE_LIST_URL =
  'https://gitee.com/api/v5/repos/wang-qin928/personal_post/contents/source/_posts?ref=main';
const CONCURRENCY = 4;

type ProgressReporter = (progress: BlogSyncProgress, force?: boolean) => void;

async function fetchWithTimeout(url: string, timeoutMs = 20_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { Accept: 'application/json, text/plain;q=0.9' },
    });
  } finally {
    clearTimeout(timer);
  }
}

interface JsDelivrNode {
  name: string;
  type: 'file' | 'directory';
  hash?: string;
  size?: number;
  files?: JsDelivrNode[];
}

function findPostsDir(nodes: JsDelivrNode[]): JsDelivrNode | null {
  for (const node of nodes) {
    if (node.type === 'directory' && node.name === 'source') {
      const posts = node.files?.find(item => item.type === 'directory' && item.name === '_posts');
      if (posts) return posts;
    }
    if (node.type === 'directory' && node.files) {
      const found = findPostsDir(node.files);
      if (found) return found;
    }
  }
  return null;
}

async function fetchPrimaryListing(): Promise<RemoteBlogEntry[]> {
  const response = await fetchWithTimeout(`${LISTING_URL}?t=${Date.now()}`);
  if (!response.ok) throw new Error(`文件清单请求失败：HTTP ${response.status}`);
  const payload = (await response.json()) as { files?: JsDelivrNode[] };
  const postsDir = findPostsDir(payload.files || []);
  if (!postsDir?.files) throw new Error('文件清单中没有找到 source/_posts');
  const entries = postsDir.files
    .filter(file => file.type === 'file' && file.name.toLowerCase().endsWith('.md'))
    .map<RemoteBlogEntry>(file => ({
      name: file.name,
      hash: file.hash || '',
      size: file.size || 0,
      type: 'file',
    }));
  if (entries.length === 0) throw new Error('远端文章列表为空');
  return entries;
}

async function fetchGiteeListing(): Promise<RemoteBlogEntry[]> {
  const response = await fetchWithTimeout(GITEE_LIST_URL, 25_000);
  if (!response.ok) throw new Error(`Gitee 清单请求失败：HTTP ${response.status}`);
  const payload = (await response.json()) as Array<{ type?: string; name?: string }>;
  if (!Array.isArray(payload)) throw new Error('Gitee 清单格式异常');
  const entries = payload
    .filter(item => item.type === 'file' && item.name?.toLowerCase().endsWith('.md'))
    .map<RemoteBlogEntry>(item => ({
      name: item.name as string,
      hash: '',
      size: 0,
      type: 'file',
    }));
  if (entries.length === 0) throw new Error('Gitee 远端文章列表为空');
  return entries;
}

async function fetchListing(): Promise<{ entries: RemoteBlogEntry[]; fallback: boolean }> {
  let primary: RemoteBlogEntry[];
  try {
    primary = await fetchPrimaryListing();
  } catch (primaryError) {
    console.warn('jsDelivr 清单失败，降级到 Gitee 清单', primaryError);
    try {
      return { entries: await fetchGiteeListing(), fallback: true };
    } catch (fallbackError) {
      throw new Error(
        `无法获取文章清单：${primaryError instanceof Error ? primaryError.message : primaryError}；` +
          `${fallbackError instanceof Error ? fallbackError.message : fallbackError}`,
      );
    }
  }

  // Gitee 是文章主源：把只在 Gitee 上出现的新文章并入待同步列表。
  // 这类文章没有 GitHub hash，下载时 raw GitHub 会 404，自动走 Gitee API 正文。
  try {
    const giteeEntries = await fetchGiteeListing();
    const known = new Set(primary.map(entry => entry.name));
    const extras = giteeEntries.filter(entry => !known.has(entry.name));
    if (extras.length > 0) {
      console.info(`Gitee 比 GitHub 镜像多 ${extras.length} 篇文章，已加入同步队列`);
      return { entries: [...primary, ...extras], fallback: false };
    }
  } catch (error) {
    // Gitee API 限流或网络不可用时不影响 GitHub 镜像同步
    console.warn('Gitee 增量清单不可用，仅使用 GitHub 镜像', error);
  }

  return { entries: primary, fallback: false };
}

function decodeBase64Utf8(value: string): string {
  const binary = atob(value.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function fetchRawFromGitee(filename: string): Promise<string> {
  const encodedPath = `${POSTS_DIR}/${filename}`.split('/').map(encodeURIComponent).join('/');
  const response = await fetchWithTimeout(
    `https://gitee.com/api/v5/repos/wang-qin928/personal_post/contents/${encodedPath}?ref=main`,
    20_000,
  );
  if (!response.ok) throw new Error(`Gitee 正文请求失败：HTTP ${response.status}`);
  const payload = (await response.json()) as { content?: string; encoding?: string };
  if (payload.encoding !== 'base64' || !payload.content) {
    throw new Error('Gitee 正文格式异常');
  }
  return decodeBase64Utf8(payload.content);
}

async function downloadPost(entry: RemoteBlogEntry): Promise<{ post: BlogPost; content: string }> {
  const encoded = encodeURIComponent(entry.name);
  let raw: string;
  try {
    const response = await fetchWithTimeout(`${RAW_BASE}/${encoded}?t=${Date.now()}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    raw = await response.text();
  } catch (rawError) {
    try {
      raw = await fetchRawFromGitee(entry.name);
    } catch (giteeError) {
      throw new Error(
        `下载失败：${rawError instanceof Error ? rawError.message : rawError}；` +
          `${giteeError instanceof Error ? giteeError.message : giteeError}`,
      );
    }
  }

  const normalized = normalizeLineEndings(raw);
  const parsed = await parseBlogMarkdown(entry.name, normalized, entry.hash);
  if (entry.hash && parsed.computedHash && parsed.computedHash !== entry.hash) {
    // raw.githubusercontent.com 可能命中旧缓存，换 jsDelivr CDN 再试一次
    try {
      const cdnResponse = await fetchWithTimeout(`${CDN_BASE}/${encoded}?t=${Date.now()}`);
      if (cdnResponse.ok) {
        const secondRaw = normalizeLineEndings(await cdnResponse.text());
        const second = await parseBlogMarkdown(entry.name, secondRaw, entry.hash);
        if (!entry.hash || !second.computedHash || second.computedHash === entry.hash) {
          return { post: second.post, content: second.content };
        }
      }
    } catch {
      // 继续走下面的哈希失败错误
    }
    throw new Error('内容哈希与远端清单不一致');
  }

  return { post: parsed.post, content: parsed.content };
}

function createReporter(
  onProgress: ((progress: BlogSyncProgress) => void) | undefined,
  total: number,
): ProgressReporter {
  let lastEmit = 0;
  return (progress, force = false) => {
    const now = Date.now();
    if (!force && now - lastEmit < 120) return;
    lastEmit = now;
    onProgress?.({ ...progress, total });
  };
}

/**
 * 手动同步：比对远端文件清单的 SHA-256，只下载新增/变更的文章。
 * 内置快照的哈希与远端一致，因此首次点击同步通常只会发起 1 个清单请求。
 */
export async function syncBlog(
  onProgress?: (progress: BlogSyncProgress) => void,
): Promise<BlogSyncResult> {
  const startedAt = Date.now();
  onProgress?.({
    phase: 'listing',
    total: 0,
    completed: 0,
    added: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    message: '正在读取远端文章清单…',
  });

  const { entries, fallback } = await fetchListing();
  const localPosts = await db.blogPosts.toArray();
  const localById = new Map(localPosts.map(post => [post.id, post]));

  const pending = entries.filter(entry => {
    const id = entry.name.replace(/\.md$/i, '');
    const local = localById.get(id);
    return !local || !entry.hash || local.hash !== entry.hash;
  });
  const skipped = entries.length - pending.length;

  const report = createReporter(onProgress, pending.length || entries.length);
  let completed = 0;
  let added = 0;
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];
  const downloaded: Array<{ post: BlogPost; content: string }> = [];

  report(
    {
      phase: 'downloading',
      total: pending.length,
      completed: 0,
      added: 0,
      updated: 0,
      skipped,
      failed: 0,
      message:
        pending.length === 0
          ? '所有文章均为最新'
          : `正在下载 ${pending.length} 篇${fallback ? '（Gitee 降级清单）' : ''}…`,
    },
    true,
  );

  let cursor = 0;
  const worker = async () => {
    while (cursor < pending.length) {
      const entry = pending[cursor];
      cursor += 1;
      try {
        const result = await downloadPost(entry);
        downloaded.push(result);
        if (localById.has(result.post.id)) updated += 1;
        else added += 1;
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${entry.name}: ${message}`);
      }
      completed += 1;
      report({
        phase: 'downloading',
        total: pending.length,
        completed,
        added,
        updated,
        skipped,
        failed,
        message: `正在下载 ${completed} / ${pending.length}`,
      });
    }
  };

  const workerCount = Math.min(CONCURRENCY, pending.length);
  await Promise.all(Array.from({ length: workerCount }, worker));

  report(
    {
      phase: 'saving',
      total: pending.length,
      completed,
      added,
      updated,
      skipped,
      failed,
      message: '正在写入本地…',
    },
    true,
  );

  const remoteIds = new Set(entries.map(entry => entry.name.replace(/\.md$/i, '')));
  const missing = localPosts.filter(post => !remoteIds.has(post.id));
  const postsToPut: BlogPost[] = downloaded.map(item => item.post);
  const contentsToPut: BlogContent[] = downloaded.map(item => ({
    id: item.post.id,
    content: item.content,
  }));

  await db.transaction('rw', db.blogPosts, db.blogContents, async () => {
    if (postsToPut.length > 0) await db.blogPosts.bulkPut(postsToPut);
    if (contentsToPut.length > 0) await db.blogContents.bulkPut(contentsToPut);
    if (missing.length > 0) {
      const ids = missing.map(post => post.id);
      await db.blogPosts.bulkDelete(ids);
      await db.blogContents.bulkDelete(ids);
    }
  });

  setBlogMeta({
    lastSyncAt: Date.now(),
    source: 'github',
    total: entries.length,
  });

  const result: BlogSyncResult = {
    total: entries.length,
    added,
    updated,
    skipped,
    failed,
    removed: missing.length,
    durationMs: Date.now() - startedAt,
    errors,
  };

  onProgress?.({
    phase: 'done',
    total: entries.length,
    completed,
    added,
    updated,
    skipped,
    failed,
    message:
      failed > 0
        ? `同步完成，${failed} 篇失败`
        : pending.length === 0
          ? '所有文章均为最新'
          : '同步完成',
  });

  return result;
}
