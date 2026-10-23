import { useCallback, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { differenceInMinutes, parseISO, isValid } from 'date-fns';
import { AppState, ActiveWorkstationSession, WorkstationInterval } from '../types';
import { getSettlementDay } from '../lib/utils';
import { MAX_WORKSTATION_SESSION_MINUTES } from '../lib/workstationUtils';
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
  /** Overrides "now" — used by the 4h safety timeout. */
  endTime?: Date;
  /** Overrides the computed duration — used by the 4h safety timeout. */
  durationMinutes?: number;
  /** Location used when the active session has none recorded. */
  fallbackLocation?: string;
}

/**
 * Single source of truth for workstation punch-in / punch-out.
 *
 * Before this hook the same start/end logic lived in four places
 * (WorkstationHeaderControls, WorkstationModal, WorkstationView and the
 * timeout effect in App.tsx). Each copy wrote `activeWorkstationSession` and
 * `workstationLogs` on its own, so a rule change had to be applied four times.
 *
 * All callers now go through here. The hook does NOT own state: it reads and
 * writes the AppState passed in, so every window (including the PiP window)
 * converges on the same data.
 */
export function useWorkstation({
  state,
  setState,
  syncToCloud,
  defaultLocation = 'Home',
}: UseWorkstationOptions) {
  const active = state.activeWorkstationSession;

  /**
   * Latest state kept in a ref so the returned callbacks can stay stable.
   *
   * Without this, every state change rebuilt punchOut → closeTimedOutSession,
   * which made the timeout useEffect in App.tsx tear down and re-create its
   * 1s interval on every render. Reading from the ref keeps the callback
   * identity stable without stale closures.
   */
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

      const end = endTime ?? new Date();
      const minutes =
        durationMinutes ??
        Math.min(
          MAX_WORKSTATION_SESSION_MINUTES,
          Math.max(1, differenceInMinutes(end, start))
        );
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

  /** Closes a session that hit the 4-hour safety cap. */
  const closeTimedOutSession = useCallback(
    (fallbackLocation?: string) => {
      const current = stateRef.current.activeWorkstationSession;
      if (!current || !current.startTime) return null;
      const start = parseISO(current.startTime);
      if (!isValid(start)) return null;

      return punchOut({
        endTime: new Date(start.getTime() + MAX_WORKSTATION_SESSION_MINUTES * 60 * 1000),
        durationMinutes: MAX_WORKSTATION_SESSION_MINUTES,
        fallbackLocation,
      });
    },
    [punchOut]
  );

  return { active, punchIn, punchOut, closeTimedOutSession };
}
