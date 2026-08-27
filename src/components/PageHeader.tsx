import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface PageHeaderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  className?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  description, 
  icon: Icon, 
  className,
  children,
  action
}) => {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8", className)}>
      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-3xl font-black text-slate-50 tracking-tighter uppercase italic pr-4 flex items-center gap-2 sm:gap-3 min-w-0">
            <Icon className="text-indigo-500 w-5 h-5 sm:w-7 sm:h-7 shrink-0" />
            <span className="truncate pr-3.5 leading-none">{title}</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1 font-medium">{description}</p>
          {children}
        </div>
        {action && (
          <div className="shrink-0 flex items-center justify-start sm:justify-end gap-2">
            {action}
          </div>
        )}
      </div>
    </div>
  );
};

