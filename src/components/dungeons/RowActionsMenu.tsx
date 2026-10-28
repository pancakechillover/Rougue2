import React, { useEffect, useState } from 'react';
import { MoreHorizontal, type LucideIcon } from 'lucide-react';
import { PopoverPortal } from '../common/PopoverPortal';
import { cn } from '../../lib/utils';

export interface RowAction {
  key: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  /** Renders in red — destructive actions only. */
  danger?: boolean;
  /** Omit the entry entirely (depth limits, position in list, etc.). */
  hidden?: boolean;
  /** Draws a hairline above this item to start a new group. */
  separatorBefore?: boolean;
}

interface RowActionsMenuProps {
  actions: RowAction[];
  /** Accessible name for the trigger. */
  label?: string;
  className?: string;
}

/**
 * Overflow menu for a list row.
 *
 * Rows used to carry every action as a permanent icon: reorder arrows, add,
 * edit, delete — five or more per row, all the same visual weight. That reads
 * as noise, and the well-known task apps (Todoist, Things, Linear) keep the
 * resting row down to the checkbox and put the rest behind a menu.
 *
 * The panel is rendered through PopoverPortal so it is positioned against the
 * viewport and cannot be clipped by a scrolling row container.
 */
export const RowActionsMenu: React.FC<RowActionsMenuProps> = ({
  actions,
  label = 'More actions',
  className,
}) => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!anchor) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-row-menu-trigger]') || target.closest('[data-row-menu-panel]')) return;
      setAnchor(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAnchor(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [anchor]);

  const visible = actions.filter((a) => !a.hidden);
  if (visible.length === 0) return null;

  return (
    <>
      <button
        type="button"
        data-row-menu-trigger="1"
        onClick={(e) => {
          e.stopPropagation();
          setAnchor((prev) => (prev ? null : e.currentTarget));
        }}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        className={cn(
          'p-1 rounded text-slate-500 hover:text-slate-100 hover:bg-slate-700/60 transition-colors shrink-0',
          anchor && 'text-slate-100 bg-slate-700/60',
          className
        )}
      >
        <MoreHorizontal size={15} />
      </button>

      <PopoverPortal anchorElement={anchor}>
        <div
          data-row-menu-panel="1"
          role="menu"
          className="min-w-[168px] py-1 bg-slate-900 border border-slate-700/70 rounded-xl shadow-xl shadow-black/40 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {visible.map((action) => {
            const Icon = action.icon;
            return (
              <React.Fragment key={action.key}>
                {action.separatorBefore && (
                  <div className="my-1 border-t border-slate-800" />
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAnchor(null);
                    action.onClick();
                  }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium transition-colors',
                    action.danger
                      ? 'text-red-400 hover:bg-red-500/10'
                      : 'text-slate-200 hover:bg-slate-800'
                  )}
                >
                  <Icon size={14} className="shrink-0 opacity-80" />
                  <span className="truncate">{action.label}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </PopoverPortal>
    </>
  );
};
