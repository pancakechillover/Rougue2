import React from 'react';
import { motion } from 'motion/react';
import { 
  Sword, 
  Target, 
  Trophy, 
  Plus, 
  Edit2, 
  Archive,
  CheckCheck,
  Undo2,
  FileText
} from 'lucide-react';
import { PageHeader } from '../PageHeader';
import { DungeonManager } from './DungeonManager';
import { QuestManager } from '../QuestManager';
import { AppState, Dungeon, MajorDungeon, DungeonReward } from '../../types';
import { cn } from '../../lib/utils';
import { exportExpeditionsToMarkdown, importExpeditionsFromMarkdown } from '../../lib/expeditionMarkdown';
import { ImportExportModal } from './ImportExportModal';

interface DungeonsViewProps {
  state: AppState;
  dungeons: Dungeon[];
  majorDungeons: MajorDungeon[];
  dungeonSubTab: 'list' | 'quests' | 'achievements';
  setDungeonSubTab: (tab: 'list' | 'quests' | 'achievements') => void;
  isDungeonEditMode: boolean;
  setIsDungeonEditMode: (mode: boolean) => void;
  isAddingMajor: boolean;
  setIsAddingMajor: (adding: boolean) => void;
  isAddingQuest: boolean;
  setIsAddingQuest: (adding: boolean) => void;
  isArchiveView: boolean;
  setIsArchiveView: (view: boolean) => void;
  unclaimedQuestsCount: number;
  unclaimedAchievementsCount: number;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  handleCreateMajor: (name: string, description: string, rewards?: DungeonReward[], isRoutine?: boolean, routineType?: 'daily' | 'weekly' | 'monthly', deadline?: string) => void;
  handleCreateSub: (dungeon: Omit<Dungeon, 'id' | 'completedSessions' | 'status'>) => void;
  handleUpdateMajor: (id: string, updates: Partial<MajorDungeon>) => void;
  handleUpdateSub: (id: string, updates: Partial<Dungeon>) => void;
  handleDeleteMajor: (id: string) => void;
  handleDeleteSub: (id: string) => void;
  reorderMajorDungeon: (id: string, direction: 'up' | 'down') => void;
  reorderSubDungeon: (id: string, direction: 'up' | 'down') => void;
  onMoveDungeonItem: (itemId: string, newParentId: string | null) => void;
  onDragStart: () => void;
  undoDungeonDrag: () => void;
  canUndoDrag: boolean;
  setMajorDungeons: React.Dispatch<React.SetStateAction<MajorDungeon[]>>;
  setDungeons: React.Dispatch<React.SetStateAction<Dungeon[]>>;
  finalizeMajorDungeon: (id: string) => void;
  archiveMajorDungeon: (id: string) => void;
  forceCompleteSubDungeon: (id: string) => void;
  claimQuestReward: (id: string) => void;
  claimAllQuestRewards: () => void;
  questHistory: AppState['questHistory'];
}

export const DungeonsView: React.FC<DungeonsViewProps> = ({
  state,
  dungeons,
  majorDungeons,
  dungeonSubTab,
  setDungeonSubTab,
  isDungeonEditMode,
  setIsDungeonEditMode,
  isAddingMajor,
  setIsAddingMajor,
  isAddingQuest,
  setIsAddingQuest,
  isArchiveView,
  setIsArchiveView,
  unclaimedQuestsCount,
  unclaimedAchievementsCount,
  setState,
  handleCreateMajor,
  handleCreateSub,
  handleUpdateMajor,
  handleUpdateSub,
  handleDeleteMajor,
  handleDeleteSub,
  reorderMajorDungeon,
  reorderSubDungeon,
  onMoveDungeonItem,
  onDragStart,
  undoDungeonDrag,
  canUndoDrag,
  setMajorDungeons,
  setDungeons,
  finalizeMajorDungeon,
  archiveMajorDungeon,
  forceCompleteSubDungeon,
  claimQuestReward,
  claimAllQuestRewards,
  questHistory
}) => {
  const [isImportExportOpen, setIsImportExportOpen] = React.useState(false);

  const handleImportExpeditions = (mdText: string) => {
    const { majors: importedMajors, subs: importedSubs } = importExpeditionsFromMarkdown(mdText);
    
    // Check if any imported major is not empty or if user is sure?
    // According to instructions, we append.
    setMajorDungeons(prev => [...prev, ...importedMajors]);
    setDungeons(prev => [...prev, ...importedSubs]);
  };

  const exportText = React.useMemo(() => {
    return exportExpeditionsToMarkdown(majorDungeons, dungeons);
  }, [majorDungeons, dungeons, isImportExportOpen]);

  return (
    <motion.div
      key="dungeons"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8"
    >
      <PageHeader 
        title={dungeonSubTab === 'list' ? "Expedition" : dungeonSubTab === 'quests' ? "Quest Board" : dungeonSubTab === 'achievements' ? "Achievements" : "Quest History"} 
        description={dungeonSubTab === 'list' ? "Manage your study goals" : dungeonSubTab === 'quests' ? "Complete tasks for extra rewards" : dungeonSubTab === 'achievements' ? "Your legendary milestones" : "Chronicle of your completed deeds"} 
        icon={dungeonSubTab === 'list' ? Sword : dungeonSubTab === 'quests' ? Target : dungeonSubTab === 'achievements' ? Trophy : Archive} 
      >
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <div className="flex gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setDungeonSubTab('list')}
              className={cn(
                "px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2",
                dungeonSubTab === 'list' ? "bg-indigo-500/20 text-indigo-400" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <Sword size={14} className="sm:w-4 sm:h-4" />
              Expedition
            </button>
            <button
              onClick={() => setDungeonSubTab('quests')}
              className={cn(
                "px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 relative",
                dungeonSubTab === 'quests' ? "bg-indigo-500/20 text-indigo-400" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <Target size={14} className="sm:w-4 sm:h-4" />
              Quests
              {unclaimedQuestsCount > 0 && state.questNotificationStyle === 'red_dot' && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-slate-950" />
              )}
            </button>
            <button
              onClick={() => setDungeonSubTab('achievements')}
              className={cn(
                "px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 relative",
                dungeonSubTab === 'achievements' ? "bg-amber-500/20 text-amber-400" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <Trophy size={14} className="sm:w-4 sm:h-4" />
              Achievements
              {unclaimedAchievementsCount > 0 && state.questNotificationStyle === 'red_dot' && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-slate-950" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isDungeonEditMode && dungeonSubTab === 'list' && (
              <button
                onClick={undoDungeonDrag}
                disabled={!canUndoDrag}
                className={cn(
                  "flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl transition-all shadow-lg shrink-0",
                  canUndoDrag 
                    ? "bg-amber-600 text-white hover:bg-amber-500 shadow-amber-500/20" 
                    : "bg-slate-800 text-slate-600 cursor-not-allowed opacity-50"
                )}
                title="Undo Drag Operation"
              >
                <Undo2 size={16} className="sm:w-[18px] sm:h-[18px]" />
              </button>
            )}

            <button
              onClick={() => setIsDungeonEditMode(!isDungeonEditMode)}
              className={cn(
                "flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl transition-all shadow-lg shrink-0",
                isDungeonEditMode 
                  ? "bg-indigo-600 text-white shadow-indigo-500/20" 
                  : "bg-slate-800 text-slate-400 hover:text-white"
              )}
              title={isDungeonEditMode ? "Exit Edit Mode" : "Enter Edit Mode"}
            >
              <Edit2 size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>

            {dungeonSubTab === 'list' && (
              <button
                onClick={() => setIsAddingMajor(true)}
                className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20 shrink-0"
                title="CREATE EXPEDITION GOAL"
              >
                <Plus size={18} />
              </button>
            )}
            
            {dungeonSubTab === 'list' && (
              <button
                onClick={() => setIsArchiveView(!isArchiveView)}
                className={cn(
                  "flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl transition-all shadow-lg border shrink-0",
                  isArchiveView 
                    ? "bg-amber-600 border-amber-500 text-white" 
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                )}
                title="Toggle Archive"
              >
                <Archive size={18} />
              </button>
            )}

            {dungeonSubTab === 'list' && (
              <button
                onClick={() => setIsImportExportOpen(true)}
                className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl transition-all bg-slate-800 border-slate-700 text-slate-400 hover:text-white shadow-lg border shrink-0"
                title="Import/Export Expeditions"
              >
                <FileText size={18} />
              </button>
            )}

            {dungeonSubTab === 'quests' && (
              <button
                onClick={() => setIsAddingQuest(true)}
                className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20 shrink-0"
                title="Add Quest"
              >
                <Plus size={18} />
              </button>
            )}

            {dungeonSubTab === 'achievements' && (
              <button
                onClick={() => setIsAddingQuest(true)}
                className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-all shadow-lg shadow-amber-500/20 shrink-0"
                title="Add Achievement"
              >
                <Plus size={18} />
              </button>
            )}

            {(dungeonSubTab === 'quests' || dungeonSubTab === 'achievements' || (dungeonSubTab as any) === 'history') && (
              <>
                <button
                  onClick={() => setDungeonSubTab(dungeonSubTab === ('history' as any) ? 'quests' : 'history' as any)}
                  className={cn(
                    "flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl transition-all shadow-lg shrink-0",
                    dungeonSubTab === ('history' as any) 
                      ? "bg-emerald-600 text-white shadow-emerald-500/20" 
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  )}
                  title="Toggle Quest History"
                >
                  <Archive size={18} />
                </button>

                {(unclaimedQuestsCount > 0 || unclaimedAchievementsCount > 0) && (
                  <button
                    onClick={claimAllQuestRewards}
                    className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-lg shadow-emerald-500/20 shrink-0"
                    title="Claim All Rewards"
                  >
                    <CheckCheck size={20} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </PageHeader>

      {dungeonSubTab === 'list' ? (
        <DungeonManager 
          dungeons={dungeons}
          majorDungeons={majorDungeons}
          currentDungeonId={state.currentDungeonId}
          standardSessionMinutes={state.standardSessionMinutes}
          standardRestMinutes={state.standardRestMinutes}
          includeRestTimeInTasks={state.includeRestTimeInTasks}
          defaultOpenEndedDungeon={state.defaultOpenEndedDungeon}
          isAddingMajor={isAddingMajor}
          setIsAddingMajor={setIsAddingMajor}
          isEditMode={isDungeonEditMode}
          activeTab={isArchiveView ? 'archive' : 'active'}
          onSelect={(id) => setState(prev => ({ ...prev, currentDungeonId: prev.currentDungeonId === id ? null : id }))}
          onCreateMajor={handleCreateMajor}
          onCreateSub={handleCreateSub}
          onUpdateMajor={handleUpdateMajor}
          onUpdateSub={handleUpdateSub}
          onDeleteMajor={handleDeleteMajor}
          onDeleteSub={handleDeleteSub}
          onReorderMajor={reorderMajorDungeon}
          onReorderSub={reorderSubDungeon}
          onMoveItem={onMoveDungeonItem}
          onDragStart={onDragStart}
          setMajorDungeons={setMajorDungeons}
          setDungeons={setDungeons}
          onFinalizeMajor={finalizeMajorDungeon}
          onArchiveMajor={archiveMajorDungeon}
          onForceCompleteSub={forceCompleteSubDungeon}
          timeSettings={state.timeSettings}
        />
      ) : dungeonSubTab === 'quests' ? (
        <QuestManager 
          key="quests-tab"
          quests={state.quests}
          questHistory={questHistory}
          activeTalents={state.activeTalents}
          isAdding={isAddingQuest}
          setIsAdding={setIsAddingQuest}
          isEditMode={isDungeonEditMode}
          onUpdateQuests={(quests) => setState(prev => ({ ...prev, quests }))}
          onClaimReward={claimQuestReward}
          forceTab="quests"
        />
      ) : dungeonSubTab === 'achievements' ? (
        <QuestManager 
          key="achievements-tab"
          quests={state.quests}
          questHistory={questHistory}
          activeTalents={state.activeTalents}
          isAdding={isAddingQuest}
          setIsAdding={setIsAddingQuest}
          isEditMode={isDungeonEditMode}
          onUpdateQuests={(quests) => setState(prev => ({ ...prev, quests }))}
          onClaimReward={claimQuestReward}
          forceTab="achievements"
        />
      ) : (
        <QuestManager 
          key="history-tab"
          quests={state.quests}
          questHistory={questHistory}
          activeTalents={state.activeTalents}
          isAdding={isAddingQuest}
          setIsAdding={setIsAddingQuest}
          isEditMode={isDungeonEditMode}
          onUpdateQuests={(quests) => setState(prev => ({ ...prev, quests }))}
          onClaimReward={claimQuestReward}
          forceTab="history"
        />
      )}

      <ImportExportModal 
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        onImport={handleImportExpeditions}
        exportData={exportText}
      />
    </motion.div>
  );
};
