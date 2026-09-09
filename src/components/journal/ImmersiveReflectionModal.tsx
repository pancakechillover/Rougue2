import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Minimize2, Download, Upload } from 'lucide-react';
import { createPortal } from 'react-dom';
import { ReflectionTemplate } from '../../types';
import { ReflectionTemplatesDropdown } from '../common/ReflectionTemplatesDropdown';
import { MarkdownEditor } from '../common/MarkdownEditor';

export interface ImmersiveReflectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateString: string;
  reflection: string;
  setReflection: (val: string) => void;
  isMarkdownEnabled?: boolean;
  setIsMarkdownEnabled?: (val: boolean) => void;
  templates?: ReflectionTemplate[];
  onUpdateTemplates?: (templates: ReflectionTemplate[]) => void;
  autoLoadTemplateId?: string | null;
  autoLoadTemplateMode?: 'empty' | 'example';
  onSetAutoLoadTemplate?: (templateId: string | null, mode?: 'empty' | 'example') => void;
  renderTemplateControls?: () => React.ReactNode;
}

export const ImmersiveReflectionModal: React.FC<ImmersiveReflectionModalProps> = ({
  isOpen,
  onClose,
  dateString,
  reflection,
  setReflection,
  templates,
  onUpdateTemplates,
  autoLoadTemplateId,
  autoLoadTemplateMode,
  onSetAutoLoadTemplate,
  renderTemplateControls
}) => {
  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] bg-slate-950 flex flex-col m-0 p-0"
        >
          {/* Header Bar */}
          <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 relative z-20">
            <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto custom-scrollbar pr-2">
              <div className="flex items-center gap-2 shrink-0">
                <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest italic pr-1">Reflection</h3>
                <span className="hidden sm:inline-block text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 tracking-wider">
                  {dateString}
                </span>
              </div>
            </div>
            
            {/* Header Right Actions */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
              <div className="flex items-center gap-1 border-r border-slate-700/80 pr-2 mr-1">
                <button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.md,.txt';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        const text = e.target?.result as string;
                        if (text) setReflection(text);
                      };
                      reader.readAsText(file);
                    };
                    input.click();
                  }}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title="Import Markdown"
                >
                  <Upload size={16} />
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([reflection], { type: 'text/markdown' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Reflection-${dateString}.md`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title="Export Markdown"
                >
                  <Download size={16} />
                </button>
              </div>

              {templates ? (
                <div className="flex items-center">
                  <ReflectionTemplatesDropdown
                    templates={templates}
                    onSelectTemplate={(t) => setReflection(t)}
                    currentReflection={reflection}
                    onUpdateTemplates={onUpdateTemplates}
                    autoLoadTemplateId={autoLoadTemplateId}
                    autoLoadTemplateMode={autoLoadTemplateMode}
                    onSetAutoLoadTemplate={onSetAutoLoadTemplate}
                  />
                </div>
              ) : renderTemplateControls ? (
                <div className="flex items-center">
                  {renderTemplateControls()}
                </div>
              ) : null}

              <button 
                onClick={onClose} 
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                title="Exit Immersive Mode"
              >
                <Minimize2 size={20} />
              </button>
            </div>
          </div>

          {/* Fullscreen Editor Area */}
          <div className="flex-1 flex overflow-hidden bg-slate-950 p-4 sm:p-6 md:p-8">
            <div className="flex-1 max-w-6xl mx-auto w-full h-full flex flex-col bg-slate-900/60 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl overflow-hidden">
              <MarkdownEditor
                value={reflection}
                onChange={setReflection}
                placeholder="Write your reflection in Markdown... (Markdown supported)"
                autoFocus
                defaultMode="split"
                showModeToggle={true}
                className="h-full flex-1"
                minHeight="100%"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
};
