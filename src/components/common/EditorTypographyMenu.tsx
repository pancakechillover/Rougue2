import React, { useState, useRef, useEffect } from 'react';
import { Type, Minus, Plus, ChevronDown } from 'lucide-react';
import { 
  useEditorTypography, 
  EditorFontSize, 
  EditorLineHeight 
} from '../../hooks/useEditorTypography';
import { PopoverPortal } from './PopoverPortal';
import { cn } from '../../lib/utils';

export interface EditorTypographyMenuProps {
  className?: string;
  compact?: boolean;
}

const FONT_SIZES: EditorFontSize[] = [12, 13, 14, 15, 16, 18];
const LINE_HEIGHT_OPTIONS: { id: EditorLineHeight; label: string; ratio: string }[] = [
  { id: 'tight', label: 'Tight', ratio: '1.35x' },
  { id: 'normal', label: 'Normal', ratio: '1.55x' },
  { id: 'relaxed', label: 'Relaxed', ratio: '1.8x' },
  { id: 'loose', label: 'Loose', ratio: '2.1x' },
];

export const EditorTypographyMenu: React.FC<EditorTypographyMenuProps> = ({
  className,
  compact = false,
}) => {
  const { fontSize, lineHeight, updateFontSize, updateLineHeight } = useEditorTypography();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close when clicking outside portal
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (isOpen && buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        // check if click is inside portal popup
        const portalPopup = document.getElementById('editor-typography-popover');
        if (portalPopup && portalPopup.contains(e.target as Node)) {
          return;
        }
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, [isOpen]);

  const currentIndex = FONT_SIZES.indexOf(fontSize);

  const decreaseFontSize = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      updateFontSize(FONT_SIZES[currentIndex - 1]);
    }
  };

  const increaseFontSize = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex < FONT_SIZES.length - 1) {
      updateFontSize(FONT_SIZES[currentIndex + 1]);
    }
  };

  return (
    <div className={cn("relative inline-block", className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold transition-all border",
          isOpen
            ? "bg-indigo-600/20 text-indigo-400 border-indigo-500/40 shadow-sm"
            : "bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border-slate-700/70"
        )}
        title="Editor Typography & Spacing"
      >
        <Type size={13} className="text-indigo-400" />
        <span className="text-[11px] font-mono font-bold">{fontSize}px</span>
        <ChevronDown size={11} className={cn("opacity-70 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <PopoverPortal anchorElement={buttonRef.current}>
          <div 
            id="editor-typography-popover"
            className="w-56 p-2.5 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl text-slate-200 space-y-2.5 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Typography
              </span>
              <span className="text-[10px] text-indigo-400 font-mono font-semibold">
                {fontSize}px · {lineHeight}
              </span>
            </div>

            {/* Font Size Row */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Font Size</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={decreaseFontSize}
                    disabled={currentIndex === 0}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 border border-slate-750"
                  >
                    <Minus size={10} />
                  </button>
                  <span className="w-7 text-center font-mono font-bold text-xs text-indigo-300">{fontSize}</span>
                  <button
                    type="button"
                    onClick={increaseFontSize}
                    disabled={currentIndex === FONT_SIZES.length - 1}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 border border-slate-750"
                  >
                    <Plus size={10} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {FONT_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => { updateFontSize(size); }}
                    className={cn(
                      "py-1 rounded text-[10px] font-mono font-bold border transition-all",
                      fontSize === size
                        ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                        : "bg-slate-800/60 hover:bg-slate-750 text-slate-400 hover:text-slate-200 border-slate-700/50"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Line Spacing Row */}
            <div className="space-y-1 pt-1 border-t border-slate-800">
              <div className="text-[11px] text-slate-400">Line Spacing</div>
              <div className="grid grid-cols-2 gap-1">
                {LINE_HEIGHT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => { updateLineHeight(opt.id); }}
                    className={cn(
                      "px-2 py-1 rounded-lg text-left flex items-center justify-between border transition-all text-xs",
                      lineHeight === opt.id
                        ? "bg-indigo-600/25 text-indigo-300 border-indigo-500/50 font-semibold"
                        : "bg-slate-800/60 hover:bg-slate-750 text-slate-400 hover:text-slate-200 border-slate-700/50"
                    )}
                  >
                    <span>{opt.label}</span>
                    <span className="text-[10px] font-mono opacity-60">{opt.ratio}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </PopoverPortal>
      )}
    </div>
  );
};
