import React, { useState } from 'react';
import { ReflectionTemplate } from '../../types';
import { ReflectionTemplatesDropdown } from './ReflectionTemplatesDropdown';
import { Maximize2, Eye, EyeOff, Copy, Check, Upload, Download } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ReflectionHeaderControlsProps {
  reflection: string;
  onSelectTemplate?: (text: string) => void;
  templates?: ReflectionTemplate[];
  onUpdateTemplates?: (templates: ReflectionTemplate[]) => void;
  autoLoadTemplateId?: string | null;
  autoLoadTemplateMode?: 'empty' | 'example';
  onSetAutoLoadTemplate?: (templateId: string | null, mode?: 'empty' | 'example') => void;
  
  // Immersive / Fullscreen
  onOpenImmersive?: () => void;
  immersiveLabel?: string;
  immersiveVariant?: 'sky' | 'indigo' | 'icon-only';

  // Markdown toggle
  isMarkdownEnabled?: boolean;
  onToggleMarkdown?: () => void;

  // Import / Export
  onImportReflection?: (text: string) => void;
  exportFileName?: string;
  showImportExport?: boolean;

  // Copy
  showCopy?: boolean;

  // Word count & Metrics
  showMetrics?: boolean;

  className?: string;
}

export const ReflectionHeaderControls: React.FC<ReflectionHeaderControlsProps> = ({
  reflection,
  onSelectTemplate,
  templates,
  onUpdateTemplates,
  autoLoadTemplateId,
  autoLoadTemplateMode,
  onSetAutoLoadTemplate,
  onOpenImmersive,
  immersiveLabel,
  immersiveVariant = 'sky',
  isMarkdownEnabled,
  onToggleMarkdown,
  onImportReflection,
  exportFileName = 'reflection.md',
  showImportExport = false,
  showCopy = false,
  showMetrics = false,
  className,
}) => {
  const [copied, setCopied] = useState(false);

  // Compute metrics (words & chars)
  const charCount = reflection.trim().length;
  const wordCount = reflection.trim() ? reflection.trim().split(/\s+/).length : 0;

  const handleCopy = () => {
    if (!reflection.trim()) return;
    navigator.clipboard.writeText(reflection);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    if (!reflection.trim()) return;
    const blob = new Blob([reflection], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.md';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && onImportReflection) {
        const reader = new FileReader();
        reader.onload = (re) => {
          if (re.target?.result) {
            onImportReflection(re.target.result as string);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {/* Template Dropdown */}
      {onSelectTemplate && (
        <ReflectionTemplatesDropdown
          templates={templates}
          onSelectTemplate={onSelectTemplate}
          currentReflection={reflection}
          onUpdateTemplates={onUpdateTemplates}
          autoLoadTemplateId={autoLoadTemplateId}
          autoLoadTemplateMode={autoLoadTemplateMode}
          onSetAutoLoadTemplate={onSetAutoLoadTemplate}
        />
      )}

      {/* Markdown Toggle */}
      {onToggleMarkdown && (
        <button
          type="button"
          onClick={onToggleMarkdown}
          className={cn(
            "flex items-center gap-1.5 h-[26px] px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
            isMarkdownEnabled
              ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
              : "bg-slate-800 text-slate-500 border border-slate-700 hover:bg-slate-700 hover:text-white"
          )}
          title={isMarkdownEnabled ? "Switch to Text Edit" : "Switch to Markdown Preview"}
        >
          {isMarkdownEnabled ? <Eye size={12} /> : <EyeOff size={12} />}
          <span>MD</span>
        </button>
      )}

      {/* Immersive / Fullscreen Writing Trigger */}
      {onOpenImmersive && (
        <button
          type="button"
          onClick={onOpenImmersive}
          className={cn(
            "flex items-center justify-center transition-all",
            immersiveVariant === 'sky' && "gap-1.5 h-[26px] px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/30 hover:bg-sky-500/20",
            immersiveVariant === 'indigo' && "p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-md shadow-indigo-600/20 active:scale-95",
            immersiveVariant === 'icon-only' && "p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-700 hover:border-slate-600"
          )}
          title="Fullscreen Immersive Writing Mode"
        >
          <Maximize2 size={immersiveVariant === 'indigo' ? 14 : 12} />
          {immersiveLabel && <span>{immersiveLabel}</span>}
        </button>
      )}

      {/* Copy Button */}
      {showCopy && reflection.trim().length > 0 && (
        <button
          type="button"
          onClick={handleCopy}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700/60"
          title="Copy Reflection"
        >
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
        </button>
      )}

      {/* Import / Export Controls */}
      {showImportExport && (
        <div className="flex items-center gap-0.5 border-l border-slate-700 pl-1.5 ml-0.5">
          {onImportReflection && (
            <button
              type="button"
              onClick={handleImport}
              className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              title="Import Reflection (.txt, .md)"
            >
              <Upload size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={handleExport}
            className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
            title="Export Reflection (.md)"
          >
            <Download size={14} />
          </button>
        </div>
      )}
      {/* Metrics Badge */}
      {showMetrics && charCount > 0 && (
        <span className="text-[10px] font-mono text-slate-500 bg-slate-900/60 px-2 py-0.5 rounded-md border border-slate-800 tracking-wider">
          {wordCount} {wordCount === 1 ? 'word' : 'words'}
        </span>
      )}
    </div>
  );
};
