export interface BlogPost {
  id: string;
  filename: string;
  path: string;
  title: string;
  /** YYYY-MM-DD，按日历日期展示与排序 */
  date: string;
  categories: string[];
  category: string;
  tags: string[];
  description: string;
  cover?: string;
  /** 远端内容 SHA-256（base64），用于增量同步 */
  hash: string;
  size: number;
  readingMinutes: number;
  sourceUrl: string;
  updatedAt: number;
}

export interface BlogContent {
  id: string;
  content: string;
}

export type BlogSyncSource = 'snapshot' | 'github' | 'restored' | null;

export interface BlogMeta {
  lastSyncAt: number | null;
  source: BlogSyncSource;
  total: number;
}

export interface SnapshotPost extends BlogPost {
  content: string;
}

export interface SnapshotPayload {
  version: number;
  generatedAt: number;
  source: {
    gitee: string;
    github: string;
    blog: string;
  };
  posts: SnapshotPost[];
}

export interface RemoteBlogEntry {
  name: string;
  hash: string;
  size: number;
  type: 'file';
}

export type BlogSyncPhase = 'listing' | 'downloading' | 'saving' | 'done';

export interface BlogSyncProgress {
  phase: BlogSyncPhase;
  total: number;
  completed: number;
  added: number;
  updated: number;
  skipped: number;
  failed: number;
  message?: string;
}

export interface BlogSyncResult {
  total: number;
  added: number;
  updated: number;
  skipped: number;
  failed: number;
  removed: number;
  durationMs: number;
  errors: string[];
}

export interface BlogPostWithContent extends BlogPost {
  content: string;
}
