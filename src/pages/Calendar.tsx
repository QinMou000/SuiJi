import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, startOfDay, endOfDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { RecordCard } from '../components/RecordCard';
import { useNavigate } from 'react-router-dom';
import { YearPicker } from '../components/YearPicker';

export function CalendarPage() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);

  // Keyboard shortcut for Year Picker (Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        setIsYearPickerOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleYearSelect = (year: number) => {
    const newDate = new Date(currentMonth);
    newDate.setFullYear(year);
    setCurrentMonth(newDate);
    setIsYearPickerOpen(false);
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Query records for the entire month to show dots
  const monthRecords = useLiveQuery(
    async () => {
      const start = startOfMonth(currentMonth).getTime();
      const end = endOfMonth(currentMonth).getTime();
      return db.records.where('createdAt').between(start, end, true, true).toArray();
    },
    [currentMonth]
  );

  // Query records for selected date
  const selectedRecords = useLiveQuery(
    async () => {
      if (!selectedDate) return [];
      const start = startOfDay(selectedDate).getTime();
      const end = endOfDay(selectedDate).getTime();
      return db.records.where('createdAt').between(start, end, true, true).reverse().toArray();
    },
    [selectedDate]
  );

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Calculate stats
  const totalNotes = monthRecords?.length || 0;
  const daysWithNotes = new Set(monthRecords?.map(r => format(r.createdAt, 'yyyy-MM-dd'))).size;

  return (
    <Layout>
      <div className="space-y-6 pb-24">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-4">
          <button 
            className="text-lg font-bold flex items-center gap-1 hover:bg-secondary px-2 py-1 rounded-md transition-colors"
            onClick={() => setIsYearPickerOpen(true)}
          >
            {format(currentMonth, 'yyyy年 MM月', { locale: zhCN })}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </button>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="p-2 hover:bg-secondary rounded-full">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={() => { setCurrentMonth(new Date()); setSelectedDate(new Date()); }} className="p-2 hover:bg-secondary rounded-full text-xs font-medium">
              今天
            </button>
            <button onClick={nextMonth} className="p-2 hover:bg-secondary rounded-full">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Stats Card */}
        <div className="grid grid-cols-2 gap-4 mb-6">
           <div className="bg-primary/5 border rounded-xl p-4 text-center">
             <div className="text-2xl font-bold text-primary">{totalNotes}</div>
             <div className="text-xs text-muted-foreground mt-1">本月记录总数</div>
           </div>
           <div className="bg-primary/5 border rounded-xl p-4 text-center">
             <div className="text-2xl font-bold text-primary">{daysWithNotes}</div>
             <div className="text-xs text-muted-foreground mt-1">记录天数</div>
           </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-card border rounded-xl p-4 shadow-sm">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 mb-2 text-center">
            {['日', '一', '二', '三', '四', '五', '六'].map(day => (
              <div key={day} className="text-xs text-muted-foreground font-medium py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Days */}
          <div className="grid grid-cols-7 gap-y-2">
            {/* Empty cells for offset */}
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            
            {daysInMonth.map(date => {
              const hasRecord = monthRecords?.some(r => isSameDay(r.createdAt, date));
              const isSelected = selectedDate && isSameDay(date, selectedDate);
              const isTodayDate = isToday(date);

              return (
                <div key={date.toString()} className="flex flex-col items-center">
                  <button
                    onClick={() => setSelectedDate(date)}
                    className={`
                      relative w-9 h-9 flex items-center justify-center rounded-full text-sm transition-all
                      ${isSelected ? 'bg-primary text-primary-foreground font-bold shadow-md scale-105' : 'hover:bg-secondary'}
                      ${isTodayDate && !isSelected ? 'text-primary font-bold border border-primary' : ''}
                    `}
                  >
                    {format(date, 'd')}
                    {hasRecord && !isSelected && (
                      <div className="absolute bottom-1.5 w-1 h-1 bg-primary rounded-full" />
                    )}
                    {hasRecord && isSelected && (
                      <div className="absolute bottom-1.5 w-1 h-1 bg-primary-foreground rounded-full" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Records */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground pl-1">
            {selectedDate ? format(selectedDate, 'MM月dd日', { locale: zhCN }) : '选择日期'} 的记录
          </h3>
          
          {!selectedRecords || selectedRecords.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground bg-secondary/20 rounded-xl border border-dashed">
              <p className="text-sm">这一天没有记录</p>
            </div>
          ) : (
            selectedRecords.map(record => (
              <RecordCard 
                key={record.id} 
                record={record} 
                onClick={() => navigate(`/record/${record.id}`)}
              />
            ))
          )}
        </div>
      </div>

      <YearPicker 
        isOpen={isYearPickerOpen}
        currentYear={currentMonth.getFullYear()}
        onSelect={handleYearSelect}
        onClose={() => setIsYearPickerOpen(false)}
      />
    </Layout>
  );
}
