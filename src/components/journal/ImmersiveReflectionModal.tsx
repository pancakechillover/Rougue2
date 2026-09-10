import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Minimize2, Download, Upload, 
  PanelLeftClose, PanelLeftOpen, Search, 
  Calendar, Bookmark, Star, Percent, FileText, 
  ChevronRight, X, Sparkles, Check
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { format, subDays, parseISO, isValid } from 'date-fns';
import { DailyLog, EfficiencyRatingConfig, ReflectionTemplate, StudySession } from '../../types';
import { ReflectionTemplatesDropdown } from '../common/ReflectionTemplatesDropdown';
import { MarkdownEditor } from '../common/MarkdownEditor';
import { cn } from '../../lib/utils';

export interface ImmersiveReflectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateString: string;
  reflection: string;
  setReflection: (val: string) => void;
  title?: string;
  onTitleChange?: (val: string) => void;
  dailyLogs?: Record<string, DailyLog>;
  onSelectDate?: (dateStr: string) => void;
  bookmarks?: string[];
  onToggleBookmark?: (dateStr: string) => void;
  history?: StudySession[];
  efficiencyRatingConfig?: EfficiencyRatingConfig;
  isMarkdownEnabled?: boolean;
  setIsMarkdownEnabled?: (val: boolean) => void;
  templates?: ReflectionTemplate[];
  onUpdateTemplates?: (templates: ReflectionTemplate[]) => void;
  autoLoadTemplateId?: string | null;
  autoLoadTemplateMode?: 'empty' | 'example';
  onSetAutoLoadTemplate?: (templateId: string | null, mode?: 'empty' | 'example') => void;
  renderTemplateControls?: () => React.ReactNode;
}

export const ImmersiveReflectionModal: React.FC<ImmersiveReflectionModalProps> = ({
  isOpen,
  onClose,
  dateString,
  reflection,
  setReflection,
  title = '',
  onTitleChange,
  dailyLogs = {},
  onSelectDate,
  bookmarks = [],
  onToggleBookmark,
  history = [],
  efficiencyRatingConfig,
  templates,
  onUpdateTemplates,
  autoLoadTemplateId,
  autoLoadTemplateMode,
  onSetAutoLoadTemplate,
  renderTemplateControls
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'notes' | 'bookmarked'>('all');

  const isEfficiencyMode = efficiencyRatingConfig?.ratingDisplayPreference === 'efficiency';

  // Collect and sort all available dates for the sidebar
  const entryDates = useMemo(() => {
    const datesSet = new Set<string>();
    
    // Always include current date, today, and yesterday
    datesSet.add(dateString);
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    datesSet.add(todayStr);
    datesSet.add(yesterdayStr);

    // Include dates from dailyLogs
    Object.keys(dailyLogs).forEach(d => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        datesSet.add(d);
      }
    });

    // Include dates from bookmarks
    bookmarks.forEach(d => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        datesSet.add(d);
      }
    });

    // Include dates with study history
    history.forEach(s => {
      if (s.timestamp && s.timestamp.length >= 10) {
        const d = s.timestamp.substring(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
          datesSet.add(d);
        }
      }
    });

    return Array.from(datesSet).sort((a, b) => b.localeCompare(a));
  }, [dateString, dailyLogs, bookmarks, history]);

  // Filter entry items based on search query and filter type
  const filteredEntries = useMemo(() => {
    return entryDates.filter(d => {
      const log = dailyLogs[d];
      const entryTitle = log?.title || '';
      const entryReflection = log?.reflection || '';
      const isBookmarked = bookmarks.includes(d);
      const hasContent = !!(entryReflection.trim() || (typeof log?.rating === 'number' && log.rating > 0) || entryTitle.trim());

      // Filter category
      if (filterType === 'notes' && !hasContent) return false;
      if (filterType === 'bookmarked' && !isBookmarked) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesDate = d.includes(q);
        const matchesTitle = entryTitle.toLowerCase().includes(q);
        const matchesContent = entryReflection.toLowerCase().includes(q);
        return matchesDate || matchesTitle || matchesContent;
      }

      return true;
    });
  }, [entryDates, dailyLogs, bookmarks, filterType, searchQuery]);

  const effectiveTitle = title.trim() ? title : dateString;

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
          <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900 relative z-30">
            {/* Left: Sidebar Toggle + Reflection tag + Title Input */}
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 mr-2">
              {/* Toggle Entries Sidebar Button (Left-Aligned) */}
              {onSelectDate && (
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className={cn(
                    "px-2 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-xs font-mono font-medium shrink-0",
                    isSidebarOpen 
                      ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300" 
                      : "bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border-slate-700/80"
                  )}
                  title={isSidebarOpen ? "Collapse Entries Sidebar" : "Expand Entries Sidebar"}
                >
                  {isSidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
                  <span className="hidden sm:inline">Entries</span>
                </button>
              )}

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs sm:text-sm font-black text-slate-300 uppercase tracking-widest italic pr-1 select-none">
                  Reflection
                </span>
                <span className="hidden md:inline-block text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 tracking-wider">
                  {dateString}
                </span>
              </div>

              {/* Title input field - Default title is Date */}
              <div className="flex-1 max-w-sm sm:max-w-md md:max-w-lg min-w-0 relative">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => onTitleChange?.(e.target.value)}
                  placeholder={dateString}
                  className="w-full bg-slate-800/80 hover:bg-slate-800 focus:bg-slate-900 border border-slate-700/70 focus:border-indigo-500/80 rounded-lg px-2.5 py-1 text-xs sm:text-sm font-bold text-slate-100 placeholder:text-slate-500 placeholder:font-normal transition-all outline-none"
                  title="Journal Title (Default: Date)"
                />
                {title && (
                  <button
                    type="button"
                    onClick={() => onTitleChange?.('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white rounded-md transition-colors"
                    title="Reset to default date title"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
            
            {/* Header Right Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <div className="flex items-center gap-1 border-r border-slate-700/80 pr-1.5 sm:pr-2 mr-1">
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
                    const exportText = `# ${effectiveTitle}\n\n*Date: ${dateString}*\n\n${reflection}`;
                    const blob = new Blob([exportText], { type: 'text/markdown' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    const safeTitle = (title.trim() || dateString).replace(/[^a-zA-Z0-9_-]/g, '_');
                    a.download = `Journal-${safeTitle}.md`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title="Export Markdown"
                >
                  <Download size={16} />
                </button>
              </div>

              {templates ? (
                <div className="flex items-center">
                  <ReflectionTemplatesDropdown
                    templates={templates}
                    onSelectTemplate={(t) => setReflection(t)}
                    currentReflection={reflection}
                    onUpdateTemplates={onUpdateTemplates}
                    autoLoadTemplateId={autoLoadTemplateId}
                    autoLoadTemplateMode={autoLoadTemplateMode}
                    onSetAutoLoadTemplate={onSetAutoLoadTemplate}
                  />
                </div>
              ) : renderTemplateControls ? (
                <div className="flex items-center">
                  {renderTemplateControls()}
                </div>
              ) : null}

              <button 
                onClick={onClose} 
                className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                title="Exit Immersive Mode"
              >
                <Minimize2 size={18} />
              </button>
            </div>
          </div>

          {/* Main Content Workspace: Entries Sidebar on Left, Editor on Right */}
          <div className="flex-1 flex overflow-hidden bg-slate-950 relative">
            {/* Left Sidebar for Choosing Other Days' Journals */}
            {onSelectDate && (
              <AnimatePresence>
                {isSidebarOpen && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 320, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                    className="w-72 sm:w-80 h-full border-r border-slate-800 bg-slate-900/95 backdrop-blur-md flex flex-col shrink-0 overflow-hidden z-20"
                  >
                    {/* Sidebar Header */}
                    <div className="p-3 border-b border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
                          <Calendar size={14} className="text-indigo-400" />
                          <span>Journal Entries</span>
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded-full">
                            {filteredEntries.length}
                          </span>
                        </div>
                        <button
                          onClick={() => setIsSidebarOpen(false)}
                          className="p-1 text-slate-500 hover:text-slate-300 rounded hover:bg-slate-800 transition-colors"
                          title="Close Sidebar"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {/* Search Bar */}
                      <div className="relative">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search date or title..."
                          className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/60"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>

                      {/* Filter Categories */}
                      <div className="flex items-center gap-1 text-[11px] font-medium font-mono">
                        <button
                          onClick={() => setFilterType('all')}
                          className={cn(
                            "flex-1 py-1 px-1.5 rounded text-center transition-colors",
                            filterType === 'all'
                              ? "bg-slate-800 text-indigo-300 font-bold"
                              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                          )}
                        >
                          All
                        </button>
                        <button
                          onClick={() => setFilterType('notes')}
                          className={cn(
                            "flex-1 py-1 px-1.5 rounded text-center transition-colors",
                            filterType === 'notes'
                              ? "bg-slate-800 text-indigo-300 font-bold"
                              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                          )}
                        >
                          Notes
                        </button>
                        <button
                          onClick={() => setFilterType('bookmarked')}
                          className={cn(
                            "flex-1 py-1 px-1.5 rounded text-center transition-colors",
                            filterType === 'bookmarked'
                              ? "bg-slate-800 text-indigo-300 font-bold"
                              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                          )}
                        >
                          Starred
                        </button>
                      </div>
                    </div>

                    {/* Quick Jump: Today & Yesterday */}
                    <div className="px-3 py-2 border-b border-slate-800/60 flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          const today = format(new Date(), 'yyyy-MM-dd');
                          onSelectDate(today);
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-md text-[11px] font-mono font-medium border transition-colors flex items-center gap-1",
                          dateString === format(new Date(), 'yyyy-MM-dd')
                            ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300"
                            : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800"
                        )}
                      >
                        <Sparkles size={11} className="text-amber-400" />
                        <span>Today</span>
                      </button>

                      <button
                        onClick={() => {
                          const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
                          onSelectDate(yesterday);
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-md text-[11px] font-mono font-medium border transition-colors flex items-center gap-1",
                          dateString === format(subDays(new Date(), 1), 'yyyy-MM-dd')
                            ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300"
                            : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800"
                        )}
                      >
                        <span>Yesterday</span>
                      </button>
                    </div>

                    {/* Entries List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
                      {filteredEntries.length === 0 ? (
                        <div className="p-6 text-center text-slate-500 text-xs font-mono space-y-1">
                          <FileText size={20} className="mx-auto text-slate-600 mb-2" />
                          <p>No matching entries found</p>
                        </div>
                      ) : (
                        filteredEntries.map((d) => {
                          const isSelected = d === dateString;
                          const log = dailyLogs[d];
                          const customTitle = log?.title?.trim();
                          const displayTitle = customTitle || d;
                          const text = log?.reflection || '';
                          const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
                          const isBookmarked = bookmarks.includes(d);
                          const parsed = parseISO(d);
                          const dateFormatted = isValid(parsed) ? format(parsed, 'MMM dd, yyyy') : d;
                          const weekday = isValid(parsed) ? format(parsed, 'EEE') : '';
                          const hasRating = typeof log?.rating === 'number' && log.rating > 0;
                          const hasMood = Boolean(log?.mood);

                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => {
                                if (d !== dateString) {
                                  onSelectDate(d);
                                }
                              }}
                              className={cn(
                                "w-full text-left p-2.5 rounded-xl border transition-all group flex flex-col gap-1 relative",
                                isSelected
                                  ? "bg-indigo-600/15 border-indigo-500/50 text-indigo-200 shadow-sm ring-1 ring-indigo-500/30"
                                  : "bg-slate-950/40 hover:bg-slate-800/60 border-slate-800/80 text-slate-300 hover:border-slate-700"
                              )}
                            >
                              <div className="flex items-center justify-between gap-1 w-full">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className={cn(
                                    "text-xs font-bold truncate",
                                    isSelected ? "text-indigo-300 font-mono" : "text-slate-200"
                                  )}>
                                    {displayTitle}
                                  </span>
                                  {customTitle && (
                                    <span className="text-[9px] font-mono text-slate-500 shrink-0">
                                      ({d})
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {isBookmarked && (
                                    <Bookmark size={11} className="text-amber-400 fill-amber-400" />
                                  )}
                                  {isSelected && (
                                    <Check size={12} className="text-indigo-400" />
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                                <span>{dateFormatted} · {weekday}</span>
                                <span className={cn(
                                  wordCount > 0 ? "text-slate-400" : "text-slate-600 italic"
                                )}>
                                  {wordCount > 0 ? `${wordCount}w` : 'Empty'}
                                </span>
                              </div>

                              {/* Mood or Rating / Efficiency badge (No decimals, matching user preference) */}
                              {Boolean(hasMood || hasRating) && (
                                <div className="flex items-center gap-2 pt-0.5 text-[10px] text-slate-400">
                                  {hasRating && typeof log?.rating === 'number' && (
                                    isEfficiencyMode ? (
                                      <span 
                                        className="flex items-center gap-0.5 text-indigo-400 font-mono font-bold" 
                                        title={`Efficiency: ${Math.round((log.rating / 5) * 100)}%`}
                                      >
                                        <Percent size={9} />
                                        {Math.round((log.rating / 5) * 100)}%
                                      </span>
                                    ) : (
                                      <span 
                                        className="flex items-center gap-0.5 text-amber-400/90 font-mono font-bold" 
                                        title={`Rating: ${Math.round(log.rating)} Stars`}
                                      >
                                        <Star size={10} className="fill-amber-400" />
                                        {Math.round(log.rating)}
                                      </span>
                                    )
                                  )}
                                  {log?.mood && (
                                    <span className="bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-300 text-[10px] capitalize">
                                      {log.mood}
                                    </span>
                                  )}
                                </div>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {/* Fullscreen Editor Area */}
            <div className="flex-1 flex flex-col overflow-hidden p-3 sm:p-5 md:p-6 min-w-0">
              <div className="flex-1 max-w-6xl mx-auto w-full h-full flex flex-col overflow-hidden">
                <MarkdownEditor
                  value={reflection}
                  onChange={setReflection}
                  placeholder="Write your reflection in Markdown... (Markdown supported)"
                  autoFocus
                  defaultMode="split"
                  showModeToggle={true}
                  className="h-full flex-1 shadow-2xl"
                  minHeight="100%"
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
};
