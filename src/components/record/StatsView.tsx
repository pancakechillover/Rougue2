import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Stats } from './Stats';
import { AppState, Dungeon, MajorDungeon, StudySession } from '../../types';

interface StatsViewProps {
  state: AppState;
  setState?: React.Dispatch<React.SetStateAction<AppState>>;
  syncToCloud?: (forceOverwrite?: boolean, specificState?: AppState, syncMethod?: any) => void;
  saveDailyLog: (date: string, rating: number, reflection: string, mood?: string) => void;
  onUpdateState?: (updates: Partial<AppState>) => void;
  updateSession?: (id: string, updates: Partial<StudySession>) => void;
  deleteSession?: (id: string) => void;
  completeSession?: (dungeonId: string | null, duration: number, focusDuration?: number, restDuration?: number, customTimestamp?: number) => void;
  dungeons?: Dungeon[];
  majorDungeons?: MajorDungeon[];
  setShowStartOfDayModal?: (val: string | boolean) => void;
  /** Opens the journal as its own full-screen page. */
  onOpenJournalPage?: (dateStr?: string) => void;
}

export const StatsView: React.FC<StatsViewProps> = ({ 
  state, 
  setState,
  syncToCloud,
  saveDailyLog, 
  onUpdateState, 
  updateSession, 
  deleteSession,
  completeSession,
  dungeons,
  majorDungeons,
  setShowStartOfDayModal,
  onOpenJournalPage
}) => {
  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <AnimatePresence mode="wait">
        {(
          <motion.div
            key="stats-overview"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="w-full"
          >
            <Stats 
              state={state} 
              setState={setState}
              syncToCloud={syncToCloud}
              saveDailyLog={saveDailyLog} 
              onUpdateState={onUpdateState}
              updateSession={updateSession}
              deleteSession={deleteSession}
              completeSession={completeSession}
              dungeons={dungeons}
              majorDungeons={majorDungeons}
              _setShowStartOfDayModal={setShowStartOfDayModal}
              onOpenJournal={(dateStr) => onOpenJournalPage?.(dateStr)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

