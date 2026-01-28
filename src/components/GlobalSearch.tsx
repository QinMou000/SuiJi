import React, { useState, useEffect } from 'react';
import { Search, X, FileText, Wallet, Clock, ArrowRight, Calendar } from 'lucide-react';
import { db } from '../db';
import { Record, Transaction, Countdown, Category } from '../types';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

type SearchResult = 
  | { type: 'record'; data: Record }
  | { type: 'transaction'; data: Transaction & { categoryName: string; categoryIcon: string; categoryColor?: string } }
  | { type: 'countdown'; data: Countdown };

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const navigate = useNavigate();

  const categories = useLiveQuery(() => db.categories.toArray());

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
          (r.title?.toLowerCase().includes(lowerQuery) ?? false) || 
          r.content.toLowerCase().includes(lowerQuery) ||
          (r.tags?.some(t => t.toLowerCase().includes(lowerQuery)) ?? false)
        )
        .toArray();

      // Search Transactions
      const allTransactions = await db.transactions.toArray();
      // We need to filter manually because we need to join with categories for better search if we wanted to search category names too
      // For now, let's search note and amount
      const matchedTransactions = allTransactions.filter(t => 
        (t.note?.toLowerCase().includes(lowerQuery) ?? false) ||
        t.amount.toString().includes(lowerQuery)
      );
      
      const transactionsWithMeta = matchedTransactions.map(t => {
        const cat = categories?.find(c => c.id === t.categoryId);
        return {
          ...t,
          categoryName: cat?.name || '未知',
          categoryIcon: cat?.icon || 'HelpCircle',
          categoryColor: cat?.color
        };
      });

      // Search Countdowns
      const countdowns = await db.countdowns
        .filter(c => c.title.toLowerCase().includes(lowerQuery))
        .toArray();

      const combinedResults: SearchResult[] = [
        ...records.map(r => ({ type: 'record' as const, data: r })),
        ...transactionsWithMeta.map(t => ({ type: 'transaction' as const, data: t })),
        ...countdowns.map(c => ({ type: 'countdown' as const, data: c }))
      ];

      // Sort by date descending (newest first)
      combinedResults.sort((a, b) => {
        const dateA = a.type === 'record' ? a.data.updatedAt : (a.type === 'transaction' ? a.data.date : a.data.createdAt);
        const dateB = b.type === 'record' ? b.data.updatedAt : (b.type === 'transaction' ? b.data.date : b.data.createdAt);
        return dateB - dateA;
      });

      setResults(combinedResults);
    };

    const timer = setTimeout(search, 300); // Debounce
    return () => clearTimeout(timer);
  }, [query, categories]);

  if (!isOpen) return null;

  const handleNavigate = (result: SearchResult) => {
    onClose();
    if (result.type === 'record') {
      navigate(`/record/${result.data.id}`);
    } else if (result.type === 'transaction') {
      // Navigate to finance page, maybe with query param to highlight? 
      // For now just go to finance page
      navigate('/finance');
    } else if (result.type === 'countdown') {
      navigate('/countdowns');
    }
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
              placeholder="搜索笔记、账单、倒数日..."
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
              key={result.type === 'record' ? result.data.id : (result.type === 'transaction' ? result.data.id : result.data.id)}
              onClick={() => handleNavigate(result)}
              className="flex items-center gap-3 p-3 bg-card border rounded-xl active:scale-[0.98] transition-transform cursor-pointer shadow-sm"
            >
              {/* Icon */}
              <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 bg-secondary/50">
                {result.type === 'record' && <FileText className="h-5 w-5 text-blue-500" />}
                {result.type === 'transaction' && <Wallet className="h-5 w-5 text-green-500" />}
                {result.type === 'countdown' && <Clock className="h-5 w-5 text-purple-500" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {result.type === 'record' && (
                  <>
                    <h4 className="font-medium text-sm truncate">{result.data.title || '无标题'}</h4>
                    <p className="text-xs text-muted-foreground truncate">{result.data.content}</p>
                  </>
                )}
                
                {result.type === 'transaction' && (
                  <>
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm truncate">{result.data.categoryName}</h4>
                      <span className={`text-sm font-bold font-mono ${result.data.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                        {result.data.type === 'income' ? '+' : '-'}¥{result.data.amount}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                        {format(result.data.date, 'yyyy-MM-dd HH:mm')} · {result.data.note || '无备注'}
                    </p>
                  </>
                )}

                {result.type === 'countdown' && (
                  <>
                    <h4 className="font-medium text-sm truncate">{result.data.title}</h4>
                    <p className="text-xs text-muted-foreground truncate">
                        目标日: {format(result.data.date, 'yyyy-MM-dd')}
                    </p>
                  </>
                )}
              </div>
              
              <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
