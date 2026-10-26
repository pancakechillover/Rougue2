import { create } from 'zustand';
import { StudySession, RewardCard } from '../types';

export interface DistractionsState {
  internal: number;
  external: number;
  unavoidable: number;
}

export interface ActiveRewardSession {
  session: StudySession;
  choices: RewardCard[];
}

export interface LastCompletedSessionInfo {
  id: string;
  timestamp: number;
  duration: number;
  dungeonName: string;
}

interface TimerStore {
  timeLeft: number;
  distractions: DistractionsState;
  activeRewardSession: ActiveRewardSession | null;
  showFocusPrompt: boolean;
  studyNote: string;
  lastCompletedSession: LastCompletedSessionInfo | null;
  setTimeLeft: (time: number) => void;
  _setDistractions: (distractions: DistractionsState | ((prev: DistractionsState) => DistractionsState)) => void;
  setActiveRewardSession: (session: ActiveRewardSession | null) => void;
  setShowFocusPrompt: (show: boolean) => void;
  setStudyNote: (note: string) => void;
  setLastCompletedSession: (session: LastCompletedSessionInfo | null) => void;
}

const defaultDistractions = { internal: 0, external: 0, unavoidable: 0 };

const loadLastCompletedSession = (): LastCompletedSessionInfo | null => {
  try {
    const raw = localStorage.getItem('timer_lastCompletedSession');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const useTimerStore = create<TimerStore>((set) => ({
  timeLeft: parseInt(localStorage.getItem('timer_timeLeft') || '1500', 10),
  distractions: JSON.parse(localStorage.getItem('timer_distractions') || JSON.stringify(defaultDistractions)),
  activeRewardSession: null,
  showFocusPrompt: false,
  studyNote: localStorage.getItem('timer_studyNote') || '',
  lastCompletedSession: loadLastCompletedSession(),
  setTimeLeft: (time) => {
    localStorage.setItem('timer_timeLeft', time.toString());
    set({ timeLeft: time });
  },
  _setDistractions: (newDistractions) => set((state) => {
    const value = typeof newDistractions === 'function' ? newDistractions(state.distractions) : newDistractions;
    localStorage.setItem('timer_distractions', JSON.stringify(value));
    return { distractions: value };
  }),
  setActiveRewardSession: (session) => set({ activeRewardSession: session }),
  setShowFocusPrompt: (show) => set({ showFocusPrompt: show }),
  setStudyNote: (note) => {
    localStorage.setItem('timer_studyNote', note);
    set({ studyNote: note });
  },
  setLastCompletedSession: (session) => {
    if (session) {
      localStorage.setItem('timer_lastCompletedSession', JSON.stringify(session));
    } else {
      localStorage.removeItem('timer_lastCompletedSession');
    }
    set({ lastCompletedSession: session });
  }
}));


