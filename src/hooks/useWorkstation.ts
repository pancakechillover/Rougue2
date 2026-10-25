import { useCallback, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { differenceInMinutes, parseISO, isValid } from 'date-fns';
import { AppState, ActiveWorkstationSession, WorkstationInterval } from '../types';
import { getSettlementDay } from '../lib/utils';
import { getMaxWorkstationSessionMinutes } from '../lib/workstationUtils';
import { playSound } from '../lib/sound';

interface UseWorkstationOptions {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  /** Optional cloud sync hook; keeps the old "sync 50ms after commit" behaviour. */
  syncToCloud?: (silent: boolean, data?: AppState, reason?: string) => void;
  /** Location used when the caller does not pass one. */
  defaultLocation?: string;
}

export interface PunchInPayload {
  location?: string;
  note?: string;
}

export interface PunchOutPayload {
  /** Overrides "now" — used by the safety timeout. */
  endTime?: Date;
  /** Overrides the computed duration — used by the safety timeout. */
  durationMinutes?: number;
  /** Location used when the active session has none recorded. */
  fallbackLocation?: string;
}

export interface SaveIntervalPayload {
  dateStr: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  location: string;
  note?: string;
  editingId?: string | null;
}

/**
 * Single source of truth for workstation punch-in / punch-out and interval records.
 */
export function useWorkstation({
  state,
  setState,
  syncToCloud,
  defaultLocation = 'Home',
}: UseWorkstationOptions) {
  const active = state.activeWorkstationSession;

  const stateRef = useRef(state);
  stateRef.current = state;

  const commit = useCallback(
    (next: AppState) => {
      if (syncToCloud) {
        setTimeout(() => syncToCloud(false, next, 'Immediate'), 50);
      }
      return next;
    },
    [syncToCloud]
  );

  const punchIn = useCallback(
    ({ location, note }: PunchInPayload = {}) => {
      const session: ActiveWorkstationSession = {
        id: `ws_${Date.now()}`,
        startTime: new Date().toISOString(),
        location: location || defaultLocation,
        note: note?.trim() || undefined,
      };

      setState((prev) => commit({ ...prev, activeWorkstationSession: session }));
      playSound('click');
      return session;
    },
    [commit, defaultLocation, setState]
  );

  const punchOut = useCallback(
    ({ endTime, durationMinutes, fallbackLocation }: PunchOutPayload = {}) => {
      const current = stateRef.current.activeWorkstationSession;
      if (!current || !current.startTime) return null;

      const start = parseISO(current.startTime);
      if (!isValid(start)) return null;

      const maxMins = getMaxWorkstationSessionMinutes(stateRef.current);
      const end = endTime ?? new Date();
      const minutes =
        durationMinutes ??
        Math.min(maxMins, Math.max(1, differenceInMinutes(end, start)));
      const sessionDate = getSettlementDay(start, stateRef.current.timeSettings);

      const completedInterval: WorkstationInterval = {
        id: current.id,
        date: sessionDate,
        startTime: current.startTime,
        endTime: end.toISOString(),
        durationMinutes: minutes,
        location: current.location || fallbackLocation || defaultLocation,
        note: current.note,
      };

      setState((prev) => {
        const existing = prev.workstationLogs?.[sessionDate] || [];
        return commit({
          ...prev,
          workstationLogs: {
            ...(prev.workstationLogs || {}),
            [sessionDate]: [...existing, completedInterval],
          },
          activeWorkstationSession: null,
        });
      });

      playSound('reward');
      return completedInterval;
    },
    [commit, defaultLocation, setState]
  );

  /**
   * Ends the current workstation interval and immediately starts a new interval
   * at `newLocation` in a single atomic state update.
   */
  const switchLocation = useCallback(
    (newLocation: string, note?: string) => {
      const current = stateRef.current.activeWorkstationSession;
      const now = new Date();
      const nowISO = now.toISOString();

      if (!current || !current.startTime) {
        return punchIn({ location: newLocation, note });
      }

      if (current.location === newLocation) {
        return current;
      }

      const start = parseISO(current.startTime);
      const maxMins = getMaxWorkstationSessionMinutes(stateRef.current);
      const nextSession: ActiveWorkstationSession = {
        id: `ws_${Date.now()}_sw`,
        startTime: nowISO,
        location: newLocation || defaultLocation,
        note: note?.trim() || current.note,
      };

      if (!isValid(start)) {
        setState((prev) => commit({ ...prev, activeWorkstationSession: nextSession }));
        playSound('click');
        return nextSession;
      }

      const minutes = Math.min(maxMins, Math.max(1, differenceInMinutes(now, start)));
      const sessionDate = getSettlementDay(start, stateRef.current.timeSettings);

      const completedInterval: WorkstationInterval = {
        id: current.id,
        date: sessionDate,
        startTime: current.startTime,
        endTime: nowISO,
        durationMinutes: minutes,
        location: current.location || defaultLocation,
        note: current.note,
      };

      setState((prev) => {
        const existing = prev.workstationLogs?.[sessionDate] || [];
        return commit({
          ...prev,
          workstationLogs: {
            ...(prev.workstationLogs || {}),
            [sessionDate]: [...existing, completedInterval],
          },
          activeWorkstationSession: nextSession,
        });
      });

      playSound('click');
      return nextSession;
    },
    [commit, defaultLocation, punchIn, setState]
  );

  /** Closes a session that hit the configured safety cap. */
  const closeTimedOutSession = useCallback(
    (fallbackLocation?: string) => {
      const current = stateRef.current.activeWorkstationSession;
      if (!current || !current.startTime) return null;
      const start = parseISO(current.startTime);
      if (!isValid(start)) return null;

      const maxMins = getMaxWorkstationSessionMinutes(stateRef.current);
      return punchOut({
        endTime: new Date(start.getTime() + maxMins * 60 * 1000),
        durationMinutes: maxMins,
        fallbackLocation,
      });
    },
    [punchOut]
  );

  /** Add or update a workstation interval on `dateStr`. */
  const saveInterval = useCallback(
    ({
      dateStr,
      startTime,
      endTime,
      durationMinutes,
      location,
      note,
      editingId,
    }: SaveIntervalPayload) => {
      setState((prev) => {
        const existing = prev.workstationLogs?.[dateStr] || [];
        let updated: WorkstationInterval[];
        if (editingId) {
          updated = existing.map((item) =>
            item.id === editingId
              ? {
                  ...item,
                  startTime,
                  endTime,
                  durationMinutes,
                  location,
                  note: note?.trim() || undefined,
                }
              : item
          );
        } else {
          const newInterval: WorkstationInterval = {
            id: `ws_manual_${Date.now()}`,
            date: dateStr,
            startTime,
            endTime,
            durationMinutes,
            location,
            note: note?.trim() || undefined,
          };
          updated = [...existing, newInterval];
        }

        updated.sort((a, b) => {
          const tA = a.startTime ? new Date(a.startTime).getTime() : 0;
          const tB = b.startTime ? new Date(b.startTime).getTime() : 0;
          return tA - tB;
        });

        return commit({
          ...prev,
          workstationLogs: {
            ...(prev.workstationLogs || {}),
            [dateStr]: updated,
          },
        });
      });
      playSound('click');
    },
    [commit, setState]
  );

  /** Delete a workstation interval on `dateStr`. */
  const deleteInterval = useCallback(
    (dateStr: string, intervalId: string) => {
      setState((prev) => {
        const existing = prev.workstationLogs?.[dateStr] || [];
        const filtered = existing.filter((i) => i.id !== intervalId);
        return commit({
          ...prev,
          workstationLogs: {
            ...(prev.workstationLogs || {}),
            [dateStr]: filtered,
          },
        });
      });
      playSound('pop');
    },
    [commit, setState]
  );

  /** Update the end time of a recently auto-closed or recorded interval. */
  const updateIntervalEndTime = useCallback(
    (dateStr: string, intervalId: string, newEndTimeISO: string, newDurationMinutes: number) => {
      setState((prev) => {
        const existing = prev.workstationLogs?.[dateStr] || [];
        const updated = existing.map((item) =>
          item.id === intervalId
            ? {
                ...item,
                endTime: newEndTimeISO,
                durationMinutes: Math.max(1, newDurationMinutes),
              }
            : item
        );
        return commit({
          ...prev,
          workstationLogs: {
            ...(prev.workstationLogs || {}),
            [dateStr]: updated,
          },
        });
      });
      playSound('click');
    },
    [commit, setState]
  );

  return {
    active,
    punchIn,
    punchOut,
    switchLocation,
    closeTimedOutSession,
    saveInterval,
    deleteInterval,
    updateIntervalEndTime,
  };
}
