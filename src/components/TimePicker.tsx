import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronUp, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { createPortal } from 'react-dom';

interface TimePickerProps {
  value: string; // HH:mm
  onChange: (time: string) => void;
  className?: string;
  disabled?: boolean;
}

export const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, className, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hourRef = useRef<HTMLDivElement>(null);
  const minRef = useRef<HTMLDivElement>(null);
  const isScrollingToActive = useRef(false);
  
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const [hours, setHours] = useState('00');
  const [minutes, setMinutes] = useState('00');
  
  // Storage for user favorite times
  const [favoriteTimes, setFavoriteTimes] = useState<string[]>(() => {
    const saved = localStorage.getItem('saved_common_times');
    return saved ? JSON.parse(saved) : ['07:00', '08:00', '22:00', '23:00', '23:30'];
  });

  useEffect(() => {
    if (value && value.includes(':')) {
      const parts = value.split(':');
      setHours(parts[0].padStart(2, '0'));
      setMinutes(parts[1].padStart(2, '0'));
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
        const popoverWidth = 250;
        const popoverHeight = 390;
        
        let top = rect.bottom + 8;
        let left = rect.left;
        
        // Prevent going off right edge of screen
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
            height: `${popoverHeight}px`,
        });
    }
  };

  const scrollToActive = (hVal = hours, mVal = minutes, smooth = false) => {
    isScrollingToActive.current = true;
    setTimeout(() => {
      let count = 2;
      const decrementCount = () => {
        count--;
        if (count === 0) {
          // Add a short delay after scroll instruction before releasing flag
          setTimeout(() => {
            isScrollingToActive.current = false;
          }, 150);
        }
      };

      if (hourRef.current) {
        const targetIndex = 24 + parseInt(hVal, 10);
        const targetScrollTop = targetIndex * 36 - 37;
        hourRef.current.scrollTo({
          top: targetScrollTop,
          behavior: 'auto'
        });
        decrementCount();
      } else {
        decrementCount();
      }

      if (minRef.current) {
        const targetIndex = 60 + parseInt(mVal, 10);
        const targetScrollTop = targetIndex * 36 - 37;
        minRef.current.scrollTo({
          top: targetScrollTop,
          behavior: 'auto'
        });
        decrementCount();
      } else {
        decrementCount();
      }
    }, 30);
  };

  useEffect(() => {
    updatePosition();
    if (isOpen) {
        let currentH = hours;
        let currentM = minutes;
        if (value && value.includes(':')) {
          const parts = value.split(':');
          currentH = parts[0].padStart(2, '0');
          currentM = parts[1].padStart(2, '0');
          setHours(currentH);
          setMinutes(currentM);
        }
        window.addEventListener('resize', updatePosition, { passive: true });
        window.addEventListener('scroll', updatePosition, true);
        
        // Scroll immediately on open
        scrollToActive(currentH, currentM, false);
    }
    return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
    }
  }, [isOpen]);

  const handleHourScroll = () => {
    if (!hourRef.current) return;
    const scrollTop = hourRef.current.scrollTop;
    
    // Total cycle is 24 * 36 = 864px
    if (scrollTop < 400) {
      hourRef.current.scrollTop = scrollTop + 864;
      return;
    }
    if (scrollTop > 2000) {
      hourRef.current.scrollTop = scrollTop - 864;
      return;
    }

    if (isScrollingToActive.current) return;

    const centeredIndex = Math.round((scrollTop + 37) / 36);
    const currentHour = String(centeredIndex % 24).padStart(2, '0');
    
    if (currentHour !== hours) {
       setHours(currentHour);
       onChange(`${currentHour}:${minutes}`);
    }
  };

  const handleMinScroll = () => {
    if (!minRef.current) return;
    const scrollTop = minRef.current.scrollTop;
    
    // Total cycle is 60 * 36 = 2160px
    if (scrollTop < 1000) {
      minRef.current.scrollTop = scrollTop + 2160;
      return;
    }
    if (scrollTop > 5000) {
      minRef.current.scrollTop = scrollTop - 2160;
      return;
    }

    if (isScrollingToActive.current) return;

    const centeredIndex = Math.round((scrollTop + 37) / 36);
    const currentMin = String(centeredIndex % 60).padStart(2, '0');
    
    if (currentMin !== minutes) {
       setMinutes(currentMin);
       onChange(`${hours}:${currentMin}`);
    }
  };

  // Support circular loops for incrementing / decrementing values
  const handlePrevHour = (e: React.MouseEvent) => {
    e.stopPropagation();
    const prev = (parseInt(hours, 10) - 1 + 24) % 24;
    const formatted = String(prev).padStart(2, '0');
    setHours(formatted);
    onChange(`${formatted}:${minutes}`);
    scrollToActive(formatted, minutes, false);
  };

  const handleNextHour = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = (parseInt(hours, 10) + 1) % 24;
    const formatted = String(next).padStart(2, '0');
    setHours(formatted);
    onChange(`${formatted}:${minutes}`);
    scrollToActive(formatted, minutes, false);
  };

  const handlePrevMin = (e: React.MouseEvent) => {
    e.stopPropagation();
    const prev = (parseInt(minutes, 10) - 1 + 60) % 60;
    const formatted = String(prev).padStart(2, '0');
    setMinutes(formatted);
    onChange(`${hours}:${formatted}`);
    scrollToActive(hours, formatted, false);
  };

  const handleNextMin = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = (parseInt(minutes, 10) + 1) % 60;
    const formatted = String(next).padStart(2, '0');
    setMinutes(formatted);
    onChange(`${hours}:${formatted}`);
    scrollToActive(hours, formatted, false);
  };

  const useCurrentTime = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = new Date();
    const formattedH = String(now.getHours()).padStart(2, '0');
    const formattedM = String(now.getMinutes()).padStart(2, '0');
    setHours(formattedH);
    setMinutes(formattedM);
    onChange(`${formattedH}:${formattedM}`);
    scrollToActive(formattedH, formattedM, false);
  };

  const saveCurrentAsFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    const timeStr = `${hours}:${minutes}`;
    if (!favoriteTimes.includes(timeStr)) {
      const updated = [...favoriteTimes, timeStr].sort();
      setFavoriteTimes(updated);
      localStorage.setItem('saved_common_times', JSON.stringify(updated));
    }
  };

  const removeFavorite = (e: React.MouseEvent, timeStr: string) => {
    e.stopPropagation();
    const updated = favoriteTimes.filter(t => t !== timeStr);
    setFavoriteTimes(updated);
    localStorage.setItem('saved_common_times', JSON.stringify(updated));
  };

  const selectPreset = (e: React.MouseEvent, time: string) => {
    e.stopPropagation();
    const [h, m] = time.split(':');
    setHours(h);
    setMinutes(m);
    onChange(`${h}:${m}`);
    scrollToActive(h, m, false);
  };

  const ALL_HOURS_INFINITE = Array.from({length: 72}, (_, i) => String(i % 24).padStart(2, '0'));
  const ALL_MINS_INFINITE = Array.from({length: 180}, (_, i) => String(i % 60).padStart(2, '0'));

  return (
    <>
      <div 
        ref={triggerRef}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2 transition-colors",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-indigo-500",
          className
        )}
      >
        <span>{value || '00:00'}</span>
        <Clock size={16} className="text-slate-400" />
      </div>

      {isOpen && !disabled && createPortal(
        <div 
          ref={popoverRef}
          style={popoverStyle}
          className="fixed z-[9999] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col overflow-hidden p-3 select-none"
        >
           {/* Section 1: Column Headings */}
           <div className="grid grid-cols-2 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest pb-1 border-b border-slate-800">
              <div>HH</div>
              <div>MM</div>
           </div>
           
           {/* Section 2: Increment/Loop Chevrons */}
           <div className="grid grid-cols-2 py-1">
              <button 
                onClick={handlePrevHour}
                className="flex items-center justify-center p-1 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded transition-all"
              >
                <ChevronUp size={16} />
              </button>
              <button 
                onClick={handlePrevMin}
                className="flex items-center justify-center p-1 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded transition-all"
              >
                <ChevronUp size={16} />
              </button>
           </div>

           {/* Section 3: Value Columns */}
           <div className="flex h-[110px] overflow-hidden relative bg-slate-950/40 border border-slate-800 rounded-lg">
              {/* Highlight bar in the center */}
              <div className="absolute top-1/2 left-0 right-0 h-9 -mt-4.5 bg-indigo-500/15 border-y border-indigo-500/35 pointer-events-none" />
              
              {/* Hours Scroll Column */}
              <div 
                ref={hourRef} 
                onScroll={handleHourScroll}
                className="flex-1 overflow-y-auto overflow-x-hidden select-none touch-pan-y no-scrollbar snap-y snap-mandatory"
              >
                 {ALL_HOURS_INFINITE.map((h, i) => {
                   const isSelected = h === hours;
                   return (
                     <div 
                       key={`h-${i}`}
                       data-hour={h}
                       onClick={(e) => {
                          e.stopPropagation();
                          setHours(h);
                          onChange(`${h}:${minutes}`);
                          scrollToActive(h, minutes, false);
                       }}
                       className={cn(
                         "h-9 flex items-center justify-center cursor-pointer snap-center text-base transition-all",
                         isSelected ? "active-h text-indigo-400 font-bold scale-110" : "text-slate-400 hover:text-slate-200"
                       )}
                     >
                       {h}
                     </div>
                   );
                 })}
              </div>
              
              <div className="w-px bg-slate-800" />
              
              {/* Minutes Scroll Column */}
              <div 
                ref={minRef} 
                onScroll={handleMinScroll}
                className="flex-1 overflow-y-auto overflow-x-hidden select-none touch-pan-y no-scrollbar snap-y snap-mandatory"
              >
                 {ALL_MINS_INFINITE.map((m, i) => {
                   const isSelected = m === minutes;
                   return (
                     <div 
                       key={`m-${i}`}
                       data-minute={m}
                       onClick={(e) => {
                          e.stopPropagation();
                          setMinutes(m);
                          onChange(`${hours}:${m}`);
                          scrollToActive(hours, m, false);
                       }}
                       className={cn(
                         "h-9 flex items-center justify-center cursor-pointer snap-center text-base transition-all",
                         isSelected ? "active-m text-indigo-400 font-bold scale-110" : "text-slate-400 hover:text-slate-200"
                       )}
                     >
                       {m}
                     </div>
                   );
                 })}
              </div>
           </div>

           {/* Section 4: Decrement/Loop Chevrons */}
           <div className="grid grid-cols-2 py-1">
              <button 
                onClick={handleNextHour}
                className="flex items-center justify-center p-1 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded transition-all"
              >
                <ChevronDown size={16} />
              </button>
              <button 
                onClick={handleNextMin}
                className="flex items-center justify-center p-1 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded transition-all"
              >
                <ChevronDown size={16} />
              </button>
           </div>

           {/* Section 5: Direct Now & Favorite Actions */}
           <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={useCurrentTime}
                className="flex items-center justify-center gap-1 py-1 px-2 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                <Clock size={12} />
                Now
              </button>
              <button
                type="button"
                onClick={saveCurrentAsFavorite}
                className="flex items-center justify-center gap-1 py-1 px-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer border border-slate-700 shadow-sm"
              >
                <Plus size={12} />
                Save
              </button>
           </div>

           {/* Section 6: Presets / Fast Choice List */}
           <div className="mt-3 flex-1 flex flex-col min-h-0">
             <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex justify-between items-center">
               <span>Favorite Presets</span>
             </div>
             <div className="flex flex-wrap gap-1.5 overflow-y-auto max-h-[85px] py-0.5 no-scrollbar">
               {favoriteTimes.map((time) => (
                 <div 
                   key={time}
                   onClick={(e) => selectPreset(e, time)}
                   className={cn(
                     "px-2 py-1 bg-slate-950/60 border rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 hover:scale-102 hover:-translate-y-0.5",
                     value === time
                       ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                       : "border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200 hover:bg-slate-800"
                   )}
                 >
                   <span>{time}</span>
                   <button
                     type="button"
                     onClick={(e) => removeFavorite(e, time)}
                     className="p-0.5 text-slate-600 hover:text-red-400 hover:bg-slate-800 rounded transition-all cursor-pointer"
                     title="Remove from favorites"
                   >
                     <Trash2 size={10} />
                   </button>
                 </div>
               ))}
               {favoriteTimes.length === 0 && (
                 <span className="text-[10px] text-slate-500 italic">No presets.</span>
               )}
             </div>
           </div>
        </div>,
        document.body
      )}
    </>
  );
}
