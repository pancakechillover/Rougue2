import React from 'react';
import { motion } from 'motion/react';
import { Stats } from './Stats';
import { AppState, Dungeon, MajorDungeon, StudySession } from '../types';

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
  return (
    <motion.div
      key="stats"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full p-4 sm:p-6 lg:p-8"
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
      />
    </motion.div>
  );
};
