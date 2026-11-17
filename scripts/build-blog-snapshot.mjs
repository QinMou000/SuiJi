#!/usr/bin/env node
/**
 * 构建内置博客快照。
 *
 * 用法：
 *   node scripts/build-blog-snapshot.mjs --source-dir ../personal_post
 *   node scripts/build-blog-snapshot.mjs            # 从 GitHub 镜像拉取
 *
 * 快照用于首次启动离线可用；之后的更新由 App 内「同步博客」手动触发。
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DEFAULT = path.join(ROOT, 'public', 'blog', 'posts.json');

const GITHUB_REPO = 'QinMou000/QinMou000.github.io';
const BRANCH = 'main';
const POSTS_DIR = 'source/_posts';
const BLOG_BASE = 'https://qinmou000.github.io';
const GITEE_BLOB = 'https://gitee.com/wang-qin928/personal_post/blob/main/source/_posts';
const LISTING_URL = `https://data.jsdelivr.com/v1/packages/gh/${GITHUB_REPO}@${BRANCH}`;
const RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_REPO}/${BRANCH}/${POSTS_DIR}`;

function parseArgs(argv) {
  const args = { sourceDir: null, out: OUT_DEFAULT, workers: 6, verify: true };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--source-dir') args.sourceDir = argv[++i];
    else if (arg === '--out') args.out = path.resolve(argv[++i]);
    else if (arg === '--workers') args.workers = Number(argv[++i]);
    else if (arg === '--no-verify') args.verify = false;
  }
  return args;
}

function normalizeText(value) {
  return String(value).replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function sha256Base64(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('base64');
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function toDateKey(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
  }
  if (typeof value === 'string') {
    const matched = value.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
    if (matched) return `${matched[1]}-${pad(matched[2])}-${pad(matched[3])}`;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }
  }
  return null;
}

function dateFromFilename(filename) {
  const matched = filename.match(/^(\d{4})[.\-](\d{1,2})[.\-](\d{1,2})/);
  return matched ? `${matched[1]}-${pad(matched[2])}-${pad(matched[3])}` : null;
}

function toStringArray(value) {
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(/[,，]/)
      .map(item => item.trim())
      .filter(Boolean);
  }
  return [];
}

function stripMarkdown(content) {
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

function stripLeadingTitle(content) {
  const matched = content.match(/^\s*#\s+(.+?)\s*\n+/);
  return matched ? content.slice(matched[0].length) : content;
}

function extractCover(content) {
  const candidates = [];
  for (const match of content.matchAll(/!\[[^\]]*\]\(\s*<?([^)\s>]+)/g)) candidates.push(match[1]);
  for (const match of content.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) candidates.push(match[1]);
  for (const raw of candidates) {
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:')) return raw;
    if (raw.startsWith('/')) return `${BLOG_BASE}${raw}`;
  }
  return undefined;
}

function parsePost({ filename, raw }) {
  const normalized = normalizeText(raw);
  const hash = sha256Base64(normalized);
  const parsed = matter(normalized);
  const data = parsed.data || {};
  const title = String(data.title || filename.replace(/\.md$/i, '')).trim();

  const date = toDateKey(data.date) || dateFromFilename(filename) || '1970-01-01';
  const categories = toStringArray(data.categories);
  const tags = toStringArray(data.tags);
  const category = categories[0] || '未分类';

  let content = normalizeText(parsed.content || '')
    .replace(/<!--\s*more\s*-->/gi, '')
    .trim();
  content = stripLeadingTitle(content).trim();

  const plain = stripMarkdown(content);
  const description = (typeof data.description === 'string' && data.description.trim()) || plain.slice(0, 150);

  return {
    id: filename.replace(/\.md$/i, ''),
    filename,
    path: `${POSTS_DIR}/${filename}`,
    title,
    date,
    categories,
    category,
    tags,
    description,
    cover: extractCover(content),
    content,
    hash,
    size: Buffer.byteLength(normalized, 'utf8'),
    readingMinutes: Math.max(1, Math.round(plain.replace(/\s/g, '').length / 350)),
    sourceUrl: `${GITEE_BLOB}/${encodeURIComponent(filename)}`,
  };
}

async function fetchJson(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'suiji-blog-snapshot/1.0', Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, attempt * 500));
    }
  }
  throw lastError;
}

function findPostsDir(nodes) {
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

async function readLocal(sourceDir) {
  const dir = path.resolve(sourceDir, 'source', '_posts');
  const names = (await fs.readdir(dir)).filter(name => name.toLowerCase().endsWith('.md'));
  const posts = [];
  for (const filename of names) {
    const raw = await fs.readFile(path.join(dir, filename), 'utf8');
    posts.push(parsePost({ filename, raw }));
  }
  return posts;
}

async function readRemote(workers, onListing) {
  const tree = await fetchJson(LISTING_URL);
  const postsDir = findPostsDir(tree.files || []);
  if (!postsDir) throw new Error('未在 jsDelivr 清单中找到 source/_posts');
  const entries = postsDir.files.filter(item => item.type === 'file' && item.name.toLowerCase().endsWith('.md'));
  onListing?.(entries);

  const posts = new Array(entries.length);
  let cursor = 0;
  async function worker() {
    while (cursor < entries.length) {
      const index = cursor++;
      const entry = entries[index];
      const url = `${RAW_BASE}/${encodeURIComponent(entry.name)}?t=${Date.now()}`;
      const response = await fetch(url, { headers: { 'User-Agent': 'suiji-blog-snapshot/1.0' } });
      if (!response.ok) throw new Error(`下载失败 ${entry.name}: HTTP ${response.status}`);
      const raw = await response.text();
      posts[index] = parsePost({ filename: entry.name, raw });
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, workers) }, worker));
  return { posts, entries };
}

async function verifyHashes(posts) {
  try {
    const tree = await fetchJson(LISTING_URL);
    const postsDir = findPostsDir(tree.files || []);
    if (!postsDir) return;
    const remote = new Map(postsDir.files.map(item => [item.name, item.hash]));
    const mismatches = posts.filter(post => remote.get(post.filename) !== post.hash);
    console.log(`[verify] 远端=${remote.size} 本地=${posts.length} 哈希不一致=${mismatches.length}`);
    if (mismatches.length > 0) {
      console.log(
        '[verify] 示例：',
        mismatches.slice(0, 5).map(post => `${post.filename} local=${post.hash} remote=${remote.get(post.filename)}`),
      );
    }
  } catch (error) {
    console.warn('[verify] 跳过哈希校验：', error instanceof Error ? error.message : error);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  let posts;
  if (args.sourceDir) {
    console.log(`[snapshot] 读取本地仓库：${path.resolve(args.sourceDir)}`);
    posts = await readLocal(args.sourceDir);
    if (args.verify) await verifyHashes(posts);
  } else {
    console.log('[snapshot] 从 GitHub 镜像拉取文章...');
    const result = await readRemote(args.workers, entries =>
      console.log(`[snapshot] 远端文章 ${entries.length} 篇`),
    );
    posts = result.posts;
  }

  posts.sort((a, b) => (a.date === b.date ? a.title.localeCompare(b.title, 'zh-CN') : b.date.localeCompare(a.date)));

  const payload = {
    version: 1,
    generatedAt: Date.now(),
    source: {
      gitee: 'wang-qin928/personal_post@main',
      github: `${GITHUB_REPO}@${BRANCH}`,
      blog: BLOG_BASE,
    },
    posts,
  };

  await fs.mkdir(path.dirname(args.out), { recursive: true });
  const json = JSON.stringify(payload);
  await fs.writeFile(args.out, json, 'utf8');

  const categories = new Map();
  for (const post of posts) categories.set(post.category, (categories.get(post.category) || 0) + 1);
  const withCover = posts.filter(post => post.cover).length;
  console.log(
    `[snapshot] 完成：${posts.length} 篇，${(Buffer.byteLength(json) / 1024 / 1024).toFixed(2)}MB，` +
      `分类 ${categories.size}，封面 ${withCover} -> ${args.out}`,
  );
  console.log(
    '[snapshot] 分类：',
    [...categories.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => `${name}:${count}`).join(' '),
  );
}

main().catch(error => {
  console.error('[snapshot] 失败：', error);
  process.exit(1);
});
