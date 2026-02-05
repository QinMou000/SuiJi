export type MediaType = 'photo' | 'voice' | 'link';
export type RecordType = 'text' | 'mixed' | 'blocks';

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
