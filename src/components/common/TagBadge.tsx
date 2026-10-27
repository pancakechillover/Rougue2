import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Tag as TagIcon, Plus, X, Check, Edit2, Archive, Trash2, RotateCcw } from 'lucide-react';
import { Tag, TagColor } from '../../types';
import { TAG_COLORS, TAG_COLOR_STYLES, generateTagId } from '../../lib/tags';
import { cn } from '../../lib/utils';

interface TagBadgeProps {
  tag: Tag;
  size?: 'xs' | 'sm';
  isInherited?: boolean;
  inherited?: boolean;
  onRemove?: (e: React.MouseEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
  active?: boolean;
  selected?: boolean;
  className?: string;
}

export const TagBadge: React.FC<TagBadgeProps> = ({
  tag,
  size = 'xs',
  isInherited,
  inherited,
  onRemove,
  onClick,
  active,
  selected,
  className,
}) => {
  const style = TAG_COLOR_STYLES[tag.color] || TAG_COLOR_STYLES.indigo;
  const effectiveInherited = isInherited ?? inherited ?? false;
  const isActive = active ?? selected ?? false;

  return (
    <span
      onClick={onClick}
      title={effectiveInherited ? `#${tag.name} (Inherited from parent)` : `#${tag.name}`}
      className={cn(
        'inline-flex items-center gap-1 border font-bold leading-none transition-all shrink-0 select-none',
        size === 'xs' ? 'h-5 px-1.5 rounded text-[10px]' : 'h-[26px] px-2.5 rounded-lg text-xs',
        isActive ? style.activeBg : cn(style.bg, style.text, style.border),
        effectiveInherited && 'opacity-75 border-dashed',
        onClick && 'cursor-pointer hover:opacity-90',
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', style.dot)} />
      <span className="inline-block max-w-[120px] truncate leading-normal align-middle px-0.5">
        {tag.name}
      </span>
      {effectiveInherited && (
        <span className="text-[8px] uppercase opacity-70 font-mono ml-0.5 leading-none">↑</span>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(e);
          }}
          className="ml-0.5 p-0.5 rounded hover:bg-black/20 text-current opacity-70 hover:opacity-100 transition-opacity"
          title="Remove tag"
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
};

interface TagPickerProps {
  tags?: Tag[];
  allTags?: Tag[];
  selectedTagIds?: string[];
  inheritedTagIds?: string[];
  onChange: (nextTagIds: string[]) => void;
  onCreateTag?: (name: string, color: TagColor) => Tag | void;
  onOpenManageModal?: () => void;
  label?: string;
  compact?: boolean;
}

export const TagPicker: React.FC<TagPickerProps> = ({
  tags,
  allTags,
  selectedTagIds = [],
  inheritedTagIds = [],
  onChange,
  onCreateTag,
  onOpenManageModal,
  label = 'Tags',
  compact = false,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<TagColor>('indigo');

  const rawTags = Array.isArray(tags) ? tags : Array.isArray(allTags) ? allTags : [];
  const resolvedTags = rawTags.filter(
    (t): t is Tag => Boolean(t && typeof t === 'object' && typeof t.id === 'string' && typeof t.name === 'string')
  );
  const safeSelectedIds = Array.isArray(selectedTagIds) ? selectedTagIds.filter((id): id is string => typeof id === 'string') : [];
  const safeInheritedIds = Array.isArray(inheritedTagIds) ? inheritedTagIds.filter((id): id is string => typeof id === 'string') : [];

  const activeTags = resolvedTags.filter(
    (t) => !t.archived || safeSelectedIds.includes(t.id) || safeInheritedIds.includes(t.id)
  );

  const toggleTag = (tagId: string) => {
    if (safeSelectedIds.includes(tagId)) {
      onChange(safeSelectedIds.filter((id) => id !== tagId));
    } else {
      onChange([...safeSelectedIds, tagId]);
    }
  };

  const handleQuickCreate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newName.trim().replace(/^#+/, '').trim();
    if (!trimmed) return;

    const existing = resolvedTags.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      if (!safeSelectedIds.includes(existing.id)) {
        onChange([...safeSelectedIds, existing.id]);
      }
      setNewName('');
      setIsAdding(false);
      return;
    }

    if (onCreateTag) {
      const created = onCreateTag(trimmed, newColor);
      if (created && typeof created === 'object' && created.id) {
        onChange([...safeSelectedIds, created.id]);
      }
      setNewName('');
      setNewColor(TAG_COLORS[(resolvedTags.length + 1) % TAG_COLORS.length]);
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <TagIcon size={12} className="text-indigo-400 shrink-0" />
          <span>{label}</span>
        </label>
        <div className="flex items-center gap-2">
          {onCreateTag && !isAdding && (
            <button
              type="button"
              onClick={() => {
                setNewColor(TAG_COLORS[resolvedTags.length % TAG_COLORS.length]);
                setIsAdding(true);
              }}
              className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
            >
              <Plus size={12} />
              <span>New Tag</span>
            </button>
          )}
          {onOpenManageModal && (
            <button
              type="button"
              onClick={onOpenManageModal}
              className="text-[11px] font-bold text-slate-400 hover:text-white transition-colors"
            >
              Manage
            </button>
          )}
        </div>
      </div>

      {/* Inherited tags display */}
      {safeInheritedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/50 border border-slate-800/80">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">
            Inherited:
          </span>
          {safeInheritedIds.map((tId) => {
            const t = resolvedTags.find((tag) => tag.id === tId);
            if (!t) return null;
            return <TagBadge key={t.id} tag={t} isInherited />;
          })}
        </div>
      )}

      {/* Quick Create Bar */}
      {isAdding && (
        <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2.5">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleQuickCreate();
                } else if (e.key === 'Escape') {
                  setIsAdding(false);
                }
              }}
              placeholder="Tag name (e.g. Math, Coding)..."
              autoFocus
              className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={() => handleQuickCreate()}
              disabled={!newName.trim()}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-all shrink-0"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg"
            >
              <X size={14} />
            </button>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Color:</span>
            {TAG_COLORS.map((c) => {
              const s = TAG_COLOR_STYLES[c];
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center border transition-transform',
                    s.bg,
                    s.border,
                    newColor === c ? 'scale-110 ring-2 ring-white/60' : 'opacity-70 hover:opacity-100'
                  )}
                  title={c}
                >
                  <span className={cn('w-2.5 h-2.5 rounded-full', s.dot)} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selectable Tag Chips */}
      {activeTags.length === 0 ? (
        <div className={cn(
          'text-xs text-slate-500 italic pr-1 py-2 px-3 rounded-xl border border-dashed border-slate-800 bg-slate-900/30',
          compact && 'py-1.5'
        )}>
          No tags created yet. Click "New Tag" to create one.
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {activeTags.map((tag) => {
            const isSelected = safeSelectedIds.includes(tag.id);
            const isInherited = safeInheritedIds.includes(tag.id);
            const style = TAG_COLOR_STYLES[tag.color] || TAG_COLOR_STYLES.indigo;
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1 min-h-[28px] rounded-lg border text-xs font-bold leading-normal transition-all cursor-pointer select-none',
                  isSelected
                    ? style.activeBg
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                )}
              >
                <span className={cn('w-2 h-2 rounded-full shrink-0', style.dot)} />
                <span className="inline-block max-w-[130px] truncate leading-normal align-middle px-0.5 py-0.5">
                  {tag.name}
                </span>
                {isSelected && <Check size={12} className="shrink-0" />}
                {!isSelected && isInherited && (
                  <span className="text-[9px] opacity-60 font-mono" title="Already inherited from parent">
                    (↑)
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface TagManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tags: Tag[];
  onUpdateTags: (nextTags: Tag[]) => void;
  onDeleteTag?: (tagId: string) => void;
}

export const TagManagerModal: React.FC<TagManagerModalProps> = ({
  isOpen,
  onClose,
  tags = [],
  onUpdateTags,
  onDeleteTag,
}) => {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<TagColor>('indigo');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState<TagColor>('indigo');
  const [showArchived, setShowArchived] = useState(false);

  if (!isOpen) return null;

  const safeTags = (Array.isArray(tags) ? tags : []).filter(
    (t): t is Tag => Boolean(t && typeof t === 'object' && typeof t.id === 'string' && typeof t.name === 'string')
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim().replace(/^#+/, '').trim();
    if (!trimmed) return;
    if (safeTags.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) return;

    const nextTag: Tag = {
      id: generateTagId(),
      name: trimmed,
      color: newColor,
    };
    onUpdateTags([...safeTags, nextTag]);
    setNewName('');
    setNewColor(TAG_COLORS[(safeTags.length + 1) % TAG_COLORS.length]);
  };

  const handleSaveEdit = (tagId: string) => {
    const trimmed = editName.trim().replace(/^#+/, '').trim();
    if (!trimmed) return;
    onUpdateTags(
      safeTags.map((t) => (t.id === tagId ? { ...t, name: trimmed, color: editColor } : t))
    );
    setEditingId(null);
  };

  const toggleArchive = (tagId: string) => {
    onUpdateTags(
      safeTags.map((t) => (t.id === tagId ? { ...t, archived: !t.archived } : t))
    );
  };

  const handleDelete = (tagId: string) => {
    if (onDeleteTag) {
      onDeleteTag(tagId);
    } else {
      onUpdateTags(safeTags.filter((t) => t.id !== tagId));
    }
  };

  const visibleTags = safeTags.filter((t) => (showArchived ? !!t.archived : !t.archived));

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="fixed inset-0" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 10 }}
        className="relative z-10 w-full max-w-lg bg-slate-900 border border-slate-700/70 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <TagIcon size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight italic pr-1">
                Tag Registry
              </h3>
              <p className="text-xs text-slate-400">
                Organize expeditions, agenda & focus analytics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Create New Tag Form */}
        <form onSubmit={handleCreate} className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-950/40 space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Create a new tag (e.g. Research, Coding, Reading)..."
              className="flex-1 min-w-0 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!newName.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shrink-0 flex items-center gap-1.5"
            >
              <Plus size={15} />
              <span>Create</span>
            </button>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">
                Color:
              </span>
              {TAG_COLORS.map((c) => {
                const s = TAG_COLOR_STYLES[c];
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center border transition-transform',
                      s.bg,
                      s.border,
                      newColor === c ? 'scale-110 ring-2 ring-white/70' : 'opacity-65 hover:opacity-100'
                    )}
                    title={c}
                  >
                    <span className={cn('w-2.5 h-2.5 rounded-full', s.dot)} />
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowArchived(!showArchived)}
              className={cn(
                'text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1',
                showArchived
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-white'
              )}
            >
              <Archive size={12} />
              <span>{showArchived ? 'Showing Archived' : 'Archived Tags'}</span>
            </button>
          </div>
        </form>

        {/* Tag List */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-2 custom-scrollbar">
          {visibleTags.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-sm italic pr-1">
              {showArchived ? 'No archived tags.' : 'No active tags yet. Create your first tag above!'}
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {visibleTags.map((tag) => {
                const isEditing = editingId === tag.id;
                return (
                  <motion.div
                    key={tag.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800 flex flex-col gap-2"
                  >
                    {isEditing ? (
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(tag.id)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="p-1.5 text-slate-400 hover:text-white"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {TAG_COLORS.map((c) => {
                            const s = TAG_COLOR_STYLES[c];
                            return (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setEditColor(c)}
                                className={cn(
                                  'w-5 h-5 rounded-full flex items-center justify-center border transition-transform',
                                  s.bg,
                                  s.border,
                                  editColor === c ? 'scale-110 ring-2 ring-white/70' : 'opacity-65 hover:opacity-100'
                                )}
                              >
                                <span className={cn('w-2.5 h-2.5 rounded-full', s.dot)} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <TagBadge tag={tag} size="sm" />
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(tag.id);
                              setEditName(tag.name);
                              setEditColor(tag.color);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white transition-colors"
                            title="Edit tag"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleArchive(tag.id)}
                            className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-amber-400 transition-colors"
                            title={tag.archived ? 'Restore tag' : 'Archive tag'}
                          >
                            {tag.archived ? <RotateCcw size={13} /> : <Archive size={13} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(tag.id)}
                            className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Delete tag"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
};
