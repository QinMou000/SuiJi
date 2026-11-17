export type MediaType = 'photo' | 'voice' | 'link';
export type RecordType = 'text' | 'mixed' | 'blocks';

/** 链接卡片的预览元数据（microlink 抓取结果） */
export interface LinkMetadata {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}

/**
 * 块式随记的内容块。
 * type 为 'blocks' 的记录，其 content 字段是 RecordBlock[] 的 JSON 序列化结果。
 */
export type RecordBlock =
  | { id: string; kind: 'text'; text: string }
  | { id: string; kind: 'photo'; data: string }
  | { id: string; kind: 'voice'; data: string; duration?: number }
  | { id: string; kind: 'link'; data: string; linkMetadata?: LinkMetadata };

export interface Record {
  id: string;
  title?: string;
  content: string;
  type: RecordType;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Tag {
  id?: number;
  name: string;
}

export interface Media {
  id: string;
  recordId: string;
  mediaType: MediaType;
  fileData: string; // Base64 or Blob URL for local storage
  thumbnailData?: string;
  linkMetadata?: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
  };
  duration?: number; // seconds
  createdAt: number;
}

// Finance Module Types
export type TransactionType = 'expense' | 'income';

export interface Category {
  id: string;
  name: string;
  icon: string; // Lucide icon name or emoji
  type: TransactionType;
  color?: string;
  isDefault?: boolean;
}

export interface Account {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'wechat' | 'alipay' | 'other';
  balance: number; // Current balance (optional usage)
  currency?: string;
  icon?: string;
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  accountId: string;
  date: number; // timestamp
  note?: string;
  tags?: string[];
  image?: string; // Attachment
  createdAt: number;
  updatedAt: number;
}

export interface Countdown {
  id: string;
  title: string;
  date: number; // Target timestamp
  type: 'anniversary' | 'countdown'; // 纪念日 (past) | 倒数日 (future)
  note?: string;
  createdAt: number;
}

// 番茄时钟相关类型由 features/pomodoro 统一维护，这里做统一出口
export type { PomodoroMode, PomodoroSession } from '../features/pomodoro/types';
export type { BlogPost, BlogContent } from '../features/blog/types';
