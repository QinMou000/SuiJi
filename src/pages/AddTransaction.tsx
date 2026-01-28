import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Delete, Calendar as CalendarIcon, Wallet, GripHorizontal } from 'lucide-react';
import { clsx } from 'clsx';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Transaction, TransactionType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

export function AddTransaction() {
  const navigate = useNavigate();
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('0');
  const [categoryId, setCategoryId] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [date, setDate] = useState(new Date());
  const [note, setNote] = useState('');
  
  const categories = useLiveQuery(
    () => db.categories.where('type').equals(type).toArray(),
    [type]
  );
  
  const accounts = useLiveQuery(() => db.accounts.toArray());

  // Force re-initialize if database is empty (fix for missing categories)
  useEffect(() => {
    const initData = async () => {
        const catCount = await db.categories.count();
        if (catCount === 0) {
            // Re-run initialization logic manually if empty
            const expenseCats = [
                { id: 'c_food', name: '餐饮', icon: 'Utensils', type: 'expense', color: '#ef4444', isDefault: true },
                { id: 'c_transport', name: '交通', icon: 'Bus', type: 'expense', color: '#3b82f6', isDefault: true },
                { id: 'c_shopping', name: '购物', icon: 'ShoppingBag', type: 'expense', color: '#f59e0b', isDefault: true },
                { id: 'c_entertainment', name: '娱乐', icon: 'Gamepad2', type: 'expense', color: '#8b5cf6', isDefault: true },
                { id: 'c_house', name: '居住', icon: 'Home', type: 'expense', color: '#10b981', isDefault: true },
                { id: 'c_medical', name: '医疗', icon: 'Stethoscope', type: 'expense', color: '#ef4444', isDefault: true },
                { id: 'c_other', name: '其他', icon: 'MoreHorizontal', type: 'expense', color: '#6b7280', isDefault: true },
             ];
             const incomeCats = [
                { id: 'c_salary', name: '工资', icon: 'Banknote', type: 'income', color: '#10b981', isDefault: true },
                { id: 'c_bonus', name: '奖金', icon: 'Gift', type: 'income', color: '#f59e0b', isDefault: true },
                { id: 'c_invest', name: '理财', icon: 'TrendingUp', type: 'income', color: '#3b82f6', isDefault: true },
                { id: 'c_other_in', name: '其他', icon: 'MoreHorizontal', type: 'income', color: '#6b7280', isDefault: true },
             ];
             const defaultAccounts = [
                { id: 'a_cash', name: '现金', type: 'cash', balance: 0, icon: 'Wallet' },
                { id: 'a_wechat', name: '微信', type: 'wechat', balance: 0, icon: 'MessageCircle' },
                { id: 'a_alipay', name: '支付宝', type: 'alipay', balance: 0, icon: 'CreditCard' },
                { id: 'a_bank', name: '银行卡', type: 'bank', balance: 0, icon: 'Landmark' },
             ];

             await db.transaction('rw', db.categories, db.accounts, async () => {
                 await db.categories.bulkAdd([...expenseCats, ...incomeCats] as any);
                 const accCount = await db.accounts.count();
                 if (accCount === 0) {
                     await db.accounts.bulkAdd(defaultAccounts as any);
                 }
             });
             // Trigger reload
             window.location.reload();
        }
    };
    initData();
  }, []);

  // Set default account
  useEffect(() => {
    if (accounts && accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [accounts]);

  // Set default category only if not set or invalid for current type
  useEffect(() => {
      if (categories && categories.length > 0) {
          // If no category selected, OR selected category not in current list (switched type)
          const isValid = categoryId && categories.find(c => c.id === categoryId);
          if (!categoryId || !isValid) {
              setCategoryId(categories[0].id);
          }
      }
  }, [categories, type]);

  const handleNumberClick = (num: string) => {
    if (amount === '0' && num !== '.') {
      setAmount(num);
    } else {
      // Prevent multiple dots
      if (num === '.' && amount.includes('.')) return;
      // Prevent too many decimals
      if (amount.includes('.') && amount.split('.')[1].length >= 2) return;
      
      setAmount(prev => prev + num);
    }
  };

  const handleDelete = () => {
    if (amount.length === 1) {
      setAmount('0');
    } else {
      setAmount(prev => prev.slice(0, -1));
    }
  };

  const handleSave = async () => {
    const val = parseFloat(amount);
    
    if (val <= 0) {
        alert('请输入有效金额');
        return;
    }
    
    if (!categoryId) {
        alert('请选择分类');
        return;
    }

    if (!accountId) {
        alert('请选择账户');
        return;
    }

    try {
        const transaction: Transaction = {
            id: uuidv4(),
            amount: val,
            type,
            categoryId,
            accountId,
            date: date.getTime(),
            note: note.trim() || undefined,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        await db.transactions.add(transaction);
        navigate('/finance', { replace: true });
    } catch (e) {
        console.error('Failed to save', e);
        alert('保存失败');
    }
  };

  const handleBack = () => {
      navigate('/finance', { replace: true });
  };

  return (
    <div className="flex flex-col h-screen bg-background max-w-md mx-auto relative pt-[env(safe-area-inset-top)]">
      {/* Header */}
      <div className="flex items-center px-4 h-14 shrink-0 bg-primary text-primary-foreground">
        <button onClick={handleBack} className="p-2 -ml-2">
          <ArrowLeft className="h-6 w-6" />
        </button>
        
        {/* Type Switcher */}
        <div className="flex-1 flex justify-center">
            <div className="flex bg-secondary/50 p-1 rounded-lg">
                <button 
                    onClick={() => setType('expense')}
                    className={clsx(
                        "px-4 py-1 text-sm font-medium rounded-md transition-all",
                        type === 'expense' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    支出
                </button>
                <button 
                    onClick={() => setType('income')}
                    className={clsx(
                        "px-4 py-1 text-sm font-medium rounded-md transition-all",
                        type === 'income' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    收入
                </button>
            </div>
        </div>
        <div className="w-10"></div> {/* Spacer */}
      </div>

      {/* Amount Display */}
      <div className="bg-primary text-primary-foreground px-6 py-4 pb-8 shrink-0">
         <div className="text-sm opacity-80 mb-1">金额</div>
         <div className="text-4xl font-bold tracking-tight">
            {amount}
         </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto bg-background rounded-t-3xl -mt-4 shadow-inner flex flex-col min-h-0">
        {/* Category Grid */}
        <div className="p-4 overflow-x-auto whitespace-nowrap scrollbar-hide shrink-0 border-b min-h-[120px]">
           {(!categories || categories.length === 0) ? (
               <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-4">
                   <span className="text-xs">加载分类中...</span>
               </div>
           ) : (
               <div className="grid grid-cols-5 gap-4">
                  {categories.map(cat => (
                      <button 
                        key={cat.id}
                        onClick={() => setCategoryId(cat.id)}
                        className="flex flex-col items-center gap-2"
                      >
                          <div className={clsx(
                              "w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all",
                              categoryId === cat.id 
                                ? "bg-primary text-primary-foreground scale-110 shadow-md" 
                                : "bg-secondary text-muted-foreground"
                          )}>
                              {/* Icon rendering logic would go here */}
                              {cat.name.charAt(0)}
                          </div>
                          <span className={clsx(
                              "text-xs",
                              categoryId === cat.id ? "font-medium text-primary" : "text-muted-foreground"
                          )}>{cat.name}</span>
                      </button>
                  ))}
               </div>
           )}
        </div>

        {/* Inputs */}
        <div className="p-4 space-y-4">
            {/* Account & Date Row */}
            <div className="flex gap-3">
                <div className="flex-1 bg-secondary/30 rounded-lg p-3 flex items-center gap-2">
                    <Wallet size={16} className="text-muted-foreground" />
                    <select 
                        value={accountId}
                        onChange={e => setAccountId(e.target.value)}
                        className="bg-transparent text-sm w-full focus:outline-none"
                    >
                        {accounts?.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex-1 bg-secondary/30 rounded-lg p-3 flex items-center gap-2">
                    <CalendarIcon size={16} className="text-muted-foreground" />
                    <span className="text-sm">{format(date, 'MM月dd日')}</span>
                    {/* Date picker implementation skipped for brevity, using current date */}
                </div>
            </div>

            {/* Note */}
            <div className="bg-secondary/30 rounded-lg p-3 flex items-center gap-2">
                <GripHorizontal size={16} className="text-muted-foreground" />
                <input 
                    type="text" 
                    placeholder="备注..." 
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    className="bg-transparent text-sm w-full focus:outline-none"
                />
            </div>
        </div>

        <div className="flex-1"></div>

        {/* Keypad */}
        <div className="grid grid-cols-4 bg-secondary/10 border-t">
            {['1', '2', '3', 'DEL'].map(k => (
                <button 
                    key={k} 
                    onClick={() => k === 'DEL' ? handleDelete() : handleNumberClick(k)}
                    className="h-16 text-xl font-medium hover:bg-secondary/20 active:bg-secondary/40 transition-colors flex items-center justify-center border-r border-b last:border-r-0"
                >
                    {k === 'DEL' ? <Delete size={24} /> : k}
                </button>
            ))}
            {['4', '5', '6', '+'].map(k => (
                <button 
                    key={k} 
                    onClick={() => k === '+' ? {} : handleNumberClick(k)} // Plus not impl yet
                    className="h-16 text-xl font-medium hover:bg-secondary/20 active:bg-secondary/40 transition-colors flex items-center justify-center border-r border-b last:border-r-0"
                >
                    {k}
                </button>
            ))}
            {['7', '8', '9', '-'].map(k => (
                <button 
                    key={k} 
                    onClick={() => k === '-' ? {} : handleNumberClick(k)} // Minus not impl yet
                    className="h-16 text-xl font-medium hover:bg-secondary/20 active:bg-secondary/40 transition-colors flex items-center justify-center border-r border-b last:border-r-0"
                >
                    {k}
                </button>
            ))}
            {['.', '0', 'CONFIRM'].map((k, i) => (
                <button 
                    key={k} 
                    onClick={() => k === 'CONFIRM' ? handleSave() : handleNumberClick(k)}
                    className={clsx(
                        "h-16 text-xl font-medium transition-colors flex items-center justify-center border-r border-b last:border-r-0",
                        k === 'CONFIRM' ? "col-span-2 bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-secondary/20 active:bg-secondary/40"
                    )}
                >
                    {k === 'CONFIRM' ? '完成' : k}
                </button>
            ))}
        </div>
      </div>
    </div>
  );
}
