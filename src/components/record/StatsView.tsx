import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Stats } from './Stats';
import { JournalView } from '../journal/JournalView';
import { AppState, Dungeon, MajorDungeon, StudySession } from '../../types';

interface StatsViewProps {
  state: AppState;
  saveDailyLog: (date: string, rating: number, reflection: string, mood?: string) => void;
  onUpdateState?: (updates: Partial<AppState>) => void;
  updateSession?: (id: string, updates: Partial<StudySession>) => void;
  deleteSession?: (id: string) => void;
  completeSession?: (dungeonId: string | null, duration: number, focusDuration?: number, restDuration?: number, customTimestamp?: number) => void;
  dungeons?: Dungeon[];
  majorDungeons?: MajorDungeon[];
  setShowStartOfDayModal?: (val: string | boolean) => void;
}

export const StatsView: React.FC<StatsViewProps> = ({ 
  state, 
  saveDailyLog, 
  onUpdateState, 
  updateSession, 
  deleteSession,
  completeSession,
  dungeons,
  majorDungeons,
  setShowStartOfDayModal
}) => {
  const [showJournalView, setShowJournalView] = useState<boolean>(() => {
    try {
      return localStorage.getItem('record_showJournalView') === 'true';
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('record_showJournalView', String(showJournalView));
    } catch (e) {}
  }, [showJournalView]);

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <AnimatePresence mode="wait">
        {showJournalView ? (
          <JournalView
            key="journal-view"
            state={state}
            saveDailyLog={saveDailyLog}
            onUpdateState={onUpdateState}
            dungeons={dungeons}
            majorDungeons={majorDungeons}
            onBack={() => {
              setShowJournalView(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : (
          <motion.div
            key="stats-overview"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="w-full"
          >
            <Stats 
              state={state} 
              saveDailyLog={saveDailyLog} 
              onUpdateState={onUpdateState}
              updateSession={updateSession}
              deleteSession={deleteSession}
              completeSession={completeSession}
              dungeons={dungeons}
              majorDungeons={majorDungeons}
              setShowStartOfDayModal={setShowStartOfDayModal}
              onOpenJournal={() => {
                setShowJournalView(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

