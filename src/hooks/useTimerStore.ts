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

interface TimerStore {
  timeLeft: number;
  distractions: DistractionsState;
  activeRewardSession: ActiveRewardSession | null;
  showFocusPrompt: boolean;
  setTimeLeft: (time: number) => void;
  setDistractions: (distractions: DistractionsState | ((prev: DistractionsState) => DistractionsState)) => void;
  setActiveRewardSession: (session: ActiveRewardSession | null) => void;
  setShowFocusPrompt: (show: boolean) => void;
}

const defaultDistractions = { internal: 0, external: 0, unavoidable: 0 };

export const useTimerStore = create<TimerStore>((set) => ({
  timeLeft: parseInt(localStorage.getItem('timer_timeLeft') || '1500', 10),
  distractions: JSON.parse(localStorage.getItem('timer_distractions') || JSON.stringify(defaultDistractions)),
  activeRewardSession: null,
  showFocusPrompt: false,
  setTimeLeft: (time) => {
    localStorage.setItem('timer_timeLeft', time.toString());
    set({ timeLeft: time });
  },
  setDistractions: (newDistractions) => set((state) => {
    const value = typeof newDistractions === 'function' ? newDistractions(state.distractions) : newDistractions;
    localStorage.setItem('timer_distractions', JSON.stringify(value));
    return { distractions: value };
  }),
  setActiveRewardSession: (session) => set({ activeRewardSession: session }),
  setShowFocusPrompt: (show) => set({ showFocusPrompt: show })
}));

