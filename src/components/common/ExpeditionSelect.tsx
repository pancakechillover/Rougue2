import React, { useCallback, useState } from 'react';
import { Dungeon, MajorDungeon } from '../../types';
import { PopoverPortal } from './PopoverPortal';
import { ExpeditionTreePicker } from './ExpeditionTreePicker';

export interface ExpeditionSelection {
  id: string;
  name: string;
  parentName?: string;
  depth?: number;
}

export interface ExpeditionTriggerRenderArgs {
  /** Whether the picker is currently open. Use it to style the trigger. */
  open: boolean;
  /** Toggles the picker. Attach to the trigger's onClick. */
  toggle: () => void;
  /** MUST be attached to the trigger element — it is the positioning anchor. */
  triggerRef: (element: HTMLElement | null) => void;
}

interface ExpeditionSelectProps {
  dungeons: Dungeon[];
  majorDungeons?: MajorDungeon[];
  selectedId?: string;
  includeCompleted?: boolean;
  allowFreeStudy?: boolean;
  onSelect: (selection: ExpeditionSelection) => void;
  /**
   * Trigger is a render prop rather than a fixed button because the three
   * call sites need genuinely different triggers (compact icon button inside a
   * toolbar, full-width field with a chevron). Only the floating panel is
   * shared — that is where the inconsistency actually hurt.
   */
  renderTrigger: (args: ExpeditionTriggerRenderArgs) => React.ReactNode;
  /** Panel width in px. Defaults to 400 — wide enough for the header to stay on one line. */
  panelWidth?: number;
  /** Stretch the panel to at least the trigger's width. Good for full-width fields. */
  matchTriggerWidth?: boolean;
  /** Raise above a modal that also sits at z-[9999]. */
  zIndexClassName?: string;
}

export const ExpeditionSelect: React.FC<ExpeditionSelectProps> = ({
  dungeons,
  majorDungeons = [],
  selectedId,
  includeCompleted = false,
  allowFreeStudy = false,
  onSelect,
  renderTrigger,
  panelWidth = 400,
  matchTriggerWidth = false,
  zIndexClassName = 'z-[9999]',
}) => {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const triggerRef = useCallback((element: HTMLElement | null) => {
    setAnchor(element);
  }, []);

  const toggle = useCallback(() => setOpen(prev => !prev), []);
  const close = useCallback(() => setOpen(false), []);

  const handleSelect = useCallback(
    (selection: ExpeditionSelection) => {
      onSelect(selection);
      setOpen(false);
    },
    [onSelect]
  );

  // Reading the anchor width during render is safe (no writes) and keeps the
  // panel aligned with the field without a resize observer.
  const resolvedWidth =
    matchTriggerWidth && anchor
      ? Math.max(panelWidth, Math.round(anchor.getBoundingClientRect().width))
      : panelWidth;

  return (
    <>
      {renderTrigger({ open, toggle, triggerRef })}

      {open && anchor && (
        <PopoverPortal
          anchorElement={anchor}
          onRequestClose={close}
          zIndexClassName={zIndexClassName}
          showArrow={false}
        >
          <div data-expedition-select-panel="" style={{ width: resolvedWidth, maxWidth: '100%' }}>
            <ExpeditionTreePicker
              dungeons={dungeons}
              majorDungeons={majorDungeons}
              selectedId={selectedId}
              includeCompleted={includeCompleted}
              allowFreeStudy={allowFreeStudy}
              onSelect={handleSelect}
              onClose={close}
              className="w-full"
            />
          </div>
        </PopoverPortal>
      )}
    </>
  );
};
