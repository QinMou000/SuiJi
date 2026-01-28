import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Search } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface YearPickerProps {
  isOpen: boolean;
  currentYear: number;
  onSelect: (year: number) => void;
  onClose: () => void;
}

export function YearPicker({ isOpen, currentYear, onSelect, onClose }: YearPickerProps) {
  const [viewYear, setViewYear] = useState(currentYear);
  const [inputYear, setInputYear] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Sync view year when opening
  useEffect(() => {
    if (isOpen) {
      setViewYear(currentYear);
      setInputYear('');
    }
  }, [isOpen, currentYear]);

  // Focus input when opening (optional, maybe not for mobile)
  // useEffect(() => {
  //   if (isOpen && inputRef.current) {
  //      inputRef.current.focus();
  //   }
  // }, [isOpen]);

  if (!isOpen) return null;

  const currentDecadeStart = Math.floor(viewYear / 10) * 10;
  const currentDecadeEnd = currentDecadeStart + 9;
  
  // Generate 12 years for the grid (including prev/next decade hints)
  const years = Array.from({ length: 12 }, (_, i) => currentDecadeStart - 1 + i);

  const handlePrevDecade = () => setViewYear(y => y - 10);
  const handleNextDecade = () => setViewYear(y => y + 10);
  
  const handleYearClick = (year: number) => {
    onSelect(year);
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const y = parseInt(inputYear);
    if (!isNaN(y) && y > 0 && y < 9999) {
      onSelect(y);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-sm bg-card border rounded-xl shadow-lg overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
             <button 
                onClick={handlePrevDecade}
                className="p-1 hover:bg-secondary rounded-full transition-colors"
                title="上一年代"
             >
                <ChevronLeft className="h-5 w-5" />
             </button>
             <span className="font-bold text-lg">
                {currentDecadeStart} - {currentDecadeEnd}
             </span>
             <button 
                onClick={handleNextDecade}
                className="p-1 hover:bg-secondary rounded-full transition-colors"
                title="下一年代"
             >
                <ChevronRight className="h-5 w-5" />
             </button>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-secondary rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Year Grid */}
        <div className="p-4 grid grid-cols-4 gap-3">
          {years.map(year => {
            const isCurrentYear = year === new Date().getFullYear();
            const isSelectedYear = year === currentYear;
            const isOutOfDecade = year < currentDecadeStart || year > currentDecadeEnd;

            return (
              <button
                key={year}
                onClick={() => handleYearClick(year)}
                className={cn(
                  "h-12 rounded-lg text-sm font-medium transition-all duration-200 border border-transparent",
                  isSelectedYear 
                    ? "bg-primary text-primary-foreground shadow-md scale-105 font-bold" 
                    : "hover:bg-secondary hover:border-border",
                  isCurrentYear && !isSelectedYear && "text-primary border-primary font-bold",
                  isOutOfDecade && "text-muted-foreground opacity-50"
                )}
              >
                {year}
              </button>
            );
          })}
        </div>

        {/* Quick Jump Input */}
        <div className="p-4 border-t bg-secondary/20">
            <form onSubmit={handleInputSubmit} className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input 
                        ref={inputRef}
                        type="number" 
                        placeholder="跳转到年份 (如 2025)"
                        value={inputYear}
                        onChange={e => setInputYear(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                </div>
                <button 
                    type="submit"
                    disabled={!inputYear}
                    className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    跳转
                </button>
            </form>
        </div>
      </div>
    </div>
  );
}
