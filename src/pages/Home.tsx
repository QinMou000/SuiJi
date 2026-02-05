import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { RecordCard } from '../components/RecordCard';
import { Layout } from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { PenLine, Filter, Search, X } from 'lucide-react';

export function Home() {
  const navigate = useNavigate();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');

  const getSearchableText = (record: { title?: string; content: string; type: string }) => {
    const title = record.title || '';
    if (record.type === 'blocks') {
      try {
        const blocks = JSON.parse(record.content) as Array<{ kind: string; text?: string }>;
        const textFromBlocks = blocks
          .filter(b => b.kind === 'text' && typeof b.text === 'string')
          .map(b => b.text as string)
          .join('\n');
        return `${title}\n${textFromBlocks}`;
      } catch {
        return `${title}\n${record.content}`;
      }
    }
    return `${title}\n${record.content}`;
  };

  const tags = useLiveQuery(() => db.tags.toArray()) || [];
  
  const records = useLiveQuery(
    async () => {
      let collection = db.records.orderBy('createdAt').reverse();
      let all = await collection.toArray();

      // Filter by Tag
      if (selectedTag) {
        all = all.filter(r => r.tags?.includes(selectedTag));
      }

      // Filter by Search Text
      if (searchText.trim()) {
        const lowerQuery = searchText.toLowerCase();
        all = all.filter(r => getSearchableText(r).toLowerCase().includes(lowerQuery));
      }

      return all;
    },
    [selectedTag, searchText]
  );

  if (!records) return (
    <Layout>
      <div className="flex justify-center items-center h-[60vh]">
        <span className="text-muted-foreground animate-pulse">加载中...</span>
      </div>
    </Layout>
  );

  return (
    <Layout>
      {/* Search Bar */}
      <div className="relative mb-4">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Search size={16} />
        </div>
        <input 
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="搜索标题或内容..."
          className="w-full bg-secondary/50 border-none rounded-xl py-2.5 pl-9 pr-9 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
        />
        {searchText && (
          <button 
            onClick={() => setSearchText('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Tag Filter Bar */}
      {tags.length > 0 && (
        <div className="flex overflow-x-auto gap-2 pb-2 mb-2 scrollbar-hide -mx-4 px-4 sticky top-0 bg-background z-10 py-2">
          <button
            onClick={() => setSelectedTag(null)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              selectedTag === null 
                ? 'bg-primary text-primary-foreground border-primary' 
                : 'bg-background text-muted-foreground border-border hover:border-primary'
            }`}
          >
            全部
          </button>
          {tags.map(tag => (
            <button
              key={tag.id}
              onClick={() => setSelectedTag(tag.name)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                selectedTag === tag.name 
                  ? 'bg-primary text-primary-foreground border-primary' 
                  : 'bg-background text-muted-foreground border-border hover:border-primary'
              }`}
            >
              #{tag.name}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-6 pb-24">
        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground space-y-4">
            <div className="bg-secondary/50 p-6 rounded-full">
              {selectedTag ? <Filter className="h-12 w-12 opacity-50" /> : <PenLine className="h-12 w-12 opacity-50" />}
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-medium text-foreground">
                {searchText ? `未找到 "${searchText}"` : (selectedTag ? `标签 #${selectedTag} 下没有记录` : '还没有记录')}
              </p>
              {!selectedTag && !searchText && <p className="text-sm">点击下方 + 号开始记录你的第一条随记</p>}
            </div>
          </div>
        ) : (
          records.map(record => (
            <RecordCard 
              key={record.id} 
              record={record} 
              onClick={() => navigate(`/record/${record.id}`)}
            />
          ))
        )}
      </div>
    </Layout>
  );
}
