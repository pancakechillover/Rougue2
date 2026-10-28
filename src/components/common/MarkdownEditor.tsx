import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { 
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3, 
  List, ListOrdered, CheckSquare, Quote, Code, Link as LinkIcon, 
  Keyboard, X, Undo2, Redo2, Highlighter, Table as TableIcon, 
  FileCode, Sparkles, Clock, Minus, AlertCircle, Info, Lightbulb, AlertTriangle, Copy, Check
} from 'lucide-react';
import { format } from 'date-fns';
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

interface SlashCommandItem {
  id: string;
  label: string;
  description: string;
  shortcut?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  action: (currentLine: string) => { replaceLines: string[]; cursorLineOffset: number; cursorCol: number };
}

const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    id: 'todo',
    label: 'To-do Checklist',
    description: 'Track tasks with an interactive checkbox',
    shortcut: '- [ ]',
    icon: CheckSquare,
    action: () => ({ replaceLines: ['- [ ] '], cursorLineOffset: 0, cursorCol: 6 }),
  },
  {
    id: 'h1',
    label: 'Heading 1',
    description: 'Large section heading',
    shortcut: '#',
    icon: Heading1,
    action: () => ({ replaceLines: ['# '], cursorLineOffset: 0, cursorCol: 2 }),
  },
  {
    id: 'h2',
    label: 'Heading 2',
    description: 'Medium section heading',
    shortcut: '##',
    icon: Heading2,
    action: () => ({ replaceLines: ['## '], cursorLineOffset: 0, cursorCol: 3 }),
  },
  {
    id: 'h3',
    label: 'Heading 3',
    description: 'Small section heading',
    shortcut: '###',
    icon: Heading3,
    action: () => ({ replaceLines: ['### '], cursorLineOffset: 0, cursorCol: 4 }),
  },
  {
    id: 'bullet',
    label: 'Bullet List',
    description: 'Create a simple bulleted list',
    shortcut: '-',
    icon: List,
    action: () => ({ replaceLines: ['- '], cursorLineOffset: 0, cursorCol: 2 }),
  },
  {
    id: 'numbered',
    label: 'Numbered List',
    description: 'Create a numbered list',
    shortcut: '1.',
    icon: ListOrdered,
    action: () => ({ replaceLines: ['1. '], cursorLineOffset: 0, cursorCol: 3 }),
  },
  {
    id: 'callout-note',
    label: 'Callout (Note)',
    description: 'Obsidian-style highlighted callout box',
    shortcut: '> [!NOTE]',
    icon: Info,
    action: () => ({
      replaceLines: ['> [!NOTE] Key Insight', '> '],
      cursorLineOffset: 1,
      cursorCol: 2,
    }),
  },
  {
    id: 'callout-tip',
    label: 'Callout (Tip)',
    description: 'Helpful tip or reflection highlight',
    shortcut: '> [!TIP]',
    icon: Lightbulb,
    action: () => ({
      replaceLines: ['> [!TIP] Reflection Tip', '> '],
      cursorLineOffset: 1,
      cursorCol: 2,
    }),
  },
  {
    id: 'quote',
    label: 'Blockquote',
    description: 'Capture a quote or reflection thought',
    shortcut: '>',
    icon: Quote,
    action: () => ({ replaceLines: ['> '], cursorLineOffset: 0, cursorCol: 2 }),
  },
  {
    id: 'codeblock',
    label: 'Code Block',
    description: 'Fenced multi-line code snippet',
    shortcut: '```',
    icon: FileCode,
    action: () => ({
      replaceLines: ['```', '', '```'],
      cursorLineOffset: 1,
      cursorCol: 0,
    }),
  },
  {
    id: 'table',
    label: 'Table',
    description: 'Insert a 2-column Markdown table',
    shortcut: '| |',
    icon: TableIcon,
    action: () => ({
      replaceLines: [
        '| Topic | Notes |',
        '| :--- | :--- |',
        '|  |  |',
      ],
      cursorLineOffset: 2,
      cursorCol: 2,
    }),
  },
  {
    id: 'divider',
    label: 'Horizontal Divider',
    description: 'Visually divide sections',
    shortcut: '---',
    icon: Minus,
    action: () => ({
      replaceLines: ['---', ''],
      cursorLineOffset: 1,
      cursorCol: 0,
    }),
  },
  {
    id: 'timestamp',
    label: 'Current Timestamp',
    description: 'Insert current time badge',
    shortcut: 'Time',
    icon: Clock,
    action: () => {
      const ts = `**${format(new Date(), 'HH:mm')}** — `;
      return { replaceLines: [ts], cursorLineOffset: 0, cursorCol: ts.length };
    },
  },
];

/** Pre-process inline Obsidian extensions: ==highlight== and [[WikiLink]] */
const preprocessInlineMarkdown = (text: string): string => {
  // Convert ==highlight== to inline code with a sentinel prefix so ReactMarkdown renders it safely without raw HTML plugins
  let processed = text.replace(/==([^=\n]+)==/g, '`__HL__$1`');
  // Convert [[WikiLink]] to inline code with sentinel prefix
  processed = processed.replace(/\[\[([^\]\n]+)\]\]/g, '`__WIKI__$1`');
  return processed;
};

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = 'Write reflection in Markdown... (Type / for commands, click any line to edit)',
  className,
  autoFocus = false,
  minHeight = '180px',
  hideToolbar = false,
}) => {
  const { fontSize, _lineHeight } = useEditorTypography();
  const lineMultiplier = LINE_HEIGHT_MAP[_lineHeight];

  // Split document into lines
  const lines = useMemo(
    () => (value !== undefined && value !== null ? value.split('\n') : ['']),
    [value]
  );

  // Active editing line index (null when entire editor is blurred and fully rendered)
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(autoFocus ? 0 : null);
  const pendingCursorPosRef = useRef<number | null>(null);
  const pendingSelectionRangeRef = useRef<[number, number] | null>(null);

  /** True while the whole document is selected (second Ctrl+A). */
  const [docSelected, setDocSelected] = useState(false);
  /** Index of the multi-line block (fence / table / callout) currently being edited. */
  const [activeBlockStart, setActiveBlockStart] = useState<number | null>(null);

  // Slash command menu state
  const [slashQuery, setSlashQuery] = useState<string | null>(null);
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);

  // Copied code block feedback
  const [copiedBlockStart, setCopiedBlockStart] = useState<number | null>(null);

  /**
   * Group raw lines into renderable blocks:
   * - 'fence': multi-line ``` code blocks
   * - 'table': multi-line | ... | GFM tables
   * - 'callout': multi-line > [!NOTE] / > [!TIP] / > [!WARNING] / > [!IMPORTANT] callout blocks
   * - 'line': standard single-line live-preview item
   */
  const lineBlocks = useMemo(() => {
    type Block =
      | { kind: 'line'; index: number }
      | { kind: 'fence'; start: number; end: number; content: string; lang: string }
      | { kind: 'table'; start: number; end: number; content: string }
      | { kind: 'callout'; start: number; end: number; content: string; calloutType: string; calloutTitle: string; bodyLines: string[] };

    const out: Block[] = [];
    let i = 0;
    while (i < lines.length) {
      const current = lines[i] ?? '';

      // 1. Fenced code block
      const fenceMatch = current.match(/^\s*```(\S*)\s*$/);
      if (fenceMatch) {
        let j = i + 1;
        while (j < lines.length && !/^\s*```\s*$/.test(lines[j] ?? '')) j++;
        if (j < lines.length && j > i) {
          const end = j;
          out.push({
            kind: 'fence',
            start: i,
            end,
            content: lines.slice(i, end + 1).join('\n'),
            lang: fenceMatch[1] || '',
          });
          i = end + 1;
          continue;
        }
      }

      // 2. GFM Table (2+ consecutive pipe lines)
      if (/^\s*\|/.test(current)) {
        let j = i;
        while (j < lines.length && /^\s*\|/.test(lines[j] ?? '')) j++;
        if (j - i >= 2) {
          out.push({
            kind: 'table',
            start: i,
            end: j - 1,
            content: lines.slice(i, j).join('\n'),
          });
          i = j;
          continue;
        }
      }

      // 3. Obsidian Callout block (> [!NOTE] Title ...)
      const calloutMatch = current.match(/^\s*>\s*\[!([A-Za-z]+)\]\s*(.*)$/);
      if (calloutMatch) {
        let j = i + 1;
        while (j < lines.length && /^\s*>/.test(lines[j] ?? '')) j++;
        const end = j - 1;
        const bodyLines = lines.slice(i + 1, j).map(l => l.replace(/^\s*>\s?/, ''));
        out.push({
          kind: 'callout',
          start: i,
          end,
          content: lines.slice(i, j).join('\n'),
          calloutType: calloutMatch[1].toUpperCase(),
          calloutTitle: calloutMatch[2].trim() || calloutMatch[1].toUpperCase(),
          bodyLines,
        });
        i = j;
        continue;
      }

      out.push({ kind: 'line', index: i });
      i++;
    }
    return out;
  }, [lines]);

  /** Replace a whole block's source, keeping the rest of the document intact. */
  const replaceBlock = (start: number, end: number, nextContent: string) => {
    const updated = [...lines];
    updated.splice(start, end - start + 1, ...nextContent.split('\n'));
    return updated.join('\n');
  };

  const lastCtrlARef = useRef<{ line: number; time: number } | null>(null);
  const docSelectionRef = useRef<HTMLTextAreaElement>(null);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // References
  const activeInputRef = useRef<HTMLTextAreaElement>(null);
  const activeBlockInputRef = useRef<HTMLTextAreaElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
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
        if (
          undoStackRef.current.length === 0 ||
          undoStackRef.current[undoStackRef.current.length - 1] !== lastRecordedValueRef.current
        ) {
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

  // Filtered slash commands
  const filteredSlashCommands = useMemo(() => {
    if (slashQuery === null) return [];
    const q = slashQuery.toLowerCase().trim();
    if (!q) return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter(
      cmd =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.id.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q)
    );
  }, [slashQuery]);

  const applySlashCommand = useCallback(
    (cmd: SlashCommandItem) => {
      if (activeLineIndex === null) return;
      saveHistorySnapshot(value);
      const currentLine = lines[activeLineIndex] || '';
      const result = cmd.action(currentLine);
      const updated = [...lines];
      updated.splice(activeLineIndex, 1, ...result.replaceLines);
      onChange(updated.join('\n'));
      setSlashQuery(null);
      setSlashSelectedIndex(0);
      const nextLineIdx = activeLineIndex + result.cursorLineOffset;
      pendingCursorPosRef.current = result.cursorCol;
      setActiveLineIndex(nextLineIdx);
    },
    [activeLineIndex, lines, onChange, saveHistorySnapshot, value]
  );

  // Handle active line focus and cursor placement without interfering with typing
  useEffect(() => {
    if (activeLineIndex !== null && activeInputRef.current) {
      const el = activeInputRef.current;
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
      el.focus({ preventScroll: true });
      if (pendingSelectionRangeRef.current !== null) {
        const [s, e] = pendingSelectionRangeRef.current;
        pendingSelectionRangeRef.current = null;
        try {
          el.setSelectionRange(s, e);
        } catch {
          // Ignore range error
        }
      } else if (pendingCursorPosRef.current !== null) {
        const pos = pendingCursorPosRef.current;
        pendingCursorPosRef.current = null;
        try {
          el.setSelectionRange(pos, pos);
        } catch {
          // Ignore range error if unmounted
        }
      }
    }
  }, [activeLineIndex, lines.length]);

  // Check slash command state whenever activeLineIndex or current line changes
  useEffect(() => {
    if (activeLineIndex === null) {
      setSlashQuery(null);
      return;
    }
    const currentLine = lines[activeLineIndex] ?? '';
    const match = currentLine.match(/^\/([a-zA-Z0-9_-]*)$/);
    if (match) {
      setSlashQuery(match[1]);
      setSlashSelectedIndex(0);
    } else {
      setSlashQuery(null);
    }
  }, [activeLineIndex, lines]);

  // Handle single-line text update without disturbing native browser cursor
  const handleLineChange = (index: number, newText: string, textareaEl: HTMLTextAreaElement) => {
    // If multi-line text was inserted (e.g. via IME or mobile keyboard newline)
    if (newText.includes('\n')) {
      const splitNew = newText.split('\n');
      const updated = [...lines];
      updated.splice(index, 1, ...splitNew);
      onChange(updated.join('\n'));
      const nextLine = index + splitNew.length - 1;
      pendingCursorPosRef.current = (splitNew[splitNew.length - 1] || '').length;
      setActiveLineIndex(nextLine);
      return;
    }
    const updated = [...lines];
    updated[index] = newText;
    const newValue = updated.join('\n');
    onChange(newValue);
    textareaEl.style.height = 'auto';
    textareaEl.style.height = `${textareaEl.scrollHeight}px`;
  };

  // Toggle checklist checkbox item on single click without entering raw text mode
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

  // Selecting the overlay text gives real, visible selection for full-document Ctrl+A
  useEffect(() => {
    if (!docSelected) return;
    const el = docSelectionRef.current;
    const container = containerRef.current;
    if (!el) return;

    const scrollTop = container?.scrollTop ?? 0;
    el.focus({ preventScroll: true });
    el.select();
    if (container) container.scrollTop = scrollTop;
    el.scrollTop = scrollTop;
  }, [docSelected]);

  // Container-level keys while the whole document is selected
  useEffect(() => {
    if (!docSelected) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key;

      if (key === 'Escape') {
        e.preventDefault();
        setDocSelected(false);
        return;
      }

      if (key === 'ArrowUp' || key === 'ArrowLeft') {
        e.preventDefault();
        setDocSelected(false);
        pendingCursorPosRef.current = 0;
        setActiveLineIndex(0);
        return;
      }

      if (key === 'ArrowDown' || key === 'ArrowRight') {
        e.preventDefault();
        setDocSelected(false);
        const lastIdx = Math.max(0, lines.length - 1);
        pendingCursorPosRef.current = (lines[lastIdx] || '').length;
        setActiveLineIndex(lastIdx);
        return;
      }

      if (key === 'Backspace' || key === 'Delete') {
        e.preventDefault();
        saveHistorySnapshot(value);
        onChange('');
        setDocSelected(false);
        pendingCursorPosRef.current = 0;
        setActiveLineIndex(0);
        return;
      }

      if (key === 'Enter') {
        e.preventDefault();
        saveHistorySnapshot(value);
        onChange('');
        setDocSelected(false);
        pendingCursorPosRef.current = 0;
        setActiveLineIndex(0);
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        const lower = key.toLowerCase();
        if (lower === 'x') {
          // Cut: let browser copy to clipboard first, then clear document
          setTimeout(() => {
            saveHistorySnapshot(value);
            onChange('');
            setDocSelected(false);
            pendingCursorPosRef.current = 0;
            setActiveLineIndex(0);
          }, 0);
        } else if (lower === 'z') {
          e.preventDefault();
          setDocSelected(false);
          if (e.shiftKey) handleRedo();
          else handleUndo();
        } else if (lower === 'y') {
          e.preventDefault();
          setDocSelected(false);
          handleRedo();
        }
        return;
      }

      // Typing a printable character replaces the whole document and continues editing on line 0
      if (key.length === 1 && !e.altKey) {
        e.preventDefault();
        saveHistorySnapshot(value);
        onChange(key);
        setDocSelected(false);
        pendingCursorPosRef.current = 1;
        setActiveLineIndex(0);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [docSelected, value, lines, onChange, saveHistorySnapshot, handleUndo, handleRedo]);

  // Handle paste while whole document is selected
  const handleDocSelectionPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').replace(/\r\n/g, '\n');
    saveHistorySnapshot(value);
    onChange(pastedText);
    setDocSelected(false);
    const pastedLines = pastedText.split('\n');
    const lastIdx = Math.max(0, pastedLines.length - 1);
    pendingCursorPosRef.current = (pastedLines[lastIdx] || '').length;
    setActiveLineIndex(lastIdx);
  };

  // Keyboard navigation & smart list typing in active line
  const handleLineKeyDown = (index: number, e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = activeInputRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentLine = lines[index] || '';

    // Slash command menu keyboard navigation
    if (slashQuery !== null && filteredSlashCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashSelectedIndex((prev) => (prev + 1) % filteredSlashCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashSelectedIndex((prev) => (prev - 1 + filteredSlashCommands.length) % filteredSlashCommands.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const chosen = filteredSlashCommands[slashSelectedIndex] || filteredSlashCommands[0];
        if (chosen) applySlashCommand(chosen);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSlashQuery(null);
        return;
      }
    }

    // Two-stage Ctrl+A:
    // Stage 1: Select all text in the current line (if not already fully selected).
    // Stage 2: If current line is already fully selected (or empty, or repeated Ctrl+A within 1.5s), select the ENTIRE document!
    if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      const lineFullySelected =
        (start === 0 && end === currentLine.length && currentLine.length > 0) ||
        currentLine.length === 0;
      const last = lastCtrlARef.current;
      const repeated =
        lineFullySelected ||
        (!!last && last.line === index && Date.now() - last.time < 1500);

      if (repeated && value.length > 0) {
        setDocSelected(true);
        setActiveLineIndex(null);
        setActiveBlockStart(null);
        lastCtrlARef.current = null;
      } else {
        textarea.setSelectionRange(0, currentLine.length);
        lastCtrlARef.current = { line: index, time: Date.now() };
      }
      return;
    }

    // Auto-pair wrapping when user has selected text and types *, `, ~, =, [, (
    if (start !== end && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const pairs: Record<string, [string, string]> = {
        '*': ['*', '*'],
        '`': ['`', '`'],
        '~': ['~~', '~~'],
        '=': ['==', '=='],
        '[': ['[', ']'],
        '(': ['(', ')'],
        '"': ['"', '"'],
      };
      if (pairs[e.key]) {
        e.preventDefault();
        const [open, close] = pairs[e.key];
        saveHistorySnapshot(value);
        const selected = currentLine.substring(start, end);
        const newLine = currentLine.substring(0, start) + open + selected + close + currentLine.substring(end);
        const updated = [...lines];
        updated[index] = newLine;
        onChange(updated.join('\n'));
        pendingSelectionRangeRef.current = [start + open.length, end + open.length];
        setTimeout(() => {
          if (activeInputRef.current) {
            activeInputRef.current.setSelectionRange(start + open.length, end + open.length);
          }
        }, 0);
        return;
      }
    }

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
      if (e.shiftKey && key === 'h') {
        e.preventDefault();
        applyWrapToActiveLine('==', '==', 'highlighted text');
        return;
      }
      if (key === '`') {
        e.preventDefault();
        applyWrapToActiveLine('`', '`', 'code');
        return;
      }
    }

    // Up Arrow at top of line -> Move to previous line or block
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

    // Down Arrow at bottom of line -> Move to next line or block
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

    // Tab / Shift+Tab for Indent & Sub-lists
    if (e.key === 'Tab') {
      e.preventDefault();
      saveHistorySnapshot(value);

      const isListItem = /^\s*([-*+]\s+(\[[ xX]?\]\s*)?|\d+\.\s+|> )/.test(currentLine);

      if (e.shiftKey) {
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
        if (isListItem || start === 0) {
          const updated = '  ' + currentLine;
          handleLineChange(index, updated, textarea);
          const newStart = start + 2;
          const newEnd = end + 2;
          setTimeout(() => textarea.setSelectionRange(newStart, newEnd), 0);
        } else {
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

      // 0. Opening code fence ``` -> auto-close fence block
      const fenceStartMatch = currentLine.match(/^(\s*)```(\S*)$/);
      if (fenceStartMatch && afterCursor.length === 0) {
        const indent = fenceStartMatch[1];
        const updated = [...lines];
        updated.splice(index + 1, 0, '', `${indent}\`\`\``);
        onChange(updated.join('\n'));
        setActiveLineIndex(null);
        setActiveBlockStart(index);
        return;
      }

      // 1. Task checklist "- [ ] " or "- [x] "
      const taskMatch = beforeCursor.match(/^(\s*)([-*+]\s+\[([ xX]?)\]\s*)(.*)$/);
      if (taskMatch) {
        const indent = taskMatch[1];
        const content = taskMatch[4];
        if (content.trim().length === 0 && afterCursor.trim().length === 0) {
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

    // Backspace at column 0 -> merge into the end of the previous line
    if (e.key === 'Backspace' && start === 0 && end === 0 && index > 0) {
      e.preventDefault();
      saveHistorySnapshot(value);
      const prevLine = lines[index - 1] || '';
      const mergedLine = prevLine + currentLine;
      const updated = [...lines];
      updated[index - 1] = mergedLine;
      updated.splice(index, 1);
      onChange(updated.join('\n'));
      pendingCursorPosRef.current = prevLine.length;
      setActiveLineIndex(index - 1);
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

    // Escape -> exit active editing, render all lines as live preview
    if (e.key === 'Escape') {
      e.preventDefault();
      setSlashQuery(null);
      setActiveLineIndex(null);
      return;
    }
  };

  // Multi-line block (fence / table / callout) keyboard handling
  const handleBlockKeyDown = (
    blockStart: number,
    blockEnd: number,
    blockContent: string,
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    const textarea = activeBlockInputRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // Two-stage Ctrl+A inside a multi-line block:
    // 1st Ctrl+A selects the entire block; 2nd Ctrl+A selects the entire document!
    if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      const blockFullySelected = start === 0 && end === blockContent.length && blockContent.length > 0;
      const last = lastCtrlARef.current;
      const repeated =
        blockFullySelected ||
        (!!last && last.line === blockStart && Date.now() - last.time < 1500);

      if (repeated && value.length > 0) {
        setDocSelected(true);
        setActiveBlockStart(null);
        setActiveLineIndex(null);
        lastCtrlARef.current = null;
      } else {
        textarea.setSelectionRange(0, blockContent.length);
        lastCtrlARef.current = { line: blockStart, time: Date.now() };
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setActiveBlockStart(null);
      return;
    }

    // Tab inside code block inserts 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      saveHistorySnapshot(value);
      const next = blockContent.substring(0, start) + '  ' + blockContent.substring(end);
      onChange(replaceBlock(blockStart, blockEnd, next));
      setTimeout(() => {
        textarea.setSelectionRange(start + 2, start + 2);
      }, 0);
      return;
    }

    // ArrowUp at very start of block moves to previous line
    if (e.key === 'ArrowUp' && start === 0 && end === 0 && blockStart > 0) {
      e.preventDefault();
      setActiveBlockStart(null);
      pendingCursorPosRef.current = (lines[blockStart - 1] || '').length;
      setActiveLineIndex(blockStart - 1);
      return;
    }

    // ArrowDown at very end of block moves to next line (or creates one if at end of doc)
    if (e.key === 'ArrowDown' && start === blockContent.length && end === blockContent.length) {
      e.preventDefault();
      setActiveBlockStart(null);
      if (blockEnd < lines.length - 1) {
        pendingCursorPosRef.current = 0;
        setActiveLineIndex(blockEnd + 1);
      } else {
        saveHistorySnapshot(value);
        const updated = [...lines, ''];
        onChange(updated.join('\n'));
        pendingCursorPosRef.current = 0;
        setActiveLineIndex(updated.length - 1);
      }
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
      saveHistorySnapshot(value);
      const updated = [...lines];
      updated[idx] = newLine;
      onChange(updated.join('\n'));
      pendingSelectionRangeRef.current = [
        line.length + prefix.length,
        line.length + prefix.length + defaultText.length,
      ];
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

  // Insert a multi-line block snippet at active line
  const insertMultiLineBlock = (blockLines: string[], focusBlock: boolean = true) => {
    const idx = activeLineIndex !== null ? activeLineIndex : (lines.length ? lines.length - 1 : 0);
    const currentLine = lines[idx] || '';
    saveHistorySnapshot(value);
    const updated = [...lines];
    if (currentLine.trim().length === 0) {
      updated.splice(idx, 1, ...blockLines, '');
      onChange(updated.join('\n'));
      if (focusBlock) {
        setActiveLineIndex(null);
        setActiveBlockStart(idx);
      } else {
        pendingCursorPosRef.current = 0;
        setActiveLineIndex(idx + blockLines.length);
      }
    } else {
      updated.splice(idx + 1, 0, ...blockLines, '');
      onChange(updated.join('\n'));
      if (focusBlock) {
        setActiveLineIndex(null);
        setActiveBlockStart(idx + 1);
      } else {
        pendingCursorPosRef.current = 0;
        setActiveLineIndex(idx + 1 + blockLines.length);
      }
    }
  };

  // Insert timestamp at cursor
  const insertTimestamp = () => {
    const ts = `**${format(new Date(), 'HH:mm')}** `;
    const idx = activeLineIndex !== null ? activeLineIndex : (lines.length ? lines.length - 1 : 0);
    const line = lines[idx] || '';
    const textarea = activeInputRef.current;
    const pos = activeLineIndex !== null && textarea ? textarea.selectionStart : line.length;
    saveHistorySnapshot(value);
    const newLine = line.substring(0, pos) + ts + line.substring(pos);
    const updated = [...lines];
    updated[idx] = newLine;
    onChange(updated.join('\n'));
    pendingCursorPosRef.current = pos + ts.length;
    setActiveLineIndex(idx);
  };

  // Click on empty space below lines
  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      const lastIndex = Math.max(0, lines.length - 1);
      pendingCursorPosRef.current = (lines[lastIndex] || '').length;
      setActiveBlockStart(null);
      setActiveLineIndex(lastIndex);
    }
  };

  // Estimate cursor position on single click of a rendered line
  const handleRenderedLineClick = (index: number, line: string, e: React.MouseEvent<HTMLDivElement>) => {
    // If user dragged to select text, don't collapse their selection if they selected multiple chars
    const sel = window.getSelection();
    if (sel && sel.toString().length > 1) {
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = Math.max(0, e.clientX - rect.left);
    const approxCharWidth = fontSize * 0.56;
    const estimatedChars = Math.round(clickX / approxCharWidth);
    // Account for leading markdown syntax characters (like "## ", "- [ ] ", etc.)
    const syntaxPrefixMatch = line.match(/^(\s*(?:#{1,6}\s+|[-*+]\s+\[[ xX]?\]\s+|[-*+]\s+|\d+\.\s+|>\s+))/);
    const prefixLen = syntaxPrefixMatch ? syntaxPrefixMatch[1].length : 0;
    const targetPos = Math.min(line.length, prefixLen + estimatedChars);

    pendingCursorPosRef.current = targetPos;
    setActiveBlockStart(null);
    setActiveLineIndex(index);
  };

  const renderCalloutVisual = (calloutType: string, calloutTitle: string, bodyLines: string[]) => {
    const type = calloutType.toUpperCase();
    const styles: Record<string, { border: string; bg: string; titleColor: string; Icon: any }> = {
      NOTE: { border: 'border-indigo-500/50', bg: 'bg-indigo-500/10', titleColor: 'text-indigo-300', Icon: Info },
      INFO: { border: 'border-sky-500/50', bg: 'bg-sky-500/10', titleColor: 'text-sky-300', Icon: Info },
      TIP: { border: 'border-amber-500/50', bg: 'bg-amber-500/10', titleColor: 'text-amber-300', Icon: Lightbulb },
      IMPORTANT: { border: 'border-purple-500/50', bg: 'bg-purple-500/10', titleColor: 'text-purple-300', Icon: Sparkles },
      WARNING: { border: 'border-orange-500/50', bg: 'bg-orange-500/10', titleColor: 'text-orange-300', Icon: AlertTriangle },
      CAUTION: { border: 'border-rose-500/50', bg: 'bg-rose-500/10', titleColor: 'text-rose-300', Icon: AlertCircle },
    };
    const theme = styles[type] || styles.NOTE;
    const IconComp = theme.Icon;

    return (
      <div className={cn('rounded-xl border-l-4 border px-3.5 py-2.5 my-1', theme.border, theme.bg)}>
        <div className={cn('flex items-center gap-2 font-bold text-xs uppercase tracking-wider mb-1', theme.titleColor)}>
          <IconComp size={14} className="shrink-0" />
          <span>{calloutTitle}</span>
        </div>
        {bodyLines.length > 0 && (
          <div className="text-slate-200 text-sm space-y-1">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
              {bodyLines.join('\n')}
            </ReactMarkdown>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={wrapperRef}
      className={cn(
        'flex flex-col bg-slate-900/60 rounded-xl border border-slate-800/80 overflow-hidden focus-within:border-indigo-500/50 transition-all',
        className
      )}
    >
      {/* Top Toolbar — pure Live Preview WYSIWYG controls */}
      {!hideToolbar && (
        <div
          onMouseDown={(e) => {
            // Prevent blurring the active line textarea when clicking toolbar buttons
            if ((e.target as HTMLElement).closest('button')) {
              e.preventDefault();
            }
          }}
          className="flex flex-wrap items-center justify-between gap-1 px-2.5 py-1.5 bg-slate-950/70 border-b border-slate-800/80 select-none text-slate-400 shrink-0"
        >
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
            <button
              type="button"
              onClick={() => applyWrapToActiveLine('==', '==', 'highlight')}
              className="p-1 hover:text-amber-300 hover:bg-slate-800/80 rounded transition-colors"
              title="Highlight (==text== / Ctrl+Shift+H)"
            >
              <Highlighter size={13} />
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

            {/* Lists, Quotes, Blocks */}
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
              onClick={() => insertMultiLineBlock(['> [!NOTE] Note', '> Write key insight here...'])}
              className="p-1 hover:text-indigo-300 hover:bg-slate-800/80 rounded transition-colors"
              title="Insert Obsidian Callout (> [!NOTE])"
            >
              <Sparkles size={13} />
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
              onClick={() => insertMultiLineBlock(['```', '// code snippet', '```'])}
              className="p-1 hover:text-slate-100 hover:bg-slate-800/80 rounded transition-colors"
              title="Insert Code Block (```)"
            >
              <FileCode size={13} />
            </button>
            <button
              type="button"
              onClick={() =>
                insertMultiLineBlock([
                  '| Column 1 | Column 2 |',
                  '| :--- | :--- |',
                  '| Value 1 | Value 2 |',
                ])
              }
              className="p-1 hover:text-slate-100 hover:bg-slate-800/80 rounded transition-colors"
              title="Insert Table"
            >
              <TableIcon size={13} />
            </button>
            <button
              type="button"
              onClick={() => applyWrapToActiveLine('[', '](https://)', 'link title')}
              className="p-1 hover:text-slate-100 hover:bg-slate-800/80 rounded transition-colors"
              title="Insert Link (Ctrl+K)"
            >
              <LinkIcon size={13} />
            </button>
            <button
              type="button"
              onClick={insertTimestamp}
              className="p-1 hover:text-indigo-300 hover:bg-slate-800/80 rounded transition-colors"
              title="Insert Current Time"
            >
              <Clock size={13} />
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

      {/* Main Document Content Area with Single-Click In-Place Markdown Rendering */}
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
        {docSelected && (
          <textarea
            ref={docSelectionRef}
            value={value}
            readOnly
            spellCheck={false}
            onBlur={() => setDocSelected(false)}
            onPaste={handleDocSelectionPaste}
            className="absolute inset-0 w-full h-full p-3 sm:p-4 bg-slate-900/95 text-slate-100 resize-none outline-none custom-scrollbar z-20 selection:bg-indigo-500/40 selection:text-white"
            style={{ fontSize: `${fontSize}px`, lineHeight: lineMultiplier }}
          />
        )}

        {lineBlocks.map((block) => {
          /* ---- Multi-line block: code fence, table, or callout ---- */
          if (block.kind !== 'line') {
            const isEditingBlock = activeBlockStart === block.start;

            if (isEditingBlock) {
              return (
                <div key={`block-${block.start}`} className="relative w-full py-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-indigo-400 bg-slate-950/90 px-2.5 py-1 rounded-t-lg border border-b-0 border-indigo-500/40">
                    <span>
                      Editing {block.kind === 'fence' ? `Code Block (${block.lang || 'text'})` : block.kind === 'table' ? 'Markdown Table' : `Callout [!${block.calloutType}]`}
                    </span>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setActiveBlockStart(null);
                      }}
                      className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800/80"
                    >
                      Done (Esc)
                    </button>
                  </div>
                  <textarea
                    ref={activeBlockInputRef}
                    value={block.content}
                    onChange={(e) => {
                      saveHistorySnapshot(value);
                      onChange(replaceBlock(block.start, block.end, e.target.value));
                    }}
                    onKeyDown={(e) => handleBlockKeyDown(block.start, block.end, block.content, e)}
                    onBlur={() => setActiveBlockStart(null)}
                    rows={Math.max(block.content.split('\n').length, 2)}
                    style={{ fontSize: `${Math.max(12, fontSize - 1)}px`, lineHeight: lineMultiplier }}
                    className="w-full block bg-slate-950/80 border border-indigo-500/40 rounded-b-lg outline-none p-2.5 text-slate-100 resize-y font-mono selection:bg-indigo-500/40"
                    spellCheck={false}
                    autoFocus
                  />
                </div>
              );
            }

            if (block.kind === 'callout') {
              return (
                <div
                  key={`block-${block.start}`}
                  onClick={() => {
                    setActiveLineIndex(null);
                    setActiveBlockStart(block.start);
                  }}
                  className="relative w-full py-0.5 cursor-text rounded-xl hover:ring-1 hover:ring-indigo-500/40 transition-all select-text"
                  title="Click to edit callout block"
                >
                  {renderCalloutVisual(block.calloutType, block.calloutTitle, block.bodyLines)}
                </div>
              );
            }

            if (block.kind === 'fence') {
              const codeInner = block.content
                .replace(/^\s*```\S*\n?/, '')
                .replace(/\n?\s*```\s*$/, '');
              return (
                <div
                  key={`block-${block.start}`}
                  onClick={() => {
                    setActiveLineIndex(null);
                    setActiveBlockStart(block.start);
                  }}
                  className="relative w-full my-1.5 rounded-xl bg-slate-950/90 border border-slate-800/90 hover:border-indigo-500/40 transition-all cursor-text group overflow-hidden"
                  title="Click to edit code block"
                >
                  <div className="flex items-center justify-between px-3 py-1 bg-slate-900/80 border-b border-slate-800/80 text-[10px] font-mono text-slate-400">
                    <span className="uppercase tracking-wider text-indigo-400/90 font-bold">
                      {block.lang || 'code'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(codeInner);
                        setCopiedBlockStart(block.start);
                        setTimeout(() => setCopiedBlockStart(null), 1500);
                      }}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Copy code"
                    >
                      {copiedBlockStart === block.start ? (
                        <>
                          <Check size={10} className="text-indigo-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={10} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3 m-0 overflow-x-auto font-mono text-xs sm:text-sm text-slate-200 leading-relaxed">
                    <code>{codeInner || ' '}</code>
                  </pre>
                </div>
              );
            }

            // Table block
            return (
              <div
                key={`block-${block.start}`}
                onClick={() => {
                  setActiveLineIndex(null);
                  setActiveBlockStart(block.start);
                }}
                className="relative w-full my-1.5 cursor-text rounded-xl hover:ring-1 hover:ring-indigo-500/40 transition-all select-text overflow-x-auto"
                title="Click to edit table"
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  components={{
                    table: ({ node, ...props }) => (
                      <table className="w-full border-collapse text-left text-xs sm:text-sm rounded-lg overflow-hidden border border-slate-800" {...props} />
                    ),
                    thead: ({ node, ...props }) => (
                      <thead className="bg-slate-950/90 text-slate-200 border-b border-slate-800" {...props} />
                    ),
                    th: ({ node, ...props }) => (
                      <th className="px-3 py-2 font-bold border border-slate-800/90 text-indigo-300" {...props} />
                    ),
                    td: ({ node, ...props }) => (
                      <td className="px-3 py-1.5 border border-slate-800/70 text-slate-300 bg-slate-900/40" {...props} />
                    ),
                  }}
                >
                  {block.content}
                </ReactMarkdown>
              </div>
            );
          }

          /* ---- Single-line live preview ---- */
          const index = block.index;
          const line = lines[index] ?? '';
          const isActive = activeLineIndex === index;

          if (isActive) {
            return (
              <div key={index} className="relative w-full py-0.5 font-sans">
                <textarea
                  ref={activeInputRef}
                  value={line}
                  onChange={(e) => handleLineChange(index, e.target.value, e.target)}
                  onKeyDown={(e) => handleLineKeyDown(index, e)}
                  onPaste={(e) => handleLinePaste(index, e)}
                  onBlur={(e) => {
                    // If focus moved outside this editor wrapper, return line to rendered Markdown preview
                    const nextFocused = e.relatedTarget as HTMLElement | null;
                    if (!nextFocused || !wrapperRef.current?.contains(nextFocused)) {
                      setSlashQuery(null);
                      setActiveLineIndex(null);
                    }
                  }}
                  rows={1}
                  placeholder={index === 0 && lines.length === 1 ? placeholder : ''}
                  style={{
                    fontSize: `${fontSize}px`,
                    lineHeight: lineMultiplier,
                  }}
                  className="w-full block bg-indigo-500/[0.04] rounded px-1 -mx-1 border-0 outline-none ring-0 shadow-none p-0 m-0 text-slate-100 placeholder:text-slate-500 resize-none font-sans font-normal overflow-hidden focus:ring-0 focus:outline-none focus:border-0 selection:bg-indigo-500/40 selection:text-white"
                  spellCheck={false}
                  autoFocus
                />

                {/* Slash Command Popup Menu */}
                {slashQuery !== null && filteredSlashCommands.length > 0 && (
                  <div
                    onMouseDown={(e) => e.preventDefault()}
                    className="absolute left-0 top-full mt-1 z-50 w-72 max-h-64 overflow-y-auto custom-scrollbar bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl p-1.5 space-y-0.5"
                  >
                    <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between border-b border-slate-800/80 mb-1">
                      <span>Slash Commands</span>
                      <span className="text-indigo-400">↑↓ Enter</span>
                    </div>
                    {filteredSlashCommands.map((cmd, cmdIdx) => {
                      const Icon = cmd.icon;
                      const isSel = cmdIdx === slashSelectedIndex;
                      return (
                        <button
                          key={cmd.id}
                          type="button"
                          onClick={() => applySlashCommand(cmd)}
                          onMouseEnter={() => setSlashSelectedIndex(cmdIdx)}
                          className={cn(
                            'w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between gap-2 transition-colors text-xs',
                            isSel
                              ? 'bg-indigo-600/25 text-indigo-200 border border-indigo-500/40'
                              : 'text-slate-300 hover:bg-slate-800/70 border border-transparent'
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={cn('p-1 rounded-md bg-slate-800 text-indigo-400 shrink-0', isSel && 'bg-indigo-500/20 text-indigo-300')}>
                              <Icon size={13} />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold truncate leading-tight">{cmd.label}</div>
                              <div className="text-[10px] text-slate-400 truncate">{cmd.description}</div>
                            </div>
                          </div>
                          {cmd.shortcut && (
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-950/70 px-1.5 py-0.5 rounded border border-slate-800 shrink-0">
                              {cmd.shortcut}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // Non-active line: Render Markdown in-place (Single-click enters edit mode)
          const isBlank = line.trim().length === 0;
          const showEmptyDocPlaceholder = index === 0 && lines.length === 1 && isBlank;

          return (
            <div
              key={index}
              onClick={(e) => handleRenderedLineClick(index, line, e)}
              className="relative w-full py-0.5 cursor-text text-slate-200 hover:text-slate-100 hover:bg-slate-800/20 rounded px-1 -mx-1 transition-colors select-text"
            >
              {showEmptyDocPlaceholder ? (
                <div
                  className="w-full text-slate-500 select-none pointer-events-none"
                  style={{ minHeight: `${Math.round(fontSize * lineMultiplier)}px` }}
                >
                  {placeholder}
                </div>
              ) : isBlank ? (
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
                      p: ({ node, ...props }) => <p className="m-0 leading-normal" {...props} />,
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
                              'space-y-0 my-0 list-inside',
                              isSub ? 'list-[circle] pl-5 text-slate-300' : 'list-disc pl-1 text-slate-200'
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
                              'space-y-0 my-0 list-inside',
                              isSub ? 'list-[lower-alpha] pl-5 text-slate-300' : 'list-decimal pl-1 text-slate-200'
                            )}
                            {...props}
                          />
                        );
                      },
                      li: ({ node, ...props }: any) => {
                        const checked = props.checked;
                        if (checked !== null && checked !== undefined) {
                          const leadingSpaces = line.match(/^(\s*)/)?.[1].length || 0;
                          const isSub = leadingSpaces >= 2;
                          return (
                            <li
                              className={cn('list-none flex items-center gap-2 my-0 leading-normal', isSub && 'pl-5')}
                              {...props}
                            >
                              <button
                                type="button"
                                onClick={(e) => toggleCheckbox(index, e)}
                                className={cn(
                                  'w-4 h-4 rounded flex items-center justify-center border transition-all text-xs shrink-0 cursor-pointer',
                                  checked
                                    ? 'bg-indigo-600 border-indigo-500 text-white'
                                    : 'border-slate-600 bg-slate-800/50 hover:border-indigo-400'
                                )}
                              >
                                {checked && '✓'}
                              </button>
                              <span className={cn(checked ? 'line-through text-slate-400' : 'text-slate-200')}>
                                {props.children}
                              </span>
                            </li>
                          );
                        }
                        return (
                          <li className="my-0 leading-normal" {...props}>
                            {props.children}
                          </li>
                        );
                      },
                      strong: ({ node, ...props }) => <strong className="font-bold text-slate-100" {...props} />,
                      em: ({ node, ...props }) => <em className="italic text-slate-300 pr-1" {...props} />,
                      del: ({ node, ...props }) => <del className="line-through text-slate-400" {...props} />,
                      blockquote: ({ node, ...props }) => (
                        <blockquote
                          className="border-l-2 border-indigo-500/60 pl-3 my-0.5 text-slate-300 italic pr-1 font-serif bg-indigo-500/[0.03] py-0.5 rounded-r"
                          {...props}
                        />
                      ),
                      code: ({ node, className, children, ...props }) => {
                        const textVal = String(children);
                        if (textVal.startsWith('__HL__')) {
                          return (
                            <mark className="bg-amber-500/25 text-amber-200 px-1 py-0.5 rounded border border-amber-500/30 font-sans">
                              {textVal.slice(6)}
                            </mark>
                          );
                        }
                        if (textVal.startsWith('__WIKI__')) {
                          return (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-medium text-[0.92em]">
                              [[{textVal.slice(8)}]]
                            </span>
                          );
                        }
                        return (
                          <code
                            className="px-1.5 py-0.5 rounded bg-slate-800/90 text-indigo-300 font-mono text-[0.9em] border border-slate-700/60"
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      },
                      hr: ({ node, ...props }) => <hr className="my-2.5 border-slate-800" {...props} />,
                      a: ({ node, ...props }) => (
                        <a
                          className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          {...props}
                        />
                      ),
                    }}
                  >
                    {preprocessInlineMarkdown(line)}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Shortcuts Modal (rendered on document.body via Portal) */}
      {showShortcutsModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[10050] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl text-slate-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Keyboard size={18} className="text-indigo-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Obsidian Live Markdown Shortcuts</h3>
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
                    <div className="font-bold text-indigo-400">Inline & Selection</div>
                    <div><span className="text-amber-400">Ctrl + A (×1)</span> : Select Line</div>
                    <div><span className="text-amber-400">Ctrl + A (×2)</span> : Select All Doc</div>
                    <div><span className="text-amber-400">Ctrl + B / I</span> : **Bold** / *Italic*</div>
                    <div><span className="text-amber-400">Ctrl + Shift + H</span> : ==Highlight==</div>
                    <div><span className="text-amber-400">Ctrl + K</span> : [Link](url)</div>
                    <div><span className="text-amber-400">Type /</span> : Slash Command Menu</div>
                  </div>

                  <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800 space-y-1">
                    <div className="font-bold text-indigo-400">Lists & Blocks</div>
                    <div><span className="text-amber-400">&gt; [!NOTE]</span> : Callout Block</div>
                    <div><span className="text-amber-400">```</span> : Code Fence Block</div>
                    <div><span className="text-amber-400">Tab / Shift+Tab</span> : Indent / Outdent</div>
                    <div><span className="text-amber-400">Enter</span> : Continue List / Quote</div>
                    <div><span className="text-amber-400">↑ / ↓</span> : Cross-line Nav</div>
                    <div><span className="text-amber-400">Esc</span> : Render Live Preview</div>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800 space-y-1.5">
                  <div className="font-bold text-indigo-400">Single-Click WYSIWYG Live Preview</div>
                  <div className="text-slate-400 leading-relaxed font-sans">
                    Click any line or block to edit its Markdown source directly in place. Select text and press <code className="text-amber-300">*</code>, <code className="text-amber-300">`</code>, <code className="text-amber-300">=</code>, or <code className="text-amber-300">[</code> to wrap automatically.
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
