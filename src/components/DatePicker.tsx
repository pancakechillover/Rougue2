import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { format, addMonths, subMonths, getDaysInMonth, startOfMonth, getDay, isToday } from 'date-fns';
import { cn } from '../lib/utils';
import { createPortal } from 'react-dom';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  className?: string;
  minDate?: string;
  maxDate?: string;
  children?: React.ReactNode;
  indicators?: Record<string, { highlight?: boolean; star?: boolean }>;
}

export const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, className, minDate, maxDate, children, indicators }) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  
  const [currentMonth, setCurrentMonth] = useState(() => {
    return value ? new Date(value) : new Date();
  });
  
  useEffect(() => {
    if (value) {
      setCurrentMonth(new Date(value));
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        popoverRef.current && !popoverRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const updatePosition = () => {
    if (triggerRef.current && isOpen) {
        const rect = triggerRef.current.getBoundingClientRect();
        
        let top = rect.bottom + 8;
        let left = rect.left;
        const popoverWidth = 280;
        const popoverHeight = 360;
        
        // Prevent going off right edge
        if (left + popoverWidth > window.innerWidth) {
            left = window.innerWidth - popoverWidth - 16;
        }
        
        // Prevent going off left edge
        if (left < 16) {
            left = 16;
        }

        // Prevent going off bottom edge
        if (top + popoverHeight > window.innerHeight) {
            top = rect.top - popoverHeight - 8;
        }
        
        // Prevent going off top edge
        if (top < 16) {
            top = 16;
        }

        setPopoverStyle({
            position: 'fixed',
            top: `${top}px`,
            left: `${left}px`,
            width: `${popoverWidth}px`,
        });
    }
  };

  useEffect(() => {
    updatePosition();
    if (isOpen) {
        // use passive listener for better performance
        window.addEventListener('resize', updatePosition, { passive: true });
        window.addEventListener('scroll', updatePosition, true); // capture events in the capturing phase since onscroll doesn't bubble up in elements
    }
    return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
    }
  }, [isOpen]);

  const toggleOpen = () => setIsOpen(!isOpen);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  let firstDayOfMonth = getDay(startOfMonth(currentMonth));
  firstDayOfMonth = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // shift to Monday start
  
  const handleDateClick = (day: number) => {
    const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    
    // adjust for timezone offset to get YYYY-MM-DD correctly
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    const newDateStr = `${year}-${month}-${d}`;
    
    if (minDate && newDateStr < minDate) return;
    if (maxDate && newDateStr > maxDate) return;
    
    onChange(newDateStr);
    setIsOpen(false);
  };

  // Days mapping
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  return (
    <>
      <div 
        ref={triggerRef}
        onClick={toggleOpen}
        className={children ? className : cn(
          "w-full flex items-center justify-between bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2 cursor-pointer hover:border-indigo-500 transition-colors",
          className
        )}
      >
        {children ? children : (
          <>
            <span>{value ? value : 'Select date'}</span>
            <CalendarIcon size={16} className="text-slate-400" />
          </>
        )}
      </div>

      {isOpen && createPortal(
        <div 
          ref={popoverRef}
          style={popoverStyle}
          className="fixed z-[9999] p-4 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        >
          <div className="flex items-center justify-between mb-4">
            <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
              <ChevronLeft size={20} />
            </button>
            <span className="font-bold text-slate-200">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button onClick={handleNextMonth} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
          
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">{d}</div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {blanks.map(b => <div key={`blank-${b}`} />)}
            {days.map(day => {
              const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
              const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
              const isSelected = value === dateStr;
              const isCurrentDay = isToday(date);
              
              let isDisabled = false;
              if (minDate && dateStr < minDate) isDisabled = true;
              if (maxDate && dateStr > maxDate) isDisabled = true;
              
              const dayData = indicators?.[dateStr];
              const highlight = dayData?.highlight;
              const star = dayData?.star;

              return (
                <button
                  key={day}
                  disabled={isDisabled}
                  onClick={() => handleDateClick(day)}
                  className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-colors relative",
                    isSelected 
                      ? "bg-indigo-600 text-white font-bold" 
                      : highlight
                        ? "date-highlight font-bold"
                        : isCurrentDay
                          ? "bg-slate-800 text-indigo-400 font-bold"
                          : "text-slate-300 hover:bg-slate-800",
                    isDisabled && "opacity-30 cursor-not-allowed hover:bg-transparent"
                  )}
                >
                  {day}
                  {star && (
                    <div className={cn("absolute bottom-1 right-1 w-1 h-1 rounded-full", isSelected ? "bg-white" : "bg-indigo-400")} />
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800 flex justify-center">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const d = String(today.getDate()).padStart(2, '0');
                onChange(`${year}-${month}-${d}`);
                setIsOpen(false);
              }}
              className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 shadow-md cursor-pointer"
            >
              <CalendarIcon size={12} />
              Use Current Date (Today)
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
