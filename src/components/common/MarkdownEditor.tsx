import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { 
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3, 
  List, ListOrdered, CheckSquare, Quote, Code, Link as LinkIcon, 
  Keyboard, X, Undo2, Redo2
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
  defaultMode?: string;
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
}) => {
  const { fontSize, lineHeight } = useEditorTypography();
  const lineMultiplier = LINE_HEIGHT_MAP[lineHeight];

  // Split document into lines
  const lines = value !== undefined && value !== null ? value.split('\n') : [''];
  
  // Active editing line index (null when entire editor is blurred and fully rendered)
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(autoFocus ? 0 : null);
  const pendingCursorPosRef = useRef<number | null>(null);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // References
  const activeInputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Undo / Redo history stack
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const isHistoryActionRef = useRef(false);
  const lastRecordedValueRef = useRef(value);

  // Sync external changes
  useEffect(() => {
    if (value !== lastRecordedValueRef.current) {
      if (isHistoryActionRef.current) {
        isHistoryActionRef.current = false;
      } else {
        if (undoStackRef.current.length === 0 || undoStackRef.current[undoStackRef.current.length - 1] !== lastRecordedValueRef.current) {
          undoStackRef.current.push(lastRecordedValueRef.current);
          if (undoStackRef.current.length > 50) undoStackRef.current.shift();
          setCanUndo(true);
        }
      }
      lastRecordedValueRef.current = value;
    }
  }, [value]);

  const saveHistorySnapshot = useCallback((val: string) => {
    undoStackRef.current.push(val);
    if (undoStackRef.current.length > 50) undoStackRef.current.shift();
    redoStackRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    const previous = undoStackRef.current.pop()!;
    redoStackRef.current.push(value);
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);
    isHistoryActionRef.current = true;
    lastRecordedValueRef.current = previous;
    onChange(previous);
  }, [value, onChange]);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current.pop()!;
    undoStackRef.current.push(value);
    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
    isHistoryActionRef.current = true;
    lastRecordedValueRef.current = next;
    onChange(next);
  }, [value, onChange]);

  // Handle active line focus and cursor placement without interfering with typing
  useEffect(() => {
    if (activeLineIndex !== null && activeInputRef.current) {
      activeInputRef.current.style.height = 'auto';
      activeInputRef.current.style.height = `${activeInputRef.current.scrollHeight}px`;
      activeInputRef.current.focus();
      if (pendingCursorPosRef.current !== null) {
        const pos = pendingCursorPosRef.current;
        pendingCursorPosRef.current = null;
        try {
          activeInputRef.current.setSelectionRange(pos, pos);
        } catch {
          // Ignore range error if unmounted
        }
      }
    }
  }, [activeLineIndex]);

  // Handle single-line text update without disturbing native browser cursor
  const handleLineChange = (index: number, newText: string, textareaEl: HTMLTextAreaElement) => {
    const updated = [...lines];
    updated[index] = newText;
    const newValue = updated.join('\n');
    onChange(newValue);
    textareaEl.style.height = 'auto';
    textareaEl.style.height = `${textareaEl.scrollHeight}px`;
  };

  // Toggle checklist checkbox item without needing raw text mode
  const toggleCheckbox = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const line = lines[index] || '';
    saveHistorySnapshot(value);
    let updatedLine = line;
    if (line.match(/^(\s*[-*+]\s+\[\s*\])/)) {
      updatedLine = line.replace(/^(\s*[-*+]\s+)\[\s*\]/, '$1[x]');
    } else if (line.match(/^(\s*[-*+]\s+\[[xX]\])/)) {
      updatedLine = line.replace(/^(\s*[-*+]\s+)\[[xX]\]/, '$1[ ]');
    }
    const updated = [...lines];
    updated[index] = updatedLine;
    onChange(updated.join('\n'));
  };

  // Keyboard navigation & smart list typing in active line
  const handleLineKeyDown = (index: number, e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = activeInputRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentLine = lines[index] || '';

    // Undo / Redo
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
      if (e.shiftKey) {
        e.preventDefault();
        handleRedo();
      } else {
        e.preventDefault();
        handleUndo();
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
      e.preventDefault();
      handleRedo();
      return;
    }

    // Markdown shortcut formatting
    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      if (key === 'b') {
        e.preventDefault();
        applyWrapToActiveLine('**', '**', 'bold text');
        return;
      }
      if (key === 'i') {
        e.preventDefault();
        applyWrapToActiveLine('*', '*', 'italic text');
        return;
      }
      if (key === 'k') {
        e.preventDefault();
        applyWrapToActiveLine('[', '](https://)', 'link title');
        return;
      }
      if (e.shiftKey && key === 'x') {
        e.preventDefault();
        applyWrapToActiveLine('~~', '~~', 'strikethrough text');
        return;
      }
      if (key === '`') {
        e.preventDefault();
        applyWrapToActiveLine('`', '`', 'code');
        return;
      }
    }

    // Up Arrow at top of line -> Move to previous line
    if (e.key === 'ArrowUp') {
      if (start === 0 || textarea.scrollTop === 0) {
        if (index > 0) {
          e.preventDefault();
          pendingCursorPosRef.current = Math.min(start, (lines[index - 1] || '').length);
          setActiveLineIndex(index - 1);
        }
      }
      return;
    }

    // Down Arrow at bottom of line -> Move to next line
    if (e.key === 'ArrowDown') {
      if (end === currentLine.length) {
        if (index < lines.length - 1) {
          e.preventDefault();
          pendingCursorPosRef.current = Math.min(start, (lines[index + 1] || '').length);
          setActiveLineIndex(index + 1);
        }
      }
      return;
    }

    // Tab / Shift+Tab for Indent & Sub-lists (二级/多级列表)
    if (e.key === 'Tab') {
      e.preventDefault();
      saveHistorySnapshot(value);

      const isListItem = /^\s*([-*+]\s+(\[[ xX]?\]\s*)?|\d+\.\s+|> )/.test(currentLine);

      if (e.shiftKey) {
        // Outdent / Unindent (Shift + Tab) -> Reduces indent at line start
        if (currentLine.startsWith('  ')) {
          const updated = currentLine.substring(2);
          handleLineChange(index, updated, textarea);
          const newStart = Math.max(0, start - 2);
          const newEnd = Math.max(0, end - 2);
          setTimeout(() => textarea.setSelectionRange(newStart, newEnd), 0);
        } else if (currentLine.startsWith(' ') || currentLine.startsWith('\t')) {
          const updated = currentLine.substring(1);
          handleLineChange(index, updated, textarea);
          const newStart = Math.max(0, start - 1);
          const newEnd = Math.max(0, end - 1);
          setTimeout(() => textarea.setSelectionRange(newStart, newEnd), 0);
        }
      } else {
        // Indent / Make Sub-list (Tab)
        if (isListItem || start === 0) {
          // Indent entire list item line at the beginning by 2 spaces
          const updated = '  ' + currentLine;
          handleLineChange(index, updated, textarea);
          const newStart = start + 2;
          const newEnd = end + 2;
          setTimeout(() => textarea.setSelectionRange(newStart, newEnd), 0);
        } else {
          // Regular text indent at cursor position
          const updated = currentLine.substring(0, start) + '  ' + currentLine.substring(end);
          handleLineChange(index, updated, textarea);
          const newPos = start + 2;
          setTimeout(() => textarea.setSelectionRange(newPos, newPos), 0);
        }
      }
      return;
    }

    // Enter Key -> Split line or smart continue list
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveHistorySnapshot(value);

      const beforeCursor = currentLine.substring(0, start);
      const afterCursor = currentLine.substring(end);

      // Check for smart list continuation
      // 1. Task checklist "- [ ] " or "- [x] "
      const taskMatch = beforeCursor.match(/^(\s*)([-*+]\s+\[([ xX]?)\]\s*)(.*)$/);
      if (taskMatch) {
        const indent = taskMatch[1];
        const content = taskMatch[4];
        if (content.trim().length === 0 && afterCursor.trim().length === 0) {
          // Empty item -> if indented, outdent first, else exit list
          if (indent.length >= 2) {
            const outdented = indent.substring(2) + '- [ ] ';
            const updated = [...lines];
            updated[index] = outdented;
            onChange(updated.join('\n'));
            pendingCursorPosRef.current = outdented.length;
            return;
          }
          const updated = [...lines];
          updated[index] = '';
          onChange(updated.join('\n'));
          pendingCursorPosRef.current = 0;
          return;
        }
        const newLineContent = `${indent}- [ ] ${afterCursor}`;
        const updated = [...lines];
        updated[index] = beforeCursor;
        updated.splice(index + 1, 0, newLineContent);
        onChange(updated.join('\n'));
        pendingCursorPosRef.current = indent.length + 6;
        setActiveLineIndex(index + 1);
        return;
      }

      // 2. Numbered list "1. "
      const numMatch = beforeCursor.match(/^(\s*)(\d+)\.\s+(.*)$/);
      if (numMatch) {
        const indent = numMatch[1];
        const num = parseInt(numMatch[2], 10);
        const content = numMatch[3];
        if (content.trim().length === 0 && afterCursor.trim().length === 0) {
          if (indent.length >= 2) {
            const outdented = indent.substring(2) + '1. ';
            const updated = [...lines];
            updated[index] = outdented;
            onChange(updated.join('\n'));
            pendingCursorPosRef.current = outdented.length;
            return;
          }
          const updated = [...lines];
          updated[index] = '';
          onChange(updated.join('\n'));
          pendingCursorPosRef.current = 0;
          return;
        }
        const prefix = `${indent}${num + 1}. `;
        const newLineContent = `${prefix}${afterCursor}`;
        const updated = [...lines];
        updated[index] = beforeCursor;
        updated.splice(index + 1, 0, newLineContent);
        onChange(updated.join('\n'));
        pendingCursorPosRef.current = prefix.length;
        setActiveLineIndex(index + 1);
        return;
      }

      // 3. Bullet list "- ", "* ", "+ "
      const bulletMatch = beforeCursor.match(/^(\s*)([-*+]\s+)(.*)$/);
      if (bulletMatch) {
        const indent = bulletMatch[1];
        const bullet = bulletMatch[2];
        const content = bulletMatch[3];
        if (content.trim().length === 0 && afterCursor.trim().length === 0) {
          if (indent.length >= 2) {
            const outdented = indent.substring(2) + bullet;
            const updated = [...lines];
            updated[index] = outdented;
            onChange(updated.join('\n'));
            pendingCursorPosRef.current = outdented.length;
            return;
          }
          const updated = [...lines];
          updated[index] = '';
          onChange(updated.join('\n'));
          pendingCursorPosRef.current = 0;
          return;
        }
        const prefix = `${indent}${bullet}`;
        const newLineContent = `${prefix}${afterCursor}`;
        const updated = [...lines];
        updated[index] = beforeCursor;
        updated.splice(index + 1, 0, newLineContent);
        onChange(updated.join('\n'));
        pendingCursorPosRef.current = prefix.length;
        setActiveLineIndex(index + 1);
        return;
      }

      // 4. Blockquote "> "
      const quoteMatch = beforeCursor.match(/^(\s*)(>\s*)(.*)$/);
      if (quoteMatch) {
        const indent = quoteMatch[1];
        const content = quoteMatch[3];
        if (content.trim().length === 0 && afterCursor.trim().length === 0) {
          const updated = [...lines];
          updated[index] = '';
          onChange(updated.join('\n'));
          pendingCursorPosRef.current = 0;
          return;
        }
        const prefix = `${indent}> `;
        const newLineContent = `${prefix}${afterCursor}`;
        const updated = [...lines];
        updated[index] = beforeCursor;
        updated.splice(index + 1, 0, newLineContent);
        onChange(updated.join('\n'));
        pendingCursorPosRef.current = prefix.length;
        setActiveLineIndex(index + 1);
        return;
      }

      // Standard new line
      const updated = [...lines];
      updated[index] = beforeCursor;
      updated.splice(index + 1, 0, afterCursor);
      onChange(updated.join('\n'));
      pendingCursorPosRef.current = 0;
      setActiveLineIndex(index + 1);
      return;
    }

    // Delete at end of line -> merge with next line
    if (e.key === 'Delete' && start === currentLine.length && end === currentLine.length && index < lines.length - 1) {
      e.preventDefault();
      saveHistorySnapshot(value);
      const nextLine = lines[index + 1] || '';
      const mergedLine = currentLine + nextLine;
      const updated = [...lines];
      updated[index] = mergedLine;
      updated.splice(index + 1, 1);
      onChange(updated.join('\n'));
      pendingCursorPosRef.current = start;
      return;
    }

    // Escape -> exit active editing, render all lines
    if (e.key === 'Escape') {
      e.preventDefault();
      setActiveLineIndex(null);
      return;
    }
  };

  // Handle multi-line paste directly into active line
  const handleLinePaste = (index: number, e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText && pastedText.includes('\n')) {
      e.preventDefault();
      saveHistorySnapshot(value);
      const textarea = activeInputRef.current;
      const start = textarea?.selectionStart || 0;
      const end = textarea?.selectionEnd || 0;
      const currentLine = lines[index] || '';

      const before = currentLine.substring(0, start);
      const after = currentLine.substring(end);
      const pastedLines = pastedText.replace(/\r\n/g, '\n').split('\n');

      const firstLineMerged = before + pastedLines[0];
      const lastLineMerged = pastedLines[pastedLines.length - 1] + after;
      const middleLines = pastedLines.slice(1, -1);

      const replacement = [firstLineMerged, ...middleLines, lastLineMerged];
      const updated = [...lines];
      updated.splice(index, 1, ...replacement);
      
      onChange(updated.join('\n'));
      const targetIndex = index + pastedLines.length - 1;
      const targetPos = (pastedLines[pastedLines.length - 1] || '').length + (pastedLines.length === 1 ? before.length : 0);
      pendingCursorPosRef.current = targetPos;
      setActiveLineIndex(targetIndex);
    }
  };

  // Helper for inline wrap formatting
  const applyWrapToActiveLine = (prefix: string, suffix: string, defaultText: string = 'text') => {
    if (activeLineIndex === null) {
      const idx = lines.length ? lines.length - 1 : 0;
      const line = lines[idx] || '';
      const newLine = `${line}${prefix}${defaultText}${suffix}`;
      const updated = [...lines];
      updated[idx] = newLine;
      onChange(updated.join('\n'));
      pendingCursorPosRef.current = newLine.length;
      setActiveLineIndex(idx);
      return;
    }
    const textarea = activeInputRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const line = lines[activeLineIndex] || '';
    const selected = line.substring(start, end);
    const replacement = selected ? `${prefix}${selected}${suffix}` : `${prefix}${defaultText}${suffix}`;

    saveHistorySnapshot(value);
    const newLine = line.substring(0, start) + replacement + line.substring(end);
    const updated = [...lines];
    updated[activeLineIndex] = newLine;
    onChange(updated.join('\n'));

    setTimeout(() => {
      textarea.focus();
      if (selected) {
        textarea.setSelectionRange(start + prefix.length, end + prefix.length);
      } else {
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + defaultText.length);
      }
    }, 0);
  };

  // Helper for prefixing active line
  const applyLinePrefixToActiveLine = (prefix: string, isListToggle: boolean = false) => {
    const idx = activeLineIndex !== null ? activeLineIndex : (lines.length ? lines.length - 1 : 0);
    const line = lines[idx] || '';
    saveHistorySnapshot(value);

    let newLine = '';
    if (isListToggle) {
      if (line.startsWith(prefix)) {
        newLine = line.substring(prefix.length);
      } else {
        const cleaned = line.replace(/^(\s*)([-*+]\s+\[([ xX]?)\]\s*|[-*+]\s+|\d+\.\s+|> )/, '');
        newLine = `${prefix}${cleaned}`;
      }
    } else {
      const cleaned = line.replace(/^(#{1,6}\s*)/, '');
      newLine = `${prefix}${cleaned}`;
    }

    const updated = [...lines];
    updated[idx] = newLine;
    onChange(updated.join('\n'));
    pendingCursorPosRef.current = newLine.length;
    setActiveLineIndex(idx);
  };

  // Click on empty space below lines
  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      const lastIndex = Math.max(0, lines.length - 1);
      pendingCursorPosRef.current = (lines[lastIndex] || '').length;
      setActiveLineIndex(lastIndex);
    }
  };

  return (
    <div className={cn("flex flex-col bg-slate-900/60 rounded-xl border border-slate-800/80 overflow-hidden focus-within:border-indigo-500/50 transition-all", className)}>
      {/* Top Toolbar */}
      {!hideToolbar && (
        <div className="flex flex-wrap items-center justify-between gap-1 px-2.5 py-1.5 bg-slate-950/70 border-b border-slate-800/80 select-none text-slate-400 shrink-0">
          <div className="flex items-center gap-0.5 flex-wrap">
            {/* History actions */}
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo}
              className="p-1 hover:text-slate-100 hover:bg-slate-800/80 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={13} />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={!canRedo}
              className="p-1 hover:text-slate-100 hover:bg-slate-800/80 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 size={13} />
            </button>

            <div className="w-[1px] h-3.5 bg-slate-800 mx-1" />

            {/* Basic Text Formatting */}
            <button
              type="button"
              onClick={() => applyWrapToActiveLine('**', '**', 'bold text')}
              className="p-1 hover:text-slate-100 hover:bg-slate-800/80 rounded transition-colors font-bold"
              title="Bold (Ctrl+B)"
            >
              <Bold size={13} />
            </button>
            <button
              type="button"
              onClick={() => applyWrapToActiveLine('*', '*', 'italic text')}
              className="p-1 hover:text-slate-100 hover:bg-slate-800/80 rounded transition-colors italic px-0.5"
              title="Italic (Ctrl+I)"
            >
              <Italic size={13} />
            </button>
            <button
              type="button"
              onClick={() => applyWrapToActiveLine('~~', '~~', 'strikethrough text')}
              className="p-1 hover:text-slate-100 hover:bg-slate-800/80 rounded transition-colors"
              title="Strikethrough (Ctrl+Shift+X)"
            >
              <Strikethrough size={13} />
            </button>

            <div className="w-[1px] h-3.5 bg-slate-800 mx-1" />

            {/* Headings */}
            <button
              type="button"
              onClick={() => applyLinePrefixToActiveLine('# ')}
              className="p-1 hover:text-slate-100 hover:bg-slate-800/80 rounded transition-colors"
              title="Heading 1 (# )"
            >
              <Heading1 size={13} />
            </button>
            <button
              type="button"
              onClick={() => applyLinePrefixToActiveLine('## ')}
              className="p-1 hover:text-slate-100 hover:bg-slate-800/80 rounded transition-colors"
              title="Heading 2 (## )"
            >
              <Heading2 size={13} />
            </button>
            <button
              type="button"
              onClick={() => applyLinePrefixToActiveLine('### ')}
              className="p-1 hover:text-slate-100 hover:bg-slate-800/80 rounded transition-colors"
              title="Heading 3 (### )"
            >
              <Heading3 size={13} />
            </button>

            <div className="w-[1px] h-3.5 bg-slate-800 mx-1" />

            {/* Lists & Quotes */}
            <button
              type="button"
              onClick={() => applyLinePrefixToActiveLine('- ', true)}
              className="p-1 hover:text-slate-100 hover:bg-slate-800/80 rounded transition-colors"
              title="Bullet List (- )"
            >
              <List size={13} />
            </button>
            <button
              type="button"
              onClick={() => applyLinePrefixToActiveLine('1. ', true)}
              className="p-1 hover:text-slate-100 hover:bg-slate-800/80 rounded transition-colors"
              title="Numbered List (1. )"
            >
              <ListOrdered size={13} />
            </button>
            <button
              type="button"
              onClick={() => applyLinePrefixToActiveLine('- [ ] ', true)}
              className="p-1 hover:text-slate-100 hover:bg-slate-800/80 rounded transition-colors"
              title="Task Checklist (- [ ] )"
            >
              <CheckSquare size={13} />
            </button>
            <button
              type="button"
              onClick={() => applyLinePrefixToActiveLine('> ', true)}
              className="p-1 hover:text-slate-100 hover:bg-slate-800/80 rounded transition-colors"
              title="Quote (> )"
            >
              <Quote size={13} />
            </button>
            <button
              type="button"
              onClick={() => applyWrapToActiveLine('`', '`', 'code')}
              className="p-1 hover:text-slate-100 hover:bg-slate-800/80 rounded transition-colors font-mono"
              title="Inline Code (`code`)"
            >
              <Code size={13} />
            </button>
            <button
              type="button"
              onClick={() => applyWrapToActiveLine('[', '](https://)', 'link title')}
              className="p-1 hover:text-slate-100 hover:bg-slate-800/80 rounded transition-colors"
              title="Insert Link (Ctrl+K)"
            >
              <LinkIcon size={13} />
            </button>
          </div>

          {/* Right Controls: Cheatsheet, Typography */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowShortcutsModal(true)}
              className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded transition-colors"
              title="Markdown Shortcuts Guide"
            >
              <Keyboard size={11} />
              <span className="hidden sm:inline">Shortcuts</span>
            </button>

            <EditorTypographyMenu />
          </div>
        </div>
      )}

      {/* Main Document Content Area with In-Place Markdown Rendering */}
      <div 
        ref={containerRef}
        onClick={handleContainerClick}
        className="flex-1 p-3 sm:p-4 overflow-y-auto custom-scrollbar flex flex-col cursor-text min-h-0 relative select-text"
        style={{
          minHeight,
          fontSize: `${fontSize}px`,
          lineHeight: lineMultiplier,
        }}
      >
        {lines.map((line, index) => {
          const isActive = activeLineIndex === index;

          if (isActive) {
            return (
              <div 
                key={index}
                className="relative w-full py-0.5 font-sans"
              >
                <textarea
                  ref={activeInputRef}
                  value={line}
                  onChange={(e) => handleLineChange(index, e.target.value, e.target)}
                  onKeyDown={(e) => handleLineKeyDown(index, e)}
                  onPaste={(e) => handleLinePaste(index, e)}
                  rows={1}
                  placeholder={index === 0 && lines.length === 1 ? placeholder : ''}
                  style={{
                    fontSize: `${fontSize}px`,
                    lineHeight: lineMultiplier,
                  }}
                  className="w-full block bg-transparent border-0 outline-none ring-0 shadow-none p-0 m-0 text-slate-100 placeholder:text-slate-500 resize-none font-sans font-normal overflow-hidden focus:ring-0 focus:outline-none focus:border-0"
                  spellCheck="false"
                  autoFocus
                />
              </div>
            );
          }

          // Non-active line: Render Markdown in-place
          const isBlank = line.trim().length === 0;

          return (
            <div
              key={index}
              onClick={() => {
                pendingCursorPosRef.current = line.length;
                setActiveLineIndex(index);
              }}
              className="relative w-full py-0.5 cursor-text text-slate-200 hover:text-slate-100 transition-colors select-text"
            >
              {isBlank ? (
                // Blank line spacer
                <div 
                  className="w-full text-transparent select-none"
                  style={{ minHeight: `${Math.round(fontSize * lineMultiplier)}px` }}
                >
                  &nbsp;
                </div>
              ) : (
                <div className="markdown-inline-content select-text">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    components={{
                      p: ({ node, ...props }) => (
                        <p className="m-0 leading-normal" {...props} />
                      ),
                      h1: ({ node, ...props }) => (
                        <h1 
                          className="font-black text-slate-100 border-b border-slate-800/80 pb-0.5 tracking-tight my-1" 
                          style={{ fontSize: `${Math.round(fontSize * 1.5)}px`, lineHeight: 1.3 }}
                          {...props} 
                        />
                      ),
                      h2: ({ node, ...props }) => (
                        <h2 
                          className="font-bold text-slate-100 tracking-tight my-0.5" 
                          style={{ fontSize: `${Math.round(fontSize * 1.28)}px`, lineHeight: 1.35 }}
                          {...props} 
                        />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3 
                          className="font-bold text-indigo-300 tracking-tight my-0.5" 
                          style={{ fontSize: `${Math.round(fontSize * 1.15)}px`, lineHeight: 1.4 }}
                          {...props} 
                        />
                      ),
                      ul: ({ node, ...props }) => {
                        const leadingSpaces = line.match(/^(\s*)/)?.[1].length || 0;
                        const isSub = leadingSpaces >= 2;
                        return (
                          <ul 
                            className={cn(
                              "space-y-0 my-0 list-inside",
                              isSub ? "list-[circle] pl-5 text-slate-300" : "list-disc pl-1 text-slate-200"
                            )} 
                            {...props} 
                          />
                        );
                      },
                      ol: ({ node, ...props }) => {
                        const leadingSpaces = line.match(/^(\s*)/)?.[1].length || 0;
                        const isSub = leadingSpaces >= 2;
                        return (
                          <ol 
                            className={cn(
                              "space-y-0 my-0 list-inside",
                              isSub ? "list-[lower-alpha] pl-5 text-slate-300" : "list-decimal pl-1 text-slate-200"
                            )} 
                            {...props} 
                          />
                        );
                      },
                      li: ({ node, ...props }: any) => {
                        const checked = props.checked;
                        if (checked !== null && checked !== undefined) {
                          // Checklist item
                          const leadingSpaces = line.match(/^(\s*)/)?.[1].length || 0;
                          const isSub = leadingSpaces >= 2;
                          return (
                            <li className={cn("list-none flex items-center gap-2 my-0 leading-normal", isSub && "pl-5")} {...props}>
                              <button
                                type="button"
                                onClick={(e) => toggleCheckbox(index, e)}
                                className={cn(
                                  "w-4 h-4 rounded flex items-center justify-center border transition-all text-xs shrink-0 cursor-pointer",
                                  checked 
                                    ? "bg-indigo-600 border-indigo-500 text-white" 
                                    : "border-slate-600 bg-slate-800/50 hover:border-slate-400"
                                )}
                              >
                                {checked && '✓'}
                              </button>
                              <span className={cn(checked ? "line-through text-slate-400" : "text-slate-200")}>
                                {props.children}
                              </span>
                            </li>
                          );
                        }
                        return <li className="my-0 leading-normal" {...props}>{props.children}</li>;
                      },
                      strong: ({ node, ...props }) => (
                        <strong className="font-bold text-slate-100" {...props} />
                      ),
                      em: ({ node, ...props }) => (
                        <em className="italic text-slate-300 pr-0.5" {...props} />
                      ),
                      del: ({ node, ...props }) => (
                        <del className="line-through text-slate-400" {...props} />
                      ),
                      blockquote: ({ node, ...props }) => (
                        <blockquote className="border-l-2 border-indigo-500/60 pl-2.5 my-0.5 text-slate-400 italic font-serif" {...props} />
                      ),
                      code: ({ node, className, children, ...props }) => (
                        <code className="px-1 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-[0.9em]" {...props}>
                          {children}
                        </code>
                      ),
                      hr: ({ node, ...props }) => (
                        <hr className="my-2 border-slate-800" {...props} />
                      ),
                      a: ({ node, ...props }) => (
                        <a 
                          className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          onClick={(e) => e.stopPropagation()}
                          {...props} 
                        />
                      )
                    }}
                  >
                    {line}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Shortcuts Modal (rendered on document.body via Portal) */}
      {showShortcutsModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Keyboard size={18} className="text-indigo-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Markdown Live Shortcuts</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800 space-y-1">
                  <div className="font-bold text-indigo-400">Inline Formatting</div>
                  <div><span className="text-amber-400">Ctrl + B</span> : **Bold**</div>
                  <div><span className="text-amber-400">Ctrl + I</span> : *Italic*</div>
                  <div><span className="text-amber-400">Ctrl + Shift + X</span> : ~~Strike~~</div>
                  <div><span className="text-amber-400">Ctrl + K</span> : [Link](url)</div>
                  <div><span className="text-amber-400">Ctrl + `</span> : `code`</div>
                  <div><span className="text-amber-400">Esc</span> : Exit to Full Preview</div>
                </div>

                <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800 space-y-1">
                  <div className="font-bold text-indigo-400">Lists & Navigation</div>
                  <div><span className="text-amber-400">Tab</span> : Indent to 2nd Level</div>
                  <div><span className="text-amber-400">Shift + Tab</span> : Outdent to 1st Level</div>
                  <div><span className="text-amber-400">Enter</span> : Continue list / Sub-list</div>
                  <div><span className="text-amber-400">Enter on empty</span> : Outdent / Exit</div>
                  <div><span className="text-amber-400">Delete at end</span> : Merge next line</div>
                  <div><span className="text-amber-400">↑ / ↓</span> : Prev / Next line</div>
                </div>
              </div>

              <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800 space-y-1.5">
                <div className="font-bold text-indigo-400">Live Markdown Rendering & Multi-line Paste</div>
                <div className="text-slate-400 leading-relaxed font-sans">
                  Lines automatically render as rich headings, bold/italic text, sub-level lists, and interactive checklists. Pasting multi-line content expands seamlessly across lines.
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
