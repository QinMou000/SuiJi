import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Loader2, TrendingUp, TrendingDown, PieChart as PieIcon, BarChart3, ArrowLeft } from 'lucide-react';

interface FinanceStatsProps {
  onBack: () => void;
}

export function FinanceStats({ onBack }: FinanceStatsProps) {
  const categories = useLiveQuery(() => db.categories.toArray());
  
  // Get last 6 months transactions
  const endDate = endOfMonth(new Date());
  const startDate = startOfMonth(subMonths(new Date(), 5));
  
  const transactions = useLiveQuery(
    () => db.transactions
        .where('date')
        .between(startDate.getTime(), endDate.getTime(), true, true)
        .toArray()
  );

  const chartData = useMemo(() => {
    if (!transactions || !categories) return null;

    // 1. Trend Data (Last 6 months)
    const months = eachMonthOfInterval({ start: startDate, end: endDate });
    const trendData = months.map(month => {
        const monthStart = startOfMonth(month).getTime();
        const monthEnd = endOfMonth(month).getTime();
        const monthTrans = transactions.filter(t => t.date >= monthStart && t.date <= monthEnd);
        
        return {
            name: format(month, 'MM月'),
            income: monthTrans.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
            expense: monthTrans.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
        };
    });

    // 2. Category Data (Current Month Expense)
    const currentMonthStart = startOfMonth(new Date()).getTime();
    const currentMonthTrans = transactions.filter(t => t.date >= currentMonthStart && t.type === 'expense');
    
    const categoryMap = new Map<string, number>();
    currentMonthTrans.forEach(t => {
        const current = categoryMap.get(t.categoryId) || 0;
        categoryMap.set(t.categoryId, current + t.amount);
    });

    const categoryData = Array.from(categoryMap.entries())
        .map(([id, value]) => {
            const cat = categories.find(c => c.id === id);
            return {
                name: cat?.name || '未知',
                value,
                color: cat?.color || '#94a3b8'
            };
        })
        .sort((a, b) => b.value - a.value);

    return { trendData, categoryData };
  }, [transactions, categories]);

  if (!chartData) {
      return (
          <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-muted-foreground" />
          </div>
      );
  }

  const { trendData, categoryData } = chartData;
  const totalExpense = categoryData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <button 
            onClick={onBack}
            className="flex items-center text-sm font-medium text-foreground bg-secondary/80 hover:bg-secondary px-3 py-2 rounded-full transition-colors mb-2 w-fit"
        >
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回明细
        </button>
        
        {/* Trend Chart */}
        <div className="bg-card border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="text-primary h-5 w-5" />
                <h3 className="font-bold text-sm">收支趋势 (近6个月)</h3>
            </div>
            <div className="h-48 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData}>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                        <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                        />
                        <Bar dataKey="expense" name="支出" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={20} />
                        <Bar dataKey="income" name="收入" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Category Pie Chart */}
        <div className="bg-card border rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <PieIcon className="text-primary h-5 w-5" />
                    <h3 className="font-bold text-sm">支出构成 (本月)</h3>
                </div>
                <span className="text-xs font-mono font-medium">¥{totalExpense.toFixed(2)}</span>
            </div>
            
            <div className="flex items-center">
                <div className="h-40 w-40 shrink-0 relative">
                    {categoryData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={60}
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                            无支出
                        </div>
                    )}
                </div>
                
                {/* Legend */}
                <div className="flex-1 pl-4 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                    {categoryData.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="truncate max-w-[80px]">{item.name}</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="font-mono opacity-70">
                                    {((item.value / totalExpense) * 100).toFixed(0)}%
                                </span>
                                <span className="font-mono font-medium">¥{item.value.toFixed(0)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
}
