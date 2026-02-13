import React, { useState, useEffect } from 'react';
import { Search, FileText, ArrowRight } from 'lucide-react';
import { db } from '../db';
import { Record } from '../types';
import { useNavigate } from 'react-router-dom';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

type SearchResult = 
  | { type: 'record'; data: Record };

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const navigate = useNavigate();
  
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

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const search = async () => {
      const lowerQuery = query.toLowerCase();
      
      // Search Records
      const records = await db.records
        .filter(r => 
          getSearchableText(r).toLowerCase().includes(lowerQuery) ||
          (r.tags?.some(t => t.toLowerCase().includes(lowerQuery)) ?? false)
        )
        .toArray();

      const combinedResults: SearchResult[] = [
        ...records.map(r => ({ type: 'record' as const, data: r })),
      ];

      // Sort by date descending (newest first)
      combinedResults.sort((a, b) => {
        const dateA = a.data.updatedAt;
        const dateB = b.data.updatedAt;
        return dateB - dateA;
      });

      setResults(combinedResults);
    };

    const timer = setTimeout(search, 300); // Debounce
    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const handleNavigate = (result: SearchResult) => {
    onClose();
    navigate(`/record/${result.data.id}`);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex flex-col h-full max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b bg-background/50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              type="text"
              placeholder="搜索随记..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-full bg-secondary/50 border-transparent focus:bg-background focus:border-primary transition-all text-sm outline-none"
            />
          </div>
          <button onClick={onClose} className="p-2 active:scale-90 transition-transform">
            <span className="text-sm font-medium text-primary">取消</span>
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {query && results.length === 0 && (
            <div className="text-center text-muted-foreground py-10">
              <p>未找到相关内容</p>
            </div>
          )}

          {results.map((result) => (
            <div 
              key={result.data.id}
              onClick={() => handleNavigate(result)}
              className="flex items-center gap-3 p-3 bg-card border rounded-xl active:scale-[0.98] transition-transform cursor-pointer shadow-sm"
            >
              {/* Icon */}
              <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 bg-secondary/50">
                {result.type === 'record' && <FileText className="h-5 w-5 text-blue-500" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <>
                  <h4 className="font-medium text-sm truncate">{result.data.title || '无标题'}</h4>
                  <p className="text-xs text-muted-foreground truncate">{result.data.content}</p>
                </>
              </div>
              
              <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
