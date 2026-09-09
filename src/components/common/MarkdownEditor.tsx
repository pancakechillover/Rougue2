import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { 
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3, 
  List, ListOrdered, CheckSquare, Quote, Code, Link as LinkIcon, 
  Table, Eye, Edit3, Columns
} from 'lucide-react';
import { useEditorTypography, LINE_HEIGHT_MAP } from '../../hooks/useEditorTypography';
import { EditorTypographyMenu } from './EditorTypographyMenu';
import { cn } from '../../lib/utils';

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  minHeight?: string;
  hideToolbar?: boolean;
  defaultMode?: 'edit' | 'split' | 'preview';
  showModeToggle?: boolean;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = 'Write reflection in Markdown... (e.g. ## Heading, **bold**, - list)',
  className,
  autoFocus = false,
  minHeight = '180px',
  hideToolbar = false,
  defaultMode = 'edit',
  showModeToggle = true,
}) => {
  const [mode, setMode] = useState<'edit' | 'split' | 'preview'>(defaultMode);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { fontSize, lineHeight } = useEditorTypography();
  const lineMultiplier = LINE_HEIGHT_MAP[lineHeight];

  // Auto focus
  useEffect(() => {
    if (autoFocus && textareaRef.current && mode !== 'preview') {
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(
            textareaRef.current.value.length,
            textareaRef.current.value.length
          );
        }
      }, 50);
    }
  }, [autoFocus, mode]);

  // Insert or wrap text in textarea
  const insertText = useCallback((prefix: string, suffix: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const replacement = selectedText || defaultText;
    const newText = value.substring(0, start) + prefix + replacement + suffix + value.substring(end);
    
    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      const cursorStart = start + prefix.length;
      const cursorEnd = cursorStart + replacement.length;
      textarea.setSelectionRange(cursorStart, cursorEnd);
    }, 10);
  }, [value, onChange]);

  // Prepend line prefix (for headings, lists, quotes)
  const toggleLinePrefix = useCallback((prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = value.indexOf('\n', start);
    const endOfLine = lineEnd === -1 ? value.length : lineEnd;
    const lineText = value.substring(lineStart, endOfLine);

    let newLineText = '';
    if (lineText.startsWith(prefix)) {
      // Remove prefix
      newLineText = lineText.substring(prefix.length);
    } else {
      // Remove other heading/list prefixes if switching headings
      const cleaned = lineText.replace(/^(#{1,6}\s+|-\s+|\d+\.\s+|-\s*\[[ xX]\]\s+|>\s+)/, '');
      newLineText = prefix + cleaned;
    }

    const newText = value.substring(0, lineStart) + newLineText + value.substring(endOfLine);
    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      const newCursor = lineStart + newLineText.length;
      textarea.setSelectionRange(newCursor, newCursor);
    }, 10);
  }, [value, onChange]);

  // Handle keyboard shortcuts and smart lists
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Ctrl / Cmd Shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        insertText('**', '**', 'bold text');
        return;
      }
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        insertText('*', '*', 'italic text');
        return;
      }
      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        insertText('[', '](url)', 'link text');
        return;
      }
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        insertText('`', '`', 'code');
        return;
      }
    }

    // Tab key handling (2 spaces)
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      if (!e.shiftKey) {
        // Indent
        const newText = value.substring(0, start) + '  ' + value.substring(end);
        onChange(newText);
        setTimeout(() => {
          textarea.setSelectionRange(start + 2, start + 2);
        }, 10);
      } else {
        // Outdent line
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        if (value.substring(lineStart, lineStart + 2) === '  ') {
          const newText = value.substring(0, lineStart) + value.substring(lineStart + 2);
          onChange(newText);
          setTimeout(() => {
            const newPos = Math.max(lineStart, start - 2);
            textarea.setSelectionRange(newPos, newPos);
          }, 10);
        }
      }
      return;
    }

    // Enter key smart list continuation
    if (e.key === 'Enter' && !e.shiftKey) {
      const start = textarea.selectionStart;
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const currentLine = value.substring(lineStart, start);

      // Check task list: - [ ] or - [x]
      const taskMatch = currentLine.match(/^(\s*)-\s*\[([ xX])\]\s+(.*)$/);
      if (taskMatch) {
        e.preventDefault();
        if (!taskMatch[3].trim()) {
          // Empty task line: clear it on second enter
          const newText = value.substring(0, lineStart) + value.substring(start);
          onChange(newText);
          setTimeout(() => textarea.setSelectionRange(lineStart, lineStart), 10);
        } else {
          const indent = taskMatch[1];
          const newText = value.substring(0, start) + `\n${indent}- [ ] ` + value.substring(start);
          onChange(newText);
          setTimeout(() => {
            const pos = start + indent.length + 7;
            textarea.setSelectionRange(pos, pos);
          }, 10);
        }
        return;
      }

      // Check bullet list: - or *
      const bulletMatch = currentLine.match(/^(\s*)([-*])\s+(.*)$/);
      if (bulletMatch) {
        e.preventDefault();
        if (!bulletMatch[3].trim()) {
          // Empty bullet line: clear it
          const newText = value.substring(0, lineStart) + value.substring(start);
          onChange(newText);
          setTimeout(() => textarea.setSelectionRange(lineStart, lineStart), 10);
        } else {
          const indent = bulletMatch[1];
          const bullet = bulletMatch[2];
          const newText = value.substring(0, start) + `\n${indent}${bullet} ` + value.substring(start);
          onChange(newText);
          setTimeout(() => {
            const pos = start + indent.length + 3;
            textarea.setSelectionRange(pos, pos);
          }, 10);
        }
        return;
      }

      // Check numbered list: 1. 2.
      const numMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.*)$/);
      if (numMatch) {
        e.preventDefault();
        if (!numMatch[3].trim()) {
          // Empty numbered line: clear it
          const newText = value.substring(0, lineStart) + value.substring(start);
          onChange(newText);
          setTimeout(() => textarea.setSelectionRange(lineStart, lineStart), 10);
        } else {
          const indent = numMatch[1];
          const nextNum = parseInt(numMatch[2], 10) + 1;
          const newText = value.substring(0, start) + `\n${indent}${nextNum}. ` + value.substring(start);
          onChange(newText);
          setTimeout(() => {
            const pos = start + indent.length + String(nextNum).length + 3;
            textarea.setSelectionRange(pos, pos);
          }, 10);
        }
        return;
      }
    }
  };

  return (
    <div className={cn("flex flex-col w-full h-full min-h-full", className)}>
      {/* Markdown Toolbar */}
      {!hideToolbar && (
        <div className="flex flex-wrap items-center justify-between gap-1 pb-2 mb-2 border-b border-slate-800/80 text-slate-400 select-none">
          {/* Action Formatting Tools */}
          <div className="flex items-center gap-0.5 overflow-x-auto custom-scrollbar pr-1">
            <button
              type="button"
              onClick={() => toggleLinePrefix('# ')}
              className="p-1.5 hover:text-white hover:bg-slate-800 rounded transition-colors text-xs font-mono font-bold"
              title="Heading 1 (# )"
            >
              <Heading1 size={14} />
            </button>
            <button
              type="button"
              onClick={() => toggleLinePrefix('## ')}
              className="p-1.5 hover:text-white hover:bg-slate-800 rounded transition-colors text-xs font-mono font-bold"
              title="Heading 2 (## )"
            >
              <Heading2 size={14} />
            </button>
            <button
              type="button"
              onClick={() => toggleLinePrefix('### ')}
              className="p-1.5 hover:text-white hover:bg-slate-800 rounded transition-colors text-xs font-mono font-bold"
              title="Heading 3 (### )"
            >
              <Heading3 size={14} />
            </button>

            <div className="w-px h-3.5 bg-slate-800 mx-1" />

            <button
              type="button"
              onClick={() => insertText('**', '**', 'bold')}
              className="p-1.5 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Bold (**text**)"
            >
              <Bold size={13} />
            </button>
            <button
              type="button"
              onClick={() => insertText('*', '*', 'italic')}
              className="p-1.5 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Italic (*text*)"
            >
              <Italic size={13} />
            </button>
            <button
              type="button"
              onClick={() => insertText('~~', '~~', 'strikethrough')}
              className="p-1.5 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Strikethrough (~~text~~)"
            >
              <Strikethrough size={13} />
            </button>

            <div className="w-px h-3.5 bg-slate-800 mx-1" />

            <button
              type="button"
              onClick={() => toggleLinePrefix('- ')}
              className="p-1.5 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Bullet List (- item)"
            >
              <List size={13} />
            </button>
            <button
              type="button"
              onClick={() => toggleLinePrefix('1. ')}
              className="p-1.5 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Numbered List (1. item)"
            >
              <ListOrdered size={13} />
            </button>
            <button
              type="button"
              onClick={() => toggleLinePrefix('- [ ] ')}
              className="p-1.5 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Task Checklist (- [ ] item)"
            >
              <CheckSquare size={13} />
            </button>

            <div className="w-px h-3.5 bg-slate-800 mx-1" />

            <button
              type="button"
              onClick={() => toggleLinePrefix('> ')}
              className="p-1.5 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Quote (> text)"
            >
              <Quote size={13} />
            </button>
            <button
              type="button"
              onClick={() => insertText('```\n', '\n```', 'code')}
              className="p-1.5 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Code Block"
            >
              <Code size={13} />
            </button>
            <button
              type="button"
              onClick={() => insertText('[', '](url)', 'link')}
              className="p-1.5 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Link ([text](url))"
            >
              <LinkIcon size={13} />
            </button>
            <button
              type="button"
              onClick={() => insertText('| Column 1 | Column 2 |\n| :--- | :--- |\n| Item 1 | Item 2 |\n')}
              className="p-1.5 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Insert Table"
            >
              <Table size={13} />
            </button>
          </div>

          {/* Right Toolbar Controls: Typography Adjuster + View Mode Toggle */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Typography Popover */}
            <EditorTypographyMenu />

            {/* View Mode Switcher */}
            {showModeToggle && (
              <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setMode('edit')}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all",
                    mode === 'edit'
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  )}
                  title="Raw Markdown Edit Mode"
                >
                  <Edit3 size={11} />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('split')}
                  className={cn(
                    "hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all",
                    mode === 'split'
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  )}
                  title="Side-by-side Live Split Mode"
                >
                  <Columns size={11} />
                  <span>Split</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('preview')}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all",
                    mode === 'preview'
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  )}
                  title="Rendered Markdown Preview Mode"
                >
                  <Eye size={11} />
                  <span>Preview</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Editor Main Content Area */}
      <div 
        className={cn(
          "flex-1 w-full flex overflow-hidden rounded-xl",
          mode === 'split' ? "flex-col sm:flex-row gap-3" : "flex-col"
        )}
        style={{ minHeight }}
      >
        {/* Source Textarea (Edit & Split Modes) */}
        {(mode === 'edit' || mode === 'split') && (
          <div className={cn("flex-1 flex flex-col h-full min-h-full overflow-hidden relative", mode === 'split' && "border-r border-slate-800/80 pr-2")}>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full h-full flex-1 bg-transparent text-slate-200 placeholder:text-slate-600 focus:outline-none resize-none custom-scrollbar font-mono tracking-wide"
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: lineMultiplier,
              }}
              spellCheck={false}
            />
          </div>
        )}

        {/* Rendered Markdown Preview (Preview & Split Modes) */}
        {(mode === 'preview' || mode === 'split') && (
          <div 
            className={cn(
              "flex-1 h-full overflow-y-auto custom-scrollbar text-slate-200",
              mode === 'split' && "pl-2 bg-slate-950/30 rounded-lg p-3 border border-slate-800/40"
            )}
          >
            {value.trim() ? (
              <div 
                className="markdown-content text-slate-200 selection:bg-indigo-500/30"
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight: lineMultiplier,
                }}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  components={{
                    h1: ({ node, ...props }) => (
                      <h1 
                        className="font-black text-slate-100 mt-4 mb-2 pb-1 border-b border-slate-800/80 tracking-tight" 
                        style={{ fontSize: `${Math.round(fontSize * 1.55)}px`, lineHeight: 1.3 }}
                        {...props} 
                      />
                    ),
                    h2: ({ node, ...props }) => (
                      <h2 
                        className="font-bold text-slate-100 mt-3.5 mb-1.5 tracking-tight flex items-center gap-1.5" 
                        style={{ fontSize: `${Math.round(fontSize * 1.3)}px`, lineHeight: 1.35 }}
                        {...props} 
                      />
                    ),
                    h3: ({ node, ...props }) => (
                      <h3 
                        className="font-bold text-indigo-300 mt-3 mb-1 tracking-tight" 
                        style={{ fontSize: `${Math.round(fontSize * 1.15)}px`, lineHeight: 1.4 }}
                        {...props} 
                      />
                    ),
                    p: ({ node, ...props }) => (
                      <p 
                        className="my-1.5 text-slate-200" 
                        style={{ lineHeight: lineMultiplier }}
                        {...props} 
                      />
                    ),
                    ul: ({ node, ...props }) => (
                      <ul className="list-disc pl-5 my-1.5 space-y-0.5 marker:text-indigo-400" {...props} />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol className="list-decimal pl-5 my-1.5 space-y-0.5 marker:text-indigo-400 font-medium" {...props} />
                    ),
                    li: ({ node, ...props }) => (
                      <li className="text-slate-200 pl-0.5" style={{ lineHeight: lineMultiplier }} {...props} />
                    ),
                    blockquote: ({ node, ...props }) => (
                      <blockquote 
                        className="border-l-4 border-indigo-500/70 bg-indigo-500/5 pl-3 py-1 my-2 rounded-r italic text-slate-300" 
                        {...props} 
                      />
                    ),
                    code: ({ node, className, children, ...props }: any) => {
                      const isInline = !className?.includes('language-');
                      return isInline ? (
                        <code className="px-1.5 py-0.5 mx-0.5 bg-slate-900 border border-slate-800 text-indigo-300 rounded text-[0.9em] font-mono" {...props}>
                          {children}
                        </code>
                      ) : (
                        <pre className="p-3 my-2 bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto text-[0.9em] font-mono text-slate-200">
                          <code {...props}>{children}</code>
                        </pre>
                      );
                    },
                    hr: ({ node, ...props }) => (
                      <hr className="my-3 border-slate-800/80" {...props} />
                    ),
                    table: ({ node, ...props }) => (
                      <div className="overflow-x-auto my-2 rounded-lg border border-slate-800">
                        <table className="w-full text-left border-collapse text-xs" {...props} />
                      </div>
                    ),
                    th: ({ node, ...props }) => (
                      <th className="p-2 bg-slate-900 font-bold border-b border-slate-800 text-slate-300" {...props} />
                    ),
                    td: ({ node, ...props }) => (
                      <td className="p-2 border-b border-slate-800/60 text-slate-300" {...props} />
                    ),
                    a: ({ node, ...props }) => (
                      <a className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2" target="_blank" rel="noreferrer" {...props} />
                    ),
                  }}
                >
                  {value}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 italic py-6">
                Preview is empty. Write in Edit mode to see rendered output.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
