import React from 'react';
import { ChevronRight, Search, X, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SettingsNavItem {
  id: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  iconColor: string;
  bgColor: string;
}

export interface SettingsNavGroup {
  id: string;
  label: string;
  items: SettingsNavItem[];
}

interface SettingsNavProps {
  groups: SettingsNavGroup[];
  activeId: string;
  onSelect: (id: string) => void;
  /**
   * `sidebar` — desktop rail: search field on top, icon + label rows.
   * `list`    — mobile entry page: taller touch rows with icon + description.
   *
   * Both render the same group data, so the two never drift apart.
   */
  variant?: 'sidebar' | 'list';
  className?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: () => void;
}

export const SettingsNav: React.FC<SettingsNavProps> = ({
  groups,
  activeId,
  onSelect,
  variant = 'sidebar',
  className,
  searchValue = '',
  onSearchChange,
  onSearchSubmit,
}) => {
  const searchField = onSearchChange ? (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearchSubmit?.();
      }}
      className="relative mb-5"
    >
      <Search
        size={13}
        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
      />
      <input
        type="text"
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search settings"
        className={cn(
          'w-full bg-slate-900/60 border border-slate-800 rounded-md py-1.5 pl-8 pr-7 text-[12px] text-slate-300',
          'placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/60 transition-colors'
        )}
      />
      {searchValue && (
        <button
          type="button"
          onClick={() => onSearchChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          aria-label="Clear search"
        >
          <X size={12} />
        </button>
      )}
    </form>
  ) : null;

  if (variant === 'sidebar') {
    return (
      <nav className={cn('w-[216px] shrink-0', className)} aria-label="Settings sections">
        {searchField}
        {groups.map((group) => (
          <div key={group.id} className="mb-5 last:mb-0">
            <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = item.id === activeId;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelect(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] font-medium transition-colors',
                      isActive
                        ? 'bg-slate-800/70 text-slate-100'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
                    )}
                  >
                    <Icon
                      size={14}
                      className={cn('shrink-0', isActive ? item.iconColor : 'text-slate-500')}
                    />
                    <span className="truncate">{item.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    );
  }

  return (
    <nav className={cn('space-y-7', className)} aria-label="Settings sections">
      {searchField}
      {groups.map((group) => (
        <div key={group.id}>
          <div className="px-1 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {group.label}
          </div>
          <div className="border-t border-slate-800/60">
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className="w-full flex items-center gap-3 px-1 py-3 border-b border-slate-800/60 active:bg-slate-800/40 transition-colors text-left"
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center border shrink-0',
                    item.bgColor
                  )}
                >
                  <item.icon size={15} className={item.iconColor} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-slate-100 truncate">
                    {item.title}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{item.desc}</div>
                </div>
                <ChevronRight size={15} className="text-slate-600 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
};
