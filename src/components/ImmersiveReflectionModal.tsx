import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Indent, Eye, EyeOff, Minimize2 } from 'lucide-react';
import Markdown from 'react-markdown';
import { createPortal } from 'react-dom';
import { cn } from '../lib/utils';

export interface ImmersiveReflectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateString: string;
  reflection: string;
  setReflection: (val: string) => void;
  isMarkdownEnabled: boolean;
  setIsMarkdownEnabled: (val: boolean) => void;
  renderTemplateControls?: () => React.ReactNode;
}

export const ImmersiveReflectionModal: React.FC<ImmersiveReflectionModalProps> = ({
  isOpen,
  onClose,
  dateString,
  reflection,
  setReflection,
  isMarkdownEnabled,
  setIsMarkdownEnabled,
  renderTemplateControls
}) => {
  const immersiveTextAreaRef = useRef<HTMLTextAreaElement>(null);

  const applyFormat = (format: 'bold' | 'italic' | 'underline' | 'indent') => {
    const textarea = immersiveTextAreaRef.current;
    if (!textarea) return;

    if (format === 'indent') {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      if (start === undefined || end === undefined) return;

      const newText = reflection.substring(0, start) + '- ' + reflection.substring(end);
      setReflection(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 2, start + 2);
      }, 0);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    if (start === undefined || end === undefined) return;
    
    const selectedText = reflection.substring(start, end);
    let replacement = '';
    let offset = 0;

    if (format === 'bold') {
      replacement = `**${selectedText}**`;
      offset = selectedText.length ? 4 : 2;
    } else if (format === 'italic') {
      replacement = `*${selectedText}*`;
      offset = selectedText.length ? 2 : 1;
    } else if (format === 'underline') {
      replacement = `<u>${selectedText}</u>`;
      offset = selectedText.length ? 7 : 3;
    }

    const newText = reflection.substring(0, start) + replacement + reflection.substring(end);
    setReflection(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        selectedText ? start : start + offset, 
        selectedText ? start + replacement.length : start + offset
      );
    }, 0);
  };

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] bg-slate-950 flex flex-col m-0 p-0"
        >
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest italic pr-1">Immersive Reflection</h3>
                <span className="hidden sm:inline-block text-[10px] font-bold text-indigo-400/80 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 tracking-wider">
                  {dateString}
                </span>
              </div>
              
              <div className="hidden sm:flex items-center gap-1 border-l border-slate-700 pl-4">
                <button onClick={() => applyFormat('bold')} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Bold">
                  <strong className="font-serif">B</strong>
                </button>
                <button onClick={() => applyFormat('italic')} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors italic" title="Italic">
                  <em className="font-serif">I</em>
                </button>
                <button onClick={() => applyFormat('underline')} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors underline" title="Underline">
                  <span className="font-serif">U</span>
                </button>
                <button onClick={() => applyFormat('indent')} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Indent / List">
                  <Indent size={14} />
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {renderTemplateControls && (
                <div className="hidden sm:block">
                  {renderTemplateControls()}
                </div>
              )}
              <button
                onClick={() => setIsMarkdownEnabled(!isMarkdownEnabled)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                  isMarkdownEnabled 
                    ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" 
                    : "bg-slate-800 text-slate-500 border border-slate-700"
                )}
              >
                {isMarkdownEnabled ? <Eye size={14} /> : <EyeOff size={14} />}
                <span>Markdown {isMarkdownEnabled ? 'On' : 'Off'}</span>
              </button>
              <button 
                onClick={onClose} 
                className="p-2 text-slate-500 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                title="Exit Immersive Mode"
              >
                <Minimize2 size={20} />
              </button>
            </div>
          </div>
          <div className={cn("flex-1 flex overflow-hidden", isMarkdownEnabled ? "flex-col md:flex-row" : "flex-col")}>
            <textarea
              ref={immersiveTextAreaRef}
              className="flex-1 p-6 sm:p-8 bg-slate-950 text-slate-200 text-base md:text-lg leading-relaxed focus:outline-none resize-none border-r border-slate-800/50 custom-scrollbar"
              placeholder="Write your reflection..."
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              autoFocus
            />
            {isMarkdownEnabled && (
              <div className="flex-1 p-6 sm:p-8 overflow-y-auto bg-slate-950/50 custom-scrollbar">
                {reflection ? (
                  <div className="prose prose-invert max-w-none prose-p:text-slate-300 prose-headings:text-slate-100 prose-strong:text-slate-200">
                    <Markdown>{reflection}</Markdown>
                  </div>
                ) : (
                  <p className="text-slate-600 italic lg:text-lg">Preview will appear here...</p>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
};
