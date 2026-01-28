import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { Plus, Wallet, TrendingUp, TrendingDown, MoreHorizontal, Calendar as CalendarIcon, PieChart, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { format, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { FinanceStats } from '../components/FinanceStats';

export function FinancePage() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showStats, setShowStats] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Fetch transactions for current month
  const transactions = useLiveQuery(
    async () => {
      return db.transactions
        .where('date')
        .between(monthStart.getTime(), monthEnd.getTime(), true, true)
        .reverse()
        .toArray();
    },
    [currentMonth]
  );

  const categories = useLiveQuery(() => db.categories.toArray());
  const accounts = useLiveQuery(() => db.accounts.toArray());

  // Calculate stats
  const stats = (transactions || []).reduce(
    (acc, t) => {
      if (t.type === 'expense') {
        acc.expense += t.amount;
      } else {
        acc.income += t.amount;
      }
      return acc;
    },
    { expense: 0, income: 0 }
  );

  const balance = stats.income - stats.expense;

  // Group by date
  const groupedTransactions = (transactions || []).reduce((groups, transaction) => {
    const dateStr = format(transaction.date, 'yyyy-MM-dd');
    if (!groups[dateStr]) {
      groups[dateStr] = [];
    }
    groups[dateStr].push(transaction);
    return groups;
  }, {} as Record<string, typeof transactions>);

  const getCategory = (id: string) => categories?.find(c => c.id === id);
  const getAccount = (id: string) => accounts?.find(a => a.id === id);

  return (
    <Layout>
      <div className="space-y-6 pb-20">
        {/* Header Card */}
        <div className="bg-primary text-primary-foreground rounded-2xl p-6 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
              <PieChart size={120} />
          </div>
          
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div>
                <p className="text-primary-foreground/80 text-sm mb-1">本月结余</p>
                <h2 className="text-3xl font-bold">¥ {balance.toFixed(2)}</h2>
            </div>
            <button 
                onClick={() => setShowStats(!showStats)}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs backdrop-blur-sm transition-colors ${showStats ? 'bg-white text-primary font-bold' : 'bg-primary-foreground/20 text-white'}`}
            >
                {showStats ? '返回明细' : '查看报表'}
                <ChevronRight size={12} className={showStats ? 'rotate-180' : ''} />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 relative z-10">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-full">
                    <TrendingDown className="h-5 w-5 text-white" />
                </div>
                <div>
                    <p className="text-xs text-primary-foreground/70">总支出</p>
                    <p className="font-semibold">¥ {stats.expense.toFixed(2)}</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-full">
                    <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                    <p className="text-xs text-primary-foreground/70">总收入</p>
                    <p className="font-semibold">¥ {stats.income.toFixed(2)}</p>
                </div>
            </div>
          </div>
        </div>

        {/* Content Switcher */}
        {showStats ? (
            <FinanceStats onBack={() => setShowStats(false)} />
        ) : (
            <>
                {/* Action Bar */}
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg">近期明细</h3>
                </div>

                {/* Transaction List */}
                <div className="space-y-4">
                    {Object.keys(groupedTransactions).length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            <Wallet size={48} className="mx-auto mb-2 opacity-20" />
                            <p>本月还没有记账哦</p>
                        </div>
                    ) : (
                        Object.entries(groupedTransactions)
                        .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                        .map(([date, items]) => (
                            <div key={date} className="space-y-2">
                                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                                    <span>{format(new Date(date), 'MM月dd日 EEEE', { locale: zhCN })}</span>
                                </div>
                                <div className="bg-card rounded-xl border overflow-hidden">
                                    {items?.map((item, idx) => {
                                        const category = getCategory(item.categoryId);
                                        const isExpense = item.type === 'expense';
                                        return (
                                            <div 
                                                key={item.id} 
                                                className={`flex items-center justify-between p-3 ${items && idx !== items.length - 1 ? 'border-b' : ''}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xl">
                                                        {category?.name.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{category?.name || '未知分类'}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {item.note || getAccount(item.accountId)?.name}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className={`font-semibold ${isExpense ? 'text-foreground' : 'text-green-600'}`}>
                                                    {isExpense ? '-' : '+'}{item.amount.toFixed(2)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </>
        )}
        
        {/* Floating Add Button */}
        <button 
            onClick={() => navigate('/finance/add')}
            className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-xl flex items-center justify-center hover:scale-105 transition-transform active:scale-95 z-40"
        >
            <Plus size={28} />
        </button>
      </div>
    </Layout>
  );
}
