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
    <div className={cn("flex items-center gap-1.5", className)}>
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
            "flex items-center gap-1.5 h-7 px-2 rounded-lg text-xs font-semibold transition-all border",
            isMarkdownEnabled
              ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
              : "bg-slate-800/80 text-slate-400 border-slate-700/70 hover:bg-slate-700/80 hover:text-white"
          )}
          title={isMarkdownEnabled ? "Switch to Text Edit" : "Switch to Markdown Preview"}
        >
          {isMarkdownEnabled ? <Eye size={13} /> : <EyeOff size={13} />}
          <span className="text-[11px]">MD</span>
        </button>
      )}

      {/* Copy Button */}
      {showCopy && reflection.trim().length > 0 && (
        <button
          type="button"
          onClick={handleCopy}
          className="h-7 w-7 flex items-center justify-center bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-700/70 active:scale-95 shrink-0"
          title="Copy Reflection"
        >
          {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
        </button>
      )}

      {/* Import / Export Controls */}
      {showImportExport && (
        <div className="flex items-center gap-1 border-l border-slate-700/70 pl-1.5 ml-0.5">
          {onImportReflection && (
            <button
              type="button"
              onClick={handleImport}
              className="h-7 w-7 flex items-center justify-center bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-700/70 active:scale-95 shrink-0"
              title="Import Reflection (.txt, .md)"
            >
              <Upload size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={handleExport}
            className="h-7 w-7 flex items-center justify-center bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-700/70 active:scale-95 shrink-0"
            title="Export Reflection (.md)"
          >
            <Download size={13} />
          </button>
        </div>
      )}

      {/* Immersive / Fullscreen Writing Trigger */}
      {onOpenImmersive && (
        <button
          type="button"
          onClick={onOpenImmersive}
          className={cn(
            "h-7 flex items-center justify-center rounded-lg transition-all active:scale-95 border",
            immersiveVariant === 'sky' && (immersiveLabel ? "gap-1.5 px-2.5 bg-sky-500/10 text-sky-400 border-sky-500/30 hover:bg-sky-500/20 text-xs font-semibold" : "w-7 bg-sky-500/10 text-sky-400 border-sky-500/30 hover:bg-sky-500/20"),
            immersiveVariant === 'indigo' && (immersiveLabel ? "gap-1.5 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-600/20 text-xs font-semibold" : "w-7 bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-600/20"),
            immersiveVariant === 'icon-only' && "w-7 bg-slate-800/80 text-slate-400 hover:text-white border-slate-700/70 hover:border-slate-600"
          )}
          title="Fullscreen Immersive Writing Mode"
        >
          <Maximize2 size={13} />
          {immersiveLabel && <span>{immersiveLabel}</span>}
        </button>
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
