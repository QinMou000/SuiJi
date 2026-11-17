import matter from 'gray-matter';
import type { BlogPost } from './types';

export const BLOG_BASE = 'https://qinmou000.github.io';
export const GITEE_POST_BASE =
  'https://gitee.com/wang-qin928/personal_post/blob/main/source/_posts';

export function normalizeLineEndings(value: string): string {
  return value.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export async function computeContentHash(content: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return '';
  const bytes = new TextEncoder().encode(content);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const binary = Array.from(new Uint8Array(digest), byte => String.fromCharCode(byte)).join('');
  return btoa(binary);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toDateKey(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
  }
  if (typeof value === 'string') {
    const matched = value.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
    if (matched) return `${matched[1]}-${pad(Number(matched[2]))}-${pad(Number(matched[3]))}`;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }
  }
  return null;
}

function dateFromFilename(filename: string): string | null {
  const matched = filename.match(/^(\d{4})[.-](\d{1,2})[.-](\d{1,2})/);
  return matched ? `${matched[1]}-${pad(Number(matched[2]))}-${pad(Number(matched[3]))}` : null;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(/[,，]/)
      .map(item => item.trim())
      .filter(Boolean);
  }
  return [];
}

export function stripMarkdownForExcerpt(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+.*$/gm, ' ')
    .replace(/^\s{0,3}(>|[-*+])\s+/gm, '')
    .replace(/[*_`~|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripLeadingTitle(content: string): string {
  const matched = content.match(/^\s*#\s+(.+?)\s*\n+/);
  return matched ? content.slice(matched[0].length) : content;
}

function extractCover(content: string): string | undefined {
  const candidates: string[] = [];
  for (const match of content.matchAll(/!\[[^\]]*\]\(\s*<?([^)\s>]+)/g)) candidates.push(match[1]);
  for (const match of content.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) candidates.push(match[1]);
  for (const raw of candidates) {
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:')) {
      return raw;
    }
    if (raw.startsWith('/')) return `${BLOG_BASE}${raw}`;
  }
  return undefined;
}

export interface ParsedBlogPost {
  post: BlogPost;
  content: string;
  computedHash: string;
}

/**
 * 把 Gitee/Hexo 的 Markdown 归一化为本地博客记录。
 * 文章正文会去掉 front matter；若首行 H1 与标题相同则移除，避免详情页重复。
 */
export async function parseBlogMarkdown(
  filename: string,
  raw: string,
  remoteHash = '',
): Promise<ParsedBlogPost> {
  const normalized = normalizeLineEndings(raw);
  const computedHash = await computeContentHash(normalized);
  const parsed = matter(normalized);
  const data = parsed.data || {};
  const title = String(data.title || filename.replace(/\.md$/i, '')).trim();
  const date = toDateKey(data.date) || dateFromFilename(filename) || '1970-01-01';
  const categories = toStringArray(data.categories);
  const tags = toStringArray(data.tags);

  let content = normalizeLineEndings(parsed.content || '')
    .replace(/<!--\s*more\s*-->/gi, '')
    .trim();
  content = stripLeadingTitle(content).trim();

  const plain = stripMarkdownForExcerpt(content);
  const description =
    (typeof data.description === 'string' && data.description.trim()) || plain.slice(0, 150);

  const post: BlogPost = {
    id: filename.replace(/\.md$/i, ''),
    filename,
    path: `source/_posts/${filename}`,
    title,
    date,
    categories,
    category: categories[0] || '未分类',
    tags,
    description,
    cover: extractCover(content),
    hash: remoteHash || computedHash,
    size: new TextEncoder().encode(normalized).length,
    readingMinutes: Math.max(1, Math.round(plain.replace(/\s/g, '').length / 350)),
    sourceUrl: `${GITEE_POST_BASE}/${encodeURIComponent(filename)}`,
    updatedAt: Date.now(),
  };

  return { post, content, computedHash };
}

export function formatBlogDate(date: string): string {
  const [year, month, day] = date.split('-');
  if (!year || !month || !day) return date;
  return `${year}.${month}.${day}`;
}

export function formatBlogDateLong(date: string): string {
  const [year, month, day] = date.split('-');
  if (!year || !month || !day) return date;
  return `${year} 年 ${Number(month)} 月 ${Number(day)} 日`;
}

export function formatRelativeTime(timestamp: number | null): string {
  if (!timestamp) return '尚未同步';
  const delta = Date.now() - timestamp;
  if (delta < 60_000) return '刚刚';
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)} 分钟前`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)} 小时前`;
  if (delta < 7 * 86_400_000) return `${Math.floor(delta / 86_400_000)} 天前`;
  const date = new Date(timestamp);
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}
