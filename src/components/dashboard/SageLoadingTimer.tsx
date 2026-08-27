import React from 'react';
import { RefreshCw, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SageLoadingTimerProps {
  startTime: number;
  isDarkTheme: boolean;
  onCancel?: () => void;
}

export const SageLoadingTimer: React.FC<SageLoadingTimerProps> = ({ startTime, isDarkTheme, onCancel }) => {
  const [elapsed, setElapsed] = React.useState(0);
  
  React.useEffect(() => {
    const updateElapsed = () => setElapsed(Math.floor((Date.now() - startTime) / 1000));
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div className={cn("p-4 rounded-2xl rounded-tl-none flex items-center gap-3 border",
      "bg-slate-900/80 border-indigo-500/20"
    )}>
       <RefreshCw className={cn("animate-spin", "text-indigo-400")} size={16} />
       <span className={cn("text-xs font-serif italic pr-1 flex-1", "text-indigo-400/70")}>
         The Sage is consulting the scrolls... ({elapsed}s)
       </span>
       {onCancel && (
         <button onClick={onCancel} className="p-1 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors shrink-0" title="Cancel Request">
           <X size={14} />
         </button>
       )}
    </div>
  );
};
