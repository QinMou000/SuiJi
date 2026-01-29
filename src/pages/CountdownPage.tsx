import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { Plus, Calendar, Clock, Heart, Trash2, X, ChevronRight } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Countdown } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { format, differenceInDays, addDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export function CountdownPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [type, setType] = useState<'anniversary' | 'countdown'>('countdown');
  const [note, setNote] = useState('');

  const countdowns = useLiveQuery(
    () => db.countdowns.orderBy('date').toArray()
  );

  const resetForm = () => {
    setTitle('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setType('countdown');
    setNote('');
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!title.trim()) {
        alert('请输入标题');
        return;
    }

    try {
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        if (editingId) {
            await db.countdowns.update(editingId, {
                title,
                date: targetDate.getTime(),
                type,
                note
            });
        } else {
            await db.countdowns.add({
                id: uuidv4(),
                title,
                date: targetDate.getTime(),
                type,
                note,
                createdAt: Date.now()
            });
        }
        setIsModalOpen(false);
        resetForm();
    } catch (e) {
        console.error('Failed to save countdown', e);
        alert('保存失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定删除吗？')) {
        await db.countdowns.delete(id);
    }
  };

  const openEdit = (item: Countdown) => {
    setEditingId(item.id);
    setTitle(item.title);
    setDate(format(item.date, 'yyyy-MM-dd'));
    setType(item.type);
    setNote(item.note || '');
    setIsModalOpen(true);
  };

  return (
    <Layout>
      <div className="space-y-4 pb-20">
        <h1 className="text-2xl font-bold px-1">纪念日 & 倒数日</h1>

        {/* List */}
        <div className="space-y-3">
            {countdowns?.map(item => {
                const targetDate = new Date(item.date);
                const today = new Date();
                today.setHours(0,0,0,0);
                
                const diff = differenceInDays(targetDate, today);
                const isPast = diff < 0;
                const absDiff = Math.abs(diff);

                // Auto-detect type mismatch? Maybe user set 'countdown' but date is past
                // For display, we respect the user's intent or the math?
                // Let's stick to the math for "Days Left" vs "Days Since"
                
                const isAnniversary = item.type === 'anniversary';
                
                return (
                    <div 
                        key={item.id} 
                        onClick={() => openEdit(item)}
                        className={`bg-card border rounded-xl p-4 shadow-sm flex justify-between items-center relative overflow-hidden group active:scale-[0.98] transition-transform`}
                    >
                        {/* Decorative background accent */}
                        <div className={`absolute top-0 left-0 w-1 h-full ${isAnniversary ? 'bg-pink-500' : 'bg-blue-500'}`} />

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs px-1.5 py-0.5 rounded-md ${isAnniversary ? 'bg-pink-500/10 text-pink-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                    {isAnniversary ? '纪念日' : '倒数日'}
                                </span>
                                <h3 className="font-semibold truncate">{item.title}</h3>
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar size={12} />
                                {format(targetDate, 'yyyy-MM-dd')}
                                {item.note && <span className="ml-2 opacity-70 border-l pl-2">{item.note}</span>}
                            </p>
                        </div>

                        <div className="text-right pl-4">
                            <div className="flex items-baseline gap-1 justify-end">
                                <span className="text-xs text-muted-foreground">{isPast ? '已过去' : '还有'}</span>
                                <span className={`text-2xl font-bold ${isAnniversary ? 'text-pink-500' : 'text-blue-500'}`}>
                                    {absDiff}
                                </span>
                                <span className="text-xs text-muted-foreground">天</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground opacity-50 uppercase font-medium tracking-wider">
                                {isPast ? 'Days Since' : 'Days Left'}
                            </div>
                        </div>
                    </div>
                );
            })}
            
            {countdowns?.length === 0 && (
                <div className="text-center py-20 text-muted-foreground">
                    <Clock size={48} className="mx-auto mb-4 opacity-20" />
                    <p>还没有添加任何日子</p>
                    <p className="text-xs mt-2 opacity-70">记录生活中的重要时刻</p>
                </div>
            )}
        </div>

        {/* Floating Add Button */}
        <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-xl flex items-center justify-center hover:scale-105 transition-transform active:scale-95 z-40"
        >
            <Plus size={28} />
        </button>

        {/* Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-background w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl animate-in slide-in-from-bottom-10 duration-200 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold">{editingId ? '编辑日子' : '新日子'}</h2>
                        <div className="flex gap-2">
                            {editingId && (
                                <button onClick={() => { handleDelete(editingId); setIsModalOpen(false); }} className="p-2 text-destructive hover:bg-destructive/10 rounded-full">
                                    <Trash2 size={20} />
                                </button>
                            )}
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-secondary rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4 pb-20 sm:pb-0">
                        <div>
                            <label className="text-sm font-medium mb-1 block">标题</label>
                            <input 
                                type="text" 
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="例如: 发工资、恋爱纪念日"
                                className="w-full bg-secondary/50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">日期</label>
                                <input 
                                    type="date" 
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className="w-full bg-secondary/50 rounded-lg px-4 py-3 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">类型</label>
                                <div className="flex bg-secondary/50 p-1 rounded-lg">
                                    <button 
                                        onClick={() => setType('countdown')}
                                        className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${type === 'countdown' ? 'bg-background shadow-sm text-blue-500' : 'text-muted-foreground'}`}
                                    >
                                        倒数日
                                    </button>
                                    <button 
                                        onClick={() => setType('anniversary')}
                                        className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${type === 'anniversary' ? 'bg-background shadow-sm text-pink-500' : 'text-muted-foreground'}`}
                                    >
                                        纪念日
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1 block">备注 (可选)</label>
                            <input 
                                type="text" 
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                placeholder="写点什么..."
                                className="w-full bg-secondary/50 rounded-lg px-4 py-3 focus:outline-none"
                            />
                        </div>

                        <button 
                            onClick={handleSave}
                            className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold mt-4 active:scale-[0.98] transition-transform shadow-lg z-50 relative mb-4 sm:mb-0"
                        >
                            保存
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </Layout>
  );
}
