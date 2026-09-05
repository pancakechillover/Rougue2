import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutTemplate, File, FileText, Save, X } from 'lucide-react';
import { ReflectionTemplate } from '../../types';
import { cn } from '../../lib/utils';

export interface ReflectionTemplatesDropdownProps {
  templates?: ReflectionTemplate[];
  onSelectTemplate: (content: string) => void;
  currentReflection: string;
  onUpdateTemplates?: (templates: ReflectionTemplate[]) => void;
  className?: string;
  buttonClassName?: string;
}

export const ReflectionTemplatesDropdown: React.FC<ReflectionTemplatesDropdownProps> = ({
  templates = [],
  onSelectTemplate,
  currentReflection,
  onUpdateTemplates,
  className,
  buttonClassName,
}) => {
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateMode, setTemplateMode] = useState<'empty' | 'example'>('empty');
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  const handleSaveNewTemplate = () => {
    if (!newTemplateName.trim()) return;
    if (onUpdateTemplates) {
      const updated = [...templates];
      const existingIndex = updated.findIndex(
        (t) => t.name.toLowerCase() === newTemplateName.trim().toLowerCase()
      );

      if (existingIndex >= 0) {
        if (templateMode === 'example') {
          updated[existingIndex] = {
            ...updated[existingIndex],
            exampleContent: currentReflection,
          };
        } else {
          updated[existingIndex] = {
            ...updated[existingIndex],
            content: currentReflection,
          };
        }
      } else {
        updated.push({
          id: `user-${Date.now()}`,
          name: newTemplateName.trim(),
          content: templateMode === 'empty' ? currentReflection : '',
          exampleContent: templateMode === 'example' ? currentReflection : '',
        });
      }

      onUpdateTemplates(updated);
    }
    setNewTemplateName('');
    setIsSavingTemplate(false);
  };

  return (
    <div className={cn("relative flex items-center h-[26px]", className)}>
      <button
        onClick={() => setShowTemplates(!showTemplates)}
        className={cn(
          "flex items-center justify-center gap-1.5 h-full px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm",
          showTemplates
            ? "bg-indigo-500/25 text-indigo-400 border border-indigo-500/40"
            : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-white",
          buttonClassName
        )}
        title="Reflection Templates"
      >
        <LayoutTemplate size={12} />
        <span>Templates</span>
      </button>

      {/* Templates Dropdown Menu */}
      <AnimatePresence>
        {showTemplates && (
          <>
            {/* Click-outside backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => {
                setShowTemplates(false);
                setIsSavingTemplate(false);
                setTemplateToDelete(null);
              }}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/80 z-50 overflow-hidden flex flex-col"
            >
              {/* Mode Switcher Tabs */}
              <div className="flex border-b border-slate-800 p-1.5 bg-slate-950 gap-1.5 relative z-10">
                <button
                  onClick={() => setTemplateMode('empty')}
                  className={cn(
                    "flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5",
                    templateMode === 'empty'
                      ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent"
                  )}
                  title="Blank Template Mode: Load blank template structure"
                >
                  <File size={12} />
                  <span>Blank</span>
                </button>
                <button
                  onClick={() => setTemplateMode('example')}
                  className={cn(
                    "flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5",
                    templateMode === 'example'
                      ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent"
                  )}
                  title="Example Template Mode: Load templates with sample answers"
                >
                  <FileText size={12} />
                  <span>Example</span>
                </button>
              </div>

              {/* Templates List */}
              <div className="p-2 space-y-1 max-h-48 overflow-y-auto custom-scrollbar bg-slate-900">
                {templates.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-500 italic">
                    No templates available
                  </div>
                ) : (
                  templates.map((template) => (
                    <div key={template.id} className="group relative">
                      {templateToDelete === template.id ? (
                        <div className="flex items-center justify-between w-full px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                          <span className="text-xs text-rose-400 font-medium truncate pr-1">
                            Delete {template.name}?
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                if (onUpdateTemplates) {
                                  onUpdateTemplates(templates.filter((t) => t.id !== template.id));
                                }
                                setTemplateToDelete(null);
                              }}
                              className="px-2 py-1 bg-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500/30 text-[10px] font-bold"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setTemplateToDelete(null)}
                              className="px-2 py-1 bg-slate-800 text-slate-400 rounded-lg hover:bg-slate-700 text-[10px] font-bold"
                            >
                              No
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full rounded-xl hover:bg-slate-800/80 transition-colors">
                          <button
                            onClick={() => {
                              if (templateMode === 'example' && template.exampleContent) {
                                onSelectTemplate(template.exampleContent);
                              } else {
                                onSelectTemplate(template.content);
                              }
                              setShowTemplates(false);
                            }}
                            className="flex-1 text-left px-3 py-2 text-xs text-slate-300 hover:text-white transition-colors truncate font-medium"
                            title={`Use ${template.name}`}
                          >
                            {template.name}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setTemplateToDelete(template.id);
                            }}
                            className="p-1.5 mr-1 text-slate-500 hover:text-rose-400 hover:bg-slate-700/80 rounded-lg transition-all"
                            title="Delete Template"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Bottom Save Action */}
              <div className="p-2 border-t border-slate-800 bg-slate-950">
                {isSavingTemplate ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      autoFocus
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      placeholder="Template name..."
                      className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveNewTemplate();
                        } else if (e.key === 'Escape') {
                          setIsSavingTemplate(false);
                        }
                      }}
                    />
                    <button
                      onClick={handleSaveNewTemplate}
                      disabled={!newTemplateName.trim()}
                      className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shrink-0"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsSavingTemplate(false)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (!currentReflection.trim()) return;
                      setIsSavingTemplate(true);
                    }}
                    disabled={!currentReflection.trim()}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 disabled:opacity-40 disabled:hover:bg-indigo-500/10 text-indigo-400 hover:text-indigo-300 rounded-xl text-xs font-bold transition-all border border-indigo-500/20"
                  >
                    <Save size={12} />
                    <span>Save as {templateMode === 'example' ? 'Example' : 'Blank'} Template</span>
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
