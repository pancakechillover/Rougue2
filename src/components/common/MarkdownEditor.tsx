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

interface ListPrefixInfo {
  type: 'task' | 'ordered' | 'bullet' | 'quote' | null;
  indent: string;
  prefix: string;
  content: string;
  orderNumber?: number;
  isChecked?: boolean;
}

const parseListPrefix = (line: string): ListPrefixInfo => {
  // Task: "  - [ ] ", "  * [x] ", "  + [ ] "
  const taskMatch = line.match(/^(\s*)([-*+]\s+\[([ xX]?)\]\s*)(.*)$/);
  if (taskMatch) {
    return {
      type: 'task',
      indent: taskMatch[1],
      prefix: taskMatch[2],
      isChecked: taskMatch[3].toLowerCase() === 'x',
      content: taskMatch[4],
    };
  }

  // Ordered list: "  1. ", "  12. "
  const orderedMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
  if (orderedMatch) {
    return {
      type: 'ordered',
      indent: orderedMatch[1],
      prefix: `${orderedMatch[2]}. `,
      orderNumber: parseInt(orderedMatch[2], 10),
      content: orderedMatch[3],
    };
  }

  // Bullet list: "  - ", "  * ", "  + "
  const bulletMatch = line.match(/^(\s*)([-*+]\s+)(.*)$/);
  if (bulletMatch) {
    return {
      type: 'bullet',
      indent: bulletMatch[1],
      prefix: bulletMatch[2],
      content: bulletMatch[3],
    };
  }

  // Blockquote: "  > "
  const quoteMatch = line.match(/^(\s*)(>\s*)(.*)$/);
  if (quoteMatch) {
    return {
      type: 'quote',
      indent: quoteMatch[1],
      prefix: quoteMatch[2],
      content: quoteMatch[3],
    };
  }

  return {
    type: null,
    indent: '',
    prefix: '',
    content: line,
  };
};

interface HistoryEntry {
  value: string;
  activeLineIndex: number | null;
  cursorPos: number | null;
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

  const lines = value.split('\n');
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(autoFocus ? 0 : null);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const activeTextareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingCursorPos = useRef<number | null>(null);

  // Undo / Redo history state
  const undoStackRef = useRef<HistoryEntry[]>([]);
  const redoStackRef = useRef<HistoryEntry[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const isPerformingHistoryActionRef = useRef(false);
  const typingBurstStartRef = useRef<HistoryEntry | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTrackedValueRef = useRef<string>(value);

  // Sync external value changes (e.g. date switch, template load)
  useEffect(() => {
    if (value !== lastTrackedValueRef.current) {
      if (isPerformingHistoryActionRef.current) {
        isPerformingHistoryActionRef.current = false;
        lastTrackedValueRef.current = value;
      } else {
        // External value change: clean slate for new day/template
        undoStackRef.current = [];
        redoStackRef.current = [];
        typingBurstStartRef.current = null;
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
        setCanUndo(false);
        setCanRedo(false);
        lastTrackedValueRef.current = value;
      }
    }
  }, [value]);

  // Clean up typing timer on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Record an immediate snapshot before discrete changes (Enter, Backspace merge, format, heading, prefix)
  const recordImmediateSnapshot = useCallback((customLineIndex?: number, customCursorPos?: number) => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    typingBurstStartRef.current = null;

    const currentActiveIndex = customLineIndex !== undefined ? customLineIndex : activeLineIndex;
    const currentCursor = customCursorPos !== undefined 
      ? customCursorPos 
      : (activeTextareaRef.current ? activeTextareaRef.current.selectionStart : null);

    const currentEntry: HistoryEntry = {
      value,
      activeLineIndex: currentActiveIndex,
      cursorPos: currentCursor,
    };

    const stack = undoStackRef.current;
    const lastEntry = stack[stack.length - 1];

    if (!lastEntry || lastEntry.value !== value) {
      stack.push(currentEntry);
      if (stack.length > 80) stack.shift();
      setCanUndo(true);
    }

    if (redoStackRef.current.length > 0) {
      redoStackRef.current = [];
      setCanRedo(false);
    }
  }, [value, activeLineIndex]);

  // Update a single line
  const handleLineChange = useCallback((index: number, newLineText: string, isDiscreteAction?: boolean) => {
    if (!isDiscreteAction) {
      const currentCursor = activeTextareaRef.current ? activeTextareaRef.current.selectionStart : null;
      
      // If start of a continuous typing burst, capture the state BEFORE this typing sequence begins
      if (!typingBurstStartRef.current) {
        typingBurstStartRef.current = {
          value,
          activeLineIndex: index,
          cursorPos: currentCursor,
        };
        setCanUndo(true);
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Debounce committing the typing burst snapshot to history stack
      typingTimeoutRef.current = setTimeout(() => {
        if (typingBurstStartRef.current) {
          const stack = undoStackRef.current;
          const lastEntry = stack[stack.length - 1];
          if (!lastEntry || lastEntry.value !== typingBurstStartRef.current.value) {
            stack.push(typingBurstStartRef.current);
            if (stack.length > 80) stack.shift();
            setCanUndo(true);
          }
          typingBurstStartRef.current = null;
        }
      }, 650);

      if (redoStackRef.current.length > 0) {
        redoStackRef.current = [];
        setCanRedo(false);
      }
    }

    const newLines = [...lines];
    newLines[index] = newLineText;
    const newValue = newLines.join('\n');
    lastTrackedValueRef.current = newValue;
    onChange(newValue);
  }, [lines, value, onChange]);

  // Undo implementation
  const undo = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    const currentCursor = activeTextareaRef.current ? activeTextareaRef.current.selectionStart : null;
    const currentSnapshot: HistoryEntry = {
      value,
      activeLineIndex,
      cursorPos: currentCursor,
    };

    let targetEntry: HistoryEntry | null = null;

    if (typingBurstStartRef.current && typingBurstStartRef.current.value !== value) {
      targetEntry = typingBurstStartRef.current;
      typingBurstStartRef.current = null;
    } else if (undoStackRef.current.length > 0) {
      targetEntry = undoStackRef.current.pop() || null;
    }

    if (!targetEntry) return;

    redoStackRef.current.push(currentSnapshot);
    if (redoStackRef.current.length > 80) {
      redoStackRef.current.shift();
    }

    isPerformingHistoryActionRef.current = true;
    lastTrackedValueRef.current = targetEntry.value;
    onChange(targetEntry.value);

    if (targetEntry.activeLineIndex !== null) {
      setActiveLineIndex(targetEntry.activeLineIndex);
      pendingCursorPos.current = targetEntry.cursorPos;
      if (activeTextareaRef.current && targetEntry.cursorPos !== null) {
        setTimeout(() => {
          if (activeTextareaRef.current && targetEntry.cursorPos !== null) {
            const pos = Math.min(targetEntry.cursorPos, activeTextareaRef.current.value.length);
            activeTextareaRef.current.setSelectionRange(pos, pos);
          }
        }, 0);
      }
    }

    setCanUndo(undoStackRef.current.length > 0 || !!typingBurstStartRef.current);
    setCanRedo(true);
  }, [value, activeLineIndex, onChange]);

  // Redo implementation
  const redo = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    typingBurstStartRef.current = null;

    if (redoStackRef.current.length === 0) return;

    const targetEntry = redoStackRef.current.pop();
    if (!targetEntry) return;

    const currentCursor = activeTextareaRef.current ? activeTextareaRef.current.selectionStart : null;
    const currentSnapshot: HistoryEntry = {
      value,
      activeLineIndex,
      cursorPos: currentCursor,
    };

    undoStackRef.current.push(currentSnapshot);
    if (undoStackRef.current.length > 80) {
      undoStackRef.current.shift();
    }

    isPerformingHistoryActionRef.current = true;
    lastTrackedValueRef.current = targetEntry.value;
    onChange(targetEntry.value);

    if (targetEntry.activeLineIndex !== null) {
      setActiveLineIndex(targetEntry.activeLineIndex);
      pendingCursorPos.current = targetEntry.cursorPos;
      if (activeTextareaRef.current && targetEntry.cursorPos !== null) {
        setTimeout(() => {
          if (activeTextareaRef.current && targetEntry.cursorPos !== null) {
            const pos = Math.min(targetEntry.cursorPos, activeTextareaRef.current.value.length);
            activeTextareaRef.current.setSelectionRange(pos, pos);
          }
        }, 0);
      }
    }

    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
  }, [value, activeLineIndex, onChange]);

  // Auto focus active line textarea and set cursor position
  useEffect(() => {
    if (activeLineIndex !== null && activeTextareaRef.current) {
      activeTextareaRef.current.focus();
      if (pendingCursorPos.current !== null) {
        const pos = Math.min(pendingCursorPos.current, activeTextareaRef.current.value.length);
        activeTextareaRef.current.setSelectionRange(pos, pos);
        pendingCursorPos.current = null;
      }
    }
  }, [activeLineIndex]);

  // Format selection with wrappers (e.g. bold, italic, code)
  const formatSelection = useCallback((index: number, prefix: string, suffix: string, defaultText: string = '') => {
    recordImmediateSnapshot(index);
    const textarea = activeTextareaRef.current;
    const currentLine = lines[index] ?? '';
    if (!textarea) {
      const newLine = currentLine + prefix + defaultText + suffix;
      handleLineChange(index, newLine, true);
      pendingCursorPos.current = newLine.length;
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start !== end) {
      const selected = currentLine.substring(start, end);
      const before = currentLine.substring(0, start);
      const after = currentLine.substring(end);
      const newLine = before + prefix + selected + suffix + after;
      handleLineChange(index, newLine, true);
      pendingCursorPos.current = start + prefix.length + selected.length + suffix.length;
    } else {
      const before = currentLine.substring(0, start);
      const after = currentLine.substring(start);
      const newLine = before + prefix + defaultText + suffix + after;
      handleLineChange(index, newLine, true);
      pendingCursorPos.current = start + prefix.length + defaultText.length;
    }
  }, [lines, handleLineChange, recordImmediateSnapshot]);

  // Set or toggle heading outline level (0 = paragraph, 1 = H1, 2 = H2, ...)
  const setHeadingLevel = useCallback((index: number, level: number) => {
    recordImmediateSnapshot(index);
    const currentLine = lines[index] ?? '';
    const headingMatch = currentLine.match(/^(\s*)(#{1,6})\s+(.*)$/);
    const listMatch = currentLine.match(/^(\s*)([-*+]\s+\[[ xX]?\]\s+|[-*+]\s+|\d+\.\s+)(.*)$/);

    let indent = '';
    let content = currentLine;
    if (headingMatch) {
      indent = headingMatch[1];
      content = headingMatch[3];
    } else if (listMatch) {
      indent = listMatch[1];
      content = listMatch[3];
    }

    let newLine = '';
    if (level === 0) {
      newLine = indent + content;
    } else {
      // Toggle off if pressing the same heading level
      if (headingMatch && headingMatch[2].length === level) {
        newLine = indent + content;
      } else {
        newLine = `${indent}${'#'.repeat(level)} ${content}`;
      }
    }

    handleLineChange(index, newLine, true);
    pendingCursorPos.current = newLine.length;
  }, [lines, handleLineChange, recordImmediateSnapshot]);

  // Toggle line prefixes (toolbar or shortcuts)
  const toggleLinePrefix = useCallback((prefix: string) => {
    const targetIndex = activeLineIndex !== null ? activeLineIndex : 0;
    recordImmediateSnapshot(targetIndex);
    const currentLine = lines[targetIndex] ?? '';
    const indentMatch = currentLine.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1] : '';
    const withoutIndent = currentLine.slice(indent.length);

    let newLineText = '';
    if (withoutIndent.startsWith(prefix)) {
      // Toggle off
      newLineText = indent + withoutIndent.substring(prefix.length);
    } else {
      // Clean any other prefix, preserving existing indentation
      const cleanedContent = withoutIndent.replace(/^(#{1,6}\s+|-\s*\[[ xX]?\]\s+|[-*+]\s+|\d+\.\s+|>\s+)/, '');
      newLineText = indent + prefix + cleanedContent;
    }
    handleLineChange(targetIndex, newLineText, true);
    pendingCursorPos.current = newLineText.length;
    setActiveLineIndex(targetIndex);
  }, [activeLineIndex, lines, handleLineChange, recordImmediateSnapshot]);

  // Keyboard navigation, shortcuts, outline levels, auto-lists, and splitting
  const handleLineKeyDown = (index: number, e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = activeTextareaRef.current;
    if (!textarea) return;
    const cursor = textarea.selectionStart;
    const currentLine = lines[index] ?? '';

    // 0. History (Undo & Redo): Ctrl+Z / Cmd+Z, Ctrl+Y / Cmd+Y, Ctrl+Shift+Z / Cmd+Shift+Z
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }

    if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')) {
      e.preventDefault();
      redo();
      return;
    }

    // 1. Heading Outline Levels: Alt+1..6 / Alt+0 or Ctrl+1..6 / Ctrl+0
    const isAltNumber = e.altKey && ['0', '1', '2', '3', '4', '5', '6'].includes(e.key);
    const isCtrlNumber = (e.ctrlKey || e.metaKey) && ['0', '1', '2', '3', '4', '5', '6'].includes(e.key);
    if (isAltNumber || isCtrlNumber) {
      e.preventDefault();
      setHeadingLevel(index, parseInt(e.key, 10));
      return;
    }

    // 2. Text Formatting Shortcuts
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      formatSelection(index, '**', '**', 'bold');
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      formatSelection(index, '*', '*', 'italic');
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      formatSelection(index, '[', '](url)', 'link');
      return;
    }

    if ((e.altKey && e.key.toLowerCase() === 's') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'x')) {
      e.preventDefault();
      formatSelection(index, '~~', '~~', 'strikethrough');
      return;
    }

    if ((e.altKey && e.key.toLowerCase() === 'e') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'e')) {
      e.preventDefault();
      formatSelection(index, '`', '`', 'code');
      return;
    }

    // 3. List Item Shortcuts
    // Bullet: Alt+U or Ctrl+Shift+U or Ctrl+L
    if ((e.altKey && e.key.toLowerCase() === 'u') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'u') || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l')) {
      e.preventDefault();
      toggleLinePrefix('- ');
      return;
    }

    // Numbered List: Alt+O or Ctrl+Shift+O
    if ((e.altKey && e.key.toLowerCase() === 'o') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'o')) {
      e.preventDefault();
      toggleLinePrefix('1. ');
      return;
    }

    // Task Checklist: Alt+C or Ctrl+Shift+C
    if ((e.altKey && e.key.toLowerCase() === 'c') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c')) {
      e.preventDefault();
      toggleLinePrefix('- [ ] ');
      return;
    }

    // Quote: Alt+Q or Ctrl+Shift+Q
    if ((e.altKey && e.key.toLowerCase() === 'q') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'q')) {
      e.preventDefault();
      toggleLinePrefix('> ');
      return;
    }

    // 4. Enter: Auto-continue or exit list items / split lines
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      recordImmediateSnapshot(index, cursor);
      const listInfo = parseListPrefix(currentLine);

      if (listInfo.type) {
        // If the list item has NO content (empty list item like "- " or "1. ")
        if (!listInfo.content.trim()) {
          if (listInfo.indent.length >= 2) {
            // Outdent by 2 spaces
            const outdented = listInfo.indent.slice(2) + listInfo.prefix;
            handleLineChange(index, outdented, true);
            pendingCursorPos.current = outdented.length;
            return;
          } else {
            // Clear prefix completely! (Exit list cleanly)
            handleLineChange(index, '', true);
            pendingCursorPos.current = 0;
            return;
          }
        }

        // If it HAS content: split line and continue list on next line
        const before = currentLine.substring(0, cursor);
        const after = currentLine.substring(cursor);

        let nextPrefix = `${listInfo.indent}- `;
        if (listInfo.type === 'ordered' && typeof listInfo.orderNumber === 'number') {
          nextPrefix = `${listInfo.indent}${listInfo.orderNumber + 1}. `;
        } else if (listInfo.type === 'task') {
          nextPrefix = `${listInfo.indent}- [ ] `;
        } else if (listInfo.type === 'quote') {
          nextPrefix = `${listInfo.indent}> `;
        } else if (listInfo.type === 'bullet') {
          nextPrefix = `${listInfo.indent}${listInfo.prefix}`;
        }

        const newLines = [...lines];
        newLines[index] = before;
        newLines.splice(index + 1, 0, nextPrefix + after);
        const newDoc = newLines.join('\n');
        lastTrackedValueRef.current = newDoc;
        onChange(newDoc);
        pendingCursorPos.current = nextPrefix.length;
        setActiveLineIndex(index + 1);
        return;
      }

      // Normal line split
      const before = currentLine.substring(0, cursor);
      const after = currentLine.substring(cursor);
      const newLines = [...lines];
      newLines[index] = before;
      newLines.splice(index + 1, 0, after);
      const newDoc = newLines.join('\n');
      lastTrackedValueRef.current = newDoc;
      onChange(newDoc);
      pendingCursorPos.current = 0;
      setActiveLineIndex(index + 1);
      return;
    }

    // 5. Tab / Shift+Tab: Indentation and outline promotion/demotion
    if (e.key === 'Tab') {
      e.preventDefault();
      recordImmediateSnapshot(index, cursor);
      if (e.shiftKey) {
        // Shift+Tab: Promote heading or outdent
        const headingMatch = currentLine.match(/^(\s*)(#{1,6})\s+(.*)$/);
        if (headingMatch) {
          const hashes = headingMatch[2];
          const rest = headingMatch[3];
          const newHeading = hashes.length > 1 ? `${headingMatch[1]}${hashes.slice(1)} ${rest}` : `${headingMatch[1]}${rest}`;
          handleLineChange(index, newHeading, true);
          pendingCursorPos.current = Math.max(0, cursor - 1);
          return;
        }

        // Outdent leading 2 spaces or tab
        if (currentLine.startsWith('  ')) {
          const newText = currentLine.slice(2);
          handleLineChange(index, newText, true);
          pendingCursorPos.current = Math.max(0, cursor - 2);
          return;
        } else if (currentLine.startsWith('\t') || currentLine.startsWith(' ')) {
          const newText = currentLine.slice(1);
          handleLineChange(index, newText, true);
          pendingCursorPos.current = Math.max(0, cursor - 1);
          return;
        }
      } else {
        // Tab: Demote heading or indent list item or insert 2 spaces
        const headingMatch = currentLine.match(/^(\s*)(#{1,5})\s+(.*)$/);
        if (headingMatch) {
          const newHeading = `${headingMatch[1]}#${headingMatch[2]} ${headingMatch[3]}`;
          handleLineChange(index, newHeading, true);
          pendingCursorPos.current = cursor + 1;
          return;
        }

        const listInfo = parseListPrefix(currentLine);
        if (listInfo.type) {
          const newText = '  ' + currentLine;
          handleLineChange(index, newText, true);
          pendingCursorPos.current = cursor + 2;
          return;
        }

        // Normal text: insert 2 spaces
        const before = currentLine.substring(0, cursor);
        const after = currentLine.substring(cursor);
        handleLineChange(index, before + '  ' + after, true);
        pendingCursorPos.current = cursor + 2;
        return;
      }
    }

    // 6. Backspace: Clear empty list prefix or outdent secondary list, or merge with previous line
    if (e.key === 'Backspace') {
      const listInfo = parseListPrefix(currentLine);
      // If cursor is at or before end of empty prefix (e.g. "  - |" or "- |")
      if (listInfo.type && cursor <= (listInfo.indent.length + listInfo.prefix.length) && !listInfo.content.trim()) {
        e.preventDefault();
        recordImmediateSnapshot(index, cursor);
        if (listInfo.indent.length >= 2) {
          // Outdent secondary list back to primary list
          const outdented = listInfo.indent.slice(2) + listInfo.prefix;
          handleLineChange(index, outdented, true);
          pendingCursorPos.current = outdented.length;
          return;
        }
        handleLineChange(index, '', true);
        pendingCursorPos.current = 0;
        return;
      }

      // Merge with previous line if at start
      if (cursor === 0 && textarea.selectionEnd === 0 && index > 0) {
        e.preventDefault();
        recordImmediateSnapshot(index, cursor);
        const prevLine = lines[index - 1] ?? '';
        const newLines = [...lines];
        newLines[index - 1] = prevLine + currentLine;
        newLines.splice(index, 1);
        const newDoc = newLines.join('\n');
        lastTrackedValueRef.current = newDoc;
        onChange(newDoc);
        pendingCursorPos.current = prevLine.length;
        setActiveLineIndex(index - 1);
        return;
      }
    }

    // 7. Arrow Up / Down navigation between lines
    if (e.key === 'ArrowUp' && index > 0 && cursor === 0) {
      e.preventDefault();
      pendingCursorPos.current = lines[index - 1].length;
      setActiveLineIndex(index - 1);
      return;
    }

    if (e.key === 'ArrowDown' && index < lines.length - 1 && cursor === currentLine.length) {
      e.preventDefault();
      pendingCursorPos.current = lines[index + 1].length;
      setActiveLineIndex(index + 1);
      return;
    }
  };

  return (
    <div 
      className={cn("flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 shadow-inner overflow-hidden focus:outline-none", className)}
      onKeyDown={(e) => {
        // Catch Undo/Redo even if focus is on editor wrapper
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
          e.preventDefault();
          undo();
          return;
        }
        if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
            ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')) {
          e.preventDefault();
          redo();
          return;
        }
      }}
      tabIndex={-1}
    >
      {/* Toolbar */}
      {!hideToolbar && (
        <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex-wrap gap-2">
          <div className="flex items-center gap-1 flex-wrap">
            {/* Undo & Redo buttons */}
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                canUndo 
                  ? "bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white" 
                  : "text-slate-600 opacity-40 cursor-not-allowed"
              )}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={13} />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                canRedo 
                  ? "bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white" 
                  : "text-slate-600 opacity-40 cursor-not-allowed"
              )}
              title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
            >
              <Redo2 size={13} />
            </button>

            <div className="h-4 w-[1px] bg-slate-800 mx-1" />

            <button
              type="button"
              onClick={() => formatSelection(activeLineIndex ?? 0, '**', '**', 'bold')}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Bold (Ctrl+B)"
            >
              <Bold size={13} />
            </button>
            <button
              type="button"
              onClick={() => formatSelection(activeLineIndex ?? 0, '*', '*', 'italic')}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Italic (Ctrl+I)"
            >
              <Italic size={13} />
            </button>
            <button
              type="button"
              onClick={() => formatSelection(activeLineIndex ?? 0, '~~', '~~', 'strikethrough')}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Strikethrough (Alt+S)"
            >
              <Strikethrough size={13} />
            </button>

            <div className="h-4 w-[1px] bg-slate-800 mx-1" />

            <button
              type="button"
              onClick={() => setHeadingLevel(activeLineIndex ?? 0, 1)}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Heading 1 (Alt+1 / Ctrl+1)"
            >
              <Heading1 size={13} />
            </button>
            <button
              type="button"
              onClick={() => setHeadingLevel(activeLineIndex ?? 0, 2)}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Heading 2 (Alt+2 / Ctrl+2)"
            >
              <Heading2 size={13} />
            </button>
            <button
              type="button"
              onClick={() => setHeadingLevel(activeLineIndex ?? 0, 3)}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Heading 3 (Alt+3 / Ctrl+3)"
            >
              <Heading3 size={13} />
            </button>

            <div className="h-4 w-[1px] bg-slate-800 mx-1" />

            <button
              type="button"
              onClick={() => toggleLinePrefix('- ')}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Bullet List (Alt+U)"
            >
              <List size={13} />
            </button>
            <button
              type="button"
              onClick={() => toggleLinePrefix('1. ')}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Numbered List (Alt+O)"
            >
              <ListOrdered size={13} />
            </button>
            <button
              type="button"
              onClick={() => toggleLinePrefix('- [ ] ')}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Checkbox Task (Alt+C)"
            >
              <CheckSquare size={13} />
            </button>
            <button
              type="button"
              onClick={() => toggleLinePrefix('> ')}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Quote (Alt+Q)"
            >
              <Quote size={13} />
            </button>
            <button
              type="button"
              onClick={() => formatSelection(activeLineIndex ?? 0, '`', '`', 'code')}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Inline Code (Alt+E)"
            >
              <Code size={13} />
            </button>
            <button
              type="button"
              onClick={() => formatSelection(activeLineIndex ?? 0, '[', '](url)', 'link')}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Link (Ctrl+K)"
            >
              <LinkIcon size={13} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowShortcutsModal(true)}
              className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5 text-xs font-mono"
              title="Markdown Shortcuts Guide"
            >
              <Keyboard size={13} />
              <span className="hidden sm:inline text-[11px]">Shortcuts</span>
            </button>
            <EditorTypographyMenu />
          </div>
        </div>
      )}

      {/* Obsidian-Style Live Preview Editor Area */}
      <div 
        className="flex-1 w-full overflow-y-auto custom-scrollbar p-4 space-y-1 font-sans font-normal"
        style={{ 
          minHeight,
          fontFamily: 'var(--font-sans, "Inter", ui-sans-serif, system-ui, sans-serif)',
        }}
        onClick={(e) => {
          // If clicked directly on the empty background below lines
          if (e.target === e.currentTarget) {
            if (lines.length === 0) {
              recordImmediateSnapshot();
              lastTrackedValueRef.current = '';
              onChange('');
              setActiveLineIndex(0);
            } else {
              const lastIdx = lines.length - 1;
              if (lines[lastIdx].trim() !== '') {
                recordImmediateSnapshot();
                const newVal = value + '\n';
                lastTrackedValueRef.current = newVal;
                onChange(newVal);
                setActiveLineIndex(lines.length);
                pendingCursorPos.current = 0;
              } else {
                setActiveLineIndex(lastIdx);
                pendingCursorPos.current = lines[lastIdx].length;
              }
            }
          }
        }}
      >
        {lines.length === 0 || (lines.length === 1 && lines[0] === '') ? (
          <div 
            onClick={() => setActiveLineIndex(0)}
            className="text-slate-600 italic cursor-text py-1 font-sans font-normal"
            style={{ 
              fontSize: `${fontSize}px`, 
              lineHeight: lineMultiplier,
              fontFamily: 'var(--font-sans, "Inter", ui-sans-serif, system-ui, sans-serif)',
            }}
          >
            {placeholder}
          </div>
        ) : (
          lines.map((line, index) => {
            const isActive = activeLineIndex === index;
            const listInfo = parseListPrefix(line);
            const rawIndent = listInfo.indent || (line.match(/^(\s*)/)?.[1] ?? '');
            const indentSpaces = rawIndent.replace(/\t/g, '  ').length;
            const indentLevel = Math.floor(indentSpaces / 2);
            const isBlankListItem = /^(\s*)([-*+]|\d+\.|-\s*\[[ xX]?\]|>)\s*$/.test(line);
            const lineToRender = listInfo.type ? line.trimStart() : line;

            return (
              <div 
                key={index}
                className={cn(
                  "group relative rounded-lg transition-all px-1.5 py-0.5 font-sans font-normal",
                  isActive ? "bg-slate-800/40 ring-1 ring-indigo-500/30" : "hover:bg-slate-800/20 cursor-pointer"
                )}
                onClick={() => {
                  if (!isActive) {
                    setActiveLineIndex(index);
                    pendingCursorPos.current = line.length;
                  }
                }}
              >
                {isActive ? (
                  <textarea
                    ref={activeTextareaRef}
                    value={line}
                    onChange={(e) => handleLineChange(index, e.target.value)}
                    onKeyDown={(e) => handleLineKeyDown(index, e)}
                    rows={1}
                    className="w-full bg-transparent text-slate-100 placeholder:text-slate-600 focus:outline-none resize-none font-sans font-normal tracking-normal overflow-hidden"
                    style={{
                      fontSize: line.startsWith('# ') 
                        ? `${Math.round(fontSize * 1.55)}px` 
                        : line.startsWith('## ') 
                          ? `${Math.round(fontSize * 1.3)}px` 
                          : line.startsWith('### ') 
                            ? `${Math.round(fontSize * 1.15)}px` 
                            : `${fontSize}px`,
                      fontWeight: line.startsWith('# ') 
                        ? 900 
                        : line.startsWith('## ') || line.startsWith('### ') 
                          ? 700 
                          : 400,
                      lineHeight: lineMultiplier,
                      fontFamily: 'var(--font-sans, "Inter", ui-sans-serif, system-ui, sans-serif)',
                      height: 'auto',
                      tabSize: 2,
                    }}
                    autoFocus
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = `${target.scrollHeight}px`;
                    }}
                    spellCheck={false}
                  />
                ) : isBlankListItem ? (
                  // Elegant placeholder for blank list items rather than a lonely dot
                  <div 
                    className="markdown-content text-slate-200 select-text min-h-[1.5em] flex items-center gap-2 font-sans font-normal tracking-normal"
                    style={{
                      fontSize: `${fontSize}px`,
                      lineHeight: lineMultiplier,
                      fontFamily: 'var(--font-sans, "Inter", ui-sans-serif, system-ui, sans-serif)',
                      paddingLeft: indentLevel > 0 ? `${indentLevel * 24}px` : undefined,
                    }}
                  >
                    <span className="text-indigo-400/80 font-sans select-none pl-5">
                      {line.includes('[') 
                        ? '☐' 
                        : /^\s*\d+\./.test(line) 
                          ? (indentLevel === 1 ? 'a.' : indentLevel >= 2 ? 'i.' : '1.') 
                          : indentLevel === 1 
                            ? '◦' 
                            : indentLevel >= 2 
                              ? '▪' 
                              : '•'}
                    </span>
                    <span className="text-slate-500/50 italic text-[0.88em] select-none">List item...</span>
                  </div>
                ) : (
                  <div 
                    className="markdown-content text-slate-200 select-text min-h-[1.5em] font-sans font-normal tracking-normal"
                    style={{
                      fontSize: `${fontSize}px`,
                      lineHeight: lineMultiplier,
                      fontFamily: 'var(--font-sans, "Inter", ui-sans-serif, system-ui, sans-serif)',
                      paddingLeft: indentLevel > 0 ? `${indentLevel * 24}px` : undefined,
                    }}
                  >
                    {line.trim() ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkBreaks]}
                        components={{
                          h1: ({ node, ...props }) => <h1 className="font-black text-slate-100 mt-2 mb-1" style={{ fontSize: `${Math.round(fontSize * 1.55)}px` }} {...props} />,
                          h2: ({ node, ...props }) => <h2 className="font-bold text-slate-100 mt-2 mb-1" style={{ fontSize: `${Math.round(fontSize * 1.3)}px` }} {...props} />,
                          h3: ({ node, ...props }) => <h3 className="font-bold text-indigo-300 mt-1.5 mb-0.5" style={{ fontSize: `${Math.round(fontSize * 1.15)}px` }} {...props} />,
                          p: ({ node, ...props }) => <p className="my-0.5 text-slate-200" {...props} />,
                          ul: ({ node, ...props }) => {
                            const bulletClass = indentLevel === 1 
                              ? "list-[circle]" 
                              : indentLevel >= 2 
                                ? "list-[square]" 
                                : "list-disc";
                            return (
                              <ul 
                                className={cn(bulletClass, "pl-5 my-0.5 marker:text-indigo-400")} 
                                {...props} 
                              />
                            );
                          },
                          ol: ({ node, ...props }) => {
                            const numClass = indentLevel === 1 
                              ? "list-[lower-alpha]" 
                              : indentLevel >= 2 
                                ? "list-[lower-roman]" 
                                : "list-decimal";
                            return (
                              <ol 
                                className={cn(numClass, "pl-5 my-0.5 marker:text-indigo-400 font-medium")} 
                                {...props} 
                              />
                            );
                          },
                          li: ({ node, ...props }) => <li className="text-slate-200" {...props} />,
                          blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-indigo-500/70 bg-indigo-500/5 pl-3 py-0.5 my-1 italic text-slate-300 rounded-r" {...props} />,
                          input: ({ node, ...props }) => {
                            if (props.type === 'checkbox') {
                              return (
                                <input
                                  type="checkbox"
                                  checked={props.checked}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    recordImmediateSnapshot(index);
                                    const newLine = props.checked
                                      ? line.replace(/\[[xX]\]/, '[ ]')
                                      : line.replace(/\[\s?\]/, '[x]');
                                    handleLineChange(index, newLine, true);
                                  }}
                                  className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-0 mr-1.5 cursor-pointer align-middle"
                                />
                              );
                            }
                            return <input {...props} />;
                          },
                          code: ({ node, className, children, ...props }: any) => {
                            const isInline = !className?.includes('language-');
                            return isInline ? (
                              <code className="px-1 py-0.5 bg-slate-900 border border-slate-800 text-indigo-300 rounded text-[0.9em] font-mono" {...props}>{children}</code>
                            ) : (
                              <pre className="p-2 my-1 bg-slate-950 border border-slate-800 rounded-lg overflow-x-auto text-[0.9em] font-mono text-slate-200"><code {...props}>{children}</code></pre>
                            );
                          },
                          a: ({ node, ...props }) => <a className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2" target="_blank" rel="noreferrer" {...props} />,
                        }}
                      >
                        {lineToRender}
                      </ReactMarkdown>
                    ) : (
                      <span className="opacity-0">.</span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Shortcuts Cheatsheet Modal */}
      {showShortcutsModal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowShortcutsModal(false)}
        >
          <div 
            className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Keyboard size={18} className="text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">Markdown Shortcuts</h3>
              </div>
              <button 
                onClick={() => setShowShortcutsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1.5">History & Undo / Redo</div>
                <div className="grid grid-cols-2 gap-1.5 font-mono text-slate-300">
                  <div className="flex items-center justify-between bg-slate-800/50 px-2 py-1 rounded">
                    <span>Undo</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-indigo-300 text-[10px]">Ctrl+Z</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-slate-800/50 px-2 py-1 rounded">
                    <span>Redo</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-indigo-300 text-[10px]">Ctrl+Y / Ctrl+Shift+Z</kbd>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1.5">Outlines & Headings</div>
                <div className="grid grid-cols-2 gap-1.5 font-mono text-slate-300">
                  <div className="flex items-center justify-between bg-slate-800/50 px-2 py-1 rounded">
                    <span>Heading 1-6</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-indigo-300 text-[10px]">Alt+1~6</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-slate-800/50 px-2 py-1 rounded">
                    <span>Paragraph</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-indigo-300 text-[10px]">Alt+0</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-slate-800/50 px-2 py-1 rounded">
                    <span>Demote Heading</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-indigo-300 text-[10px]">Tab</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-slate-800/50 px-2 py-1 rounded">
                    <span>Promote Heading</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-indigo-300 text-[10px]">Shift+Tab</kbd>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1.5">Lists & Notes</div>
                <div className="grid grid-cols-2 gap-1.5 font-mono text-slate-300">
                  <div className="flex items-center justify-between bg-slate-800/50 px-2 py-1 rounded">
                    <span>Bullet List</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-indigo-300 text-[10px]">Alt+U</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-slate-800/50 px-2 py-1 rounded">
                    <span>Numbered List</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-indigo-300 text-[10px]">Alt+O</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-slate-800/50 px-2 py-1 rounded">
                    <span>Task Checklist</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-indigo-300 text-[10px]">Alt+C</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-slate-800/50 px-2 py-1 rounded">
                    <span>Quote Block</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-indigo-300 text-[10px]">Alt+Q</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-slate-800/50 px-2 py-1 rounded">
                    <span>Auto-Continue</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-indigo-300 text-[10px]">Enter</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-slate-800/50 px-2 py-1 rounded">
                    <span>Exit List / Cancel</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-indigo-300 text-[10px]">Enter (Empty)</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-slate-800/50 px-2 py-1 rounded">
                    <span>Indent List</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-indigo-300 text-[10px]">Tab</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-slate-800/50 px-2 py-1 rounded">
                    <span>Outdent List</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-indigo-300 text-[10px]">Shift+Tab</kbd>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1.5">Inline Formatting</div>
                <div className="grid grid-cols-2 gap-1.5 font-mono text-slate-300">
                  <div className="flex items-center justify-between bg-slate-800/50 px-2 py-1 rounded">
                    <span>Bold</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-indigo-300 text-[10px]">Ctrl+B</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-slate-800/50 px-2 py-1 rounded">
                    <span>Italic</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-indigo-300 text-[10px]">Ctrl+I</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-slate-800/50 px-2 py-1 rounded">
                    <span>Strikethrough</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-indigo-300 text-[10px]">Alt+S</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-slate-800/50 px-2 py-1 rounded">
                    <span>Inline Code</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-indigo-300 text-[10px]">Alt+E</kbd>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors"
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
