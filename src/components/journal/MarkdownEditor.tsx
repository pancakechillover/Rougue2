import React, { useEffect, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import { cn } from '../../lib/utils';

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = 'Write here...',
  className,
  autoFocus = false
}) => {
  const isInternalChange = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
      Markdown,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      isInternalChange.current = true;
      const md = (editor.storage as any).markdown?.getMarkdown?.() || "";
      onChange(md);
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-invert max-w-none text-slate-200 prose-p:text-slate-200 prose-headings:text-slate-100 prose-strong:text-indigo-400 prose-li:text-slate-200 prose-ol:text-slate-200 prose-ul:text-slate-200 marker:text-slate-200 marker:font-bold prose-blockquote:border-indigo-500/60 prose-blockquote:text-slate-300 prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-800 focus:outline-none min-h-full",
          className
        ),
      }
    }
  });

  // Sync external changes
  useEffect(() => {
    if (editor && value !== (editor.storage as any).markdown?.getMarkdown?.()) {
      if (isInternalChange.current) {
        isInternalChange.current = false;
        return;
      }
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  useEffect(() => {
    if (autoFocus && editor) {
      setTimeout(() => editor.commands.focus('end'), 100);
    }
  }, [autoFocus, editor]);

  return <EditorContent editor={editor} className="h-full min-h-full flex-1 w-full" />;
};
