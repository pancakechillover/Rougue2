import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Minimize2, Bold, Italic, Underline, 
  List, Heading1, Heading2, Heading3, Code, Quote, Link as LinkIcon, Download, Upload
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/utils';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';

export interface ImmersiveReflectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateString: string;
  reflection: string;
  setReflection: (val: string) => void;
  isMarkdownEnabled?: boolean;
  setIsMarkdownEnabled?: (val: boolean) => void;
  renderTemplateControls?: () => React.ReactNode;
}

export const ImmersiveReflectionModal: React.FC<ImmersiveReflectionModalProps> = ({
  isOpen,
  onClose,
  dateString,
  reflection,
  setReflection,
  renderTemplateControls
}) => {

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Write your reflection... (Markdown shortcuts supported, e.g. # Heading, **bold**)' }),
      Markdown,
    ],
    content: reflection,
    onUpdate: ({ editor }) => {
      const md = (editor.storage as any).markdown?.getMarkdown?.() || "";
      setReflection(md);
    },
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none text-slate-200 prose-p:text-slate-200 prose-headings:text-slate-100 prose-strong:text-indigo-400 prose-li:text-slate-200 prose-ol:text-slate-200 prose-ul:text-slate-200 marker:text-slate-200 marker:font-bold prose-blockquote:border-indigo-500/60 prose-blockquote:text-slate-300 prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-800 focus:outline-none min-h-full",
      }
    }
  });

  // Sync external changes
  useEffect(() => {
    if (editor && isOpen) {
      const currentMd = (editor.storage as any).markdown?.getMarkdown?.() || "";
      if (reflection !== currentMd) {
        editor.commands.setContent(reflection);
      }
    }
  }, [reflection, isOpen, editor]);

  // Focus when opened
  useEffect(() => {
    if (isOpen && editor) {
      setTimeout(() => editor.commands.focus('end'), 100);
    }
  }, [isOpen, editor]);

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
          <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/70 backdrop-blur-sm relative">
            <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto custom-scrollbar pr-2">
              <div className="flex items-center gap-2 shrink-0">
                <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest italic pr-1">Reflection</h3>
                <span className="hidden sm:inline-block text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 tracking-wider">
                  {dateString}
                </span>
              </div>
              
              {/* WYSIWYG Toolbar */}
              <div className="flex items-center gap-0.5 border-l border-slate-700/80 pl-2 sm:pl-3 shrink-0">
                <button 
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  className={cn("p-1.5 rounded-lg transition-colors", editor?.isActive('bold') ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800")}
                  title="Bold (Ctrl/Cmd + B)"
                >
                  <Bold size={15} />
                </button>
                <button 
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className={cn("p-1.5 rounded-lg transition-colors", editor?.isActive('italic') ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800")}
                  title="Italic (Ctrl/Cmd + I)"
                >
                  <Italic size={15} />
                </button>
                <div className="hidden md:flex items-center gap-0.5 border-l border-slate-800 pl-1 ml-1">
                  <button 
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={cn("p-1.5 rounded-lg transition-colors text-xs font-bold font-mono", editor?.isActive('heading', { level: 1 }) ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800")}
                    title="Heading 1 (#)"
                  >
                    H1
                  </button>
                  <button 
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={cn("p-1.5 rounded-lg transition-colors text-xs font-bold font-mono", editor?.isActive('heading', { level: 2 }) ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800")}
                    title="Heading 2 (##)"
                  >
                    H2
                  </button>
                  <button 
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={cn("p-1.5 rounded-lg transition-colors text-xs font-bold font-mono", editor?.isActive('heading', { level: 3 }) ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800")}
                    title="Heading 3 (###)"
                  >
                    H3
                  </button>
                </div>
                <div className="flex items-center gap-0.5 border-l border-slate-800 pl-1 ml-1">
                  <button 
                    onClick={() => editor?.chain().focus().toggleBulletList().run()}
                    className={cn("p-1.5 rounded-lg transition-colors", editor?.isActive('bulletList') ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800")}
                    title="Bullet List (- item)"
                  >
                    <List size={15} />
                  </button>
                  <button 
                    onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                    className={cn("p-1.5 rounded-lg transition-colors", editor?.isActive('blockquote') ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800")}
                    title="Quote (> quote)"
                  >
                    <Quote size={14} />
                  </button>
                  <button 
                    onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                    className={cn("p-1.5 rounded-lg transition-colors", editor?.isActive('codeBlock') ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800")}
                    title="Code Block (Ctrl/Cmd + E)"
                  >
                    <Code size={15} />
                  </button>
                  <button 
                    onClick={() => {
                      const url = window.prompt('URL:');
                      if (url) {
                        editor?.chain().focus().setLink({ href: url }).run();
                      }
                    }}
                    className={cn("p-1.5 rounded-lg transition-colors", editor?.isActive('link') ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800")}
                    title="Link (Ctrl/Cmd + K)"
                  >
                    <LinkIcon size={14} />
                  </button>
                </div>
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
              {renderTemplateControls && (
                <div className="hidden sm:block">
                  {renderTemplateControls()}
                </div>
              )}

              <button 
                onClick={onClose} 
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                title="Exit Immersive Mode"
              >
                <Minimize2 size={20} />
              </button>
            </div>
          </div>

          {/* Single Pane Editor Area */}
          <div className="flex-1 flex overflow-hidden bg-slate-950 justify-center">
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 md:p-12 max-w-4xl custom-scrollbar w-full">
              <EditorContent editor={editor} className="min-h-full h-full" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
};
