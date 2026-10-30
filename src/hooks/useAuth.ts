import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, ScholarAccount } from '../types';

export const AUTH_STORAGE_KEY = 'scholars_dungeon_auth';
const MAIN_STATE_STORAGE_KEY = 'scholars_dungeon_state';

export function getStoredAccount(): ScholarAccount | null {
  try {
    const rawAuth = localStorage.getItem(AUTH_STORAGE_KEY);
    if (rawAuth) {
      const parsed = JSON.parse(rawAuth);
      if (parsed && typeof parsed.userId === 'string' && typeof parsed.token === 'string') {
        return parsed as ScholarAccount;
      }
    }
    const rawState = localStorage.getItem(MAIN_STATE_STORAGE_KEY);
    if (rawState) {
      const parsedState = JSON.parse(rawState);
      if (
        parsedState?.account &&
        typeof parsedState.account.userId === 'string' &&
        typeof parsedState.account.token === 'string'
      ) {
        return parsedState.account as ScholarAccount;
      }
    }
  } catch {
    // Ignore storage read errors
  }
  return null;
}

function persistAccountToStorage(account: ScholarAccount | null): void {
  try {
    if (account) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(account));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota errors
  }
}

export interface UseAuthOptions {
  state?: AppState;
  onUpdateState?: (updates: Partial<AppState> | ((prev: AppState) => Partial<AppState>)) => void;
}

export interface AuthActionResult {
  success: boolean;
  account?: ScholarAccount;
  error?: string;
}

export function useAuth(options: UseAuthOptions = {}) {
  const { state, onUpdateState } = options;

  const [account, setAccount] = useState<ScholarAccount | null>(() => {
    if (state?.account && state.account.userId && state.account.token) {
      return state.account;
    }
    return getStoredAccount();
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isVerifyingSession, setIsVerifyingSession] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const onUpdateStateRef = useRef(onUpdateState);
  onUpdateStateRef.current = onUpdateState;

  const stateRef = useRef(state);
  stateRef.current = state;

  const syncAccountState = useCallback((nextAccount: ScholarAccount | null) => {
    setAccount(nextAccount);
    persistAccountToStorage(nextAccount);

    if (onUpdateStateRef.current) {
      onUpdateStateRef.current((prev) => {
        const updates: Partial<AppState> = {
          ...(prev || {}),
          account: nextAccount,
        };
        if (nextAccount?.teamId && !prev?.teamId) {
          updates.teamId = nextAccount.teamId;
        }
        return updates;
      });
    }
  }, []);

  // Keep hook state aligned if parent AppState.account changes externally
  useEffect(() => {
    if (state?.account !== undefined) {
      const incoming = state.account;
      if (incoming?.token !== account?.token || incoming?.userId !== account?.userId) {
        setAccount(incoming || null);
        persistAccountToStorage(incoming || null);
      }
    }
  }, [state?.account, account?.token, account?.userId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshSession = useCallback(async (): Promise<ScholarAccount | null> => {
    const current = account || getStoredAccount();
    if (!current?.token) return null;

    setIsVerifyingSession(true);
    try {
      const res = await fetch('/api/auth?action=me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${current.token}`,
        },
      });

      if (res.status === 401) {
        // Session expired or invalidated on server; transition cleanly to Guest Mode
        syncAccountState(null);
        return null;
      }

      if (!res.ok) {
        // Network / 5xx error: preserve local session for offline resilience
        return current;
      }

      const data = await res.json();
      if (data?.success && data?.account) {
        const refreshed: ScholarAccount = {
          ...current,
          ...data.account,
          token: data.account.token || current.token,
        };
        syncAccountState(refreshed);
        return refreshed;
      }
      return current;
    } catch {
      // Offline or unreachable server: keep cached account intact
      return current;
    } finally {
      setIsVerifyingSession(false);
    }
  }, [account, syncAccountState]);

  // Automatically validate & renew session on initial mount if a token exists
  const didInitialVerifyRef = useRef(false);
  useEffect(() => {
    if (didInitialVerifyRef.current) return;
    didInitialVerifyRef.current = true;
    const stored = account || getStoredAccount();
    if (stored?.token) {
      void refreshSession();
    }
  }, [account, refreshSession]);

  const register = useCallback(
    async (
      username: string,
      password: string,
      registrationKey: string,
      captchaCode?: string,
      captchaToken?: string
    ): Promise<AuthActionResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/auth?action=register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.trim(),
            password,
            registrationKey: registrationKey.trim(),
            captchaCode: captchaCode?.trim(),
            captchaToken,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success || !data?.account) {
          const errMsg = data?.error || `Registration failed (HTTP ${res.status}).`;
          setError(errMsg);
          return { success: false, error: errMsg };
        }

        const newAccount: ScholarAccount = {
          ...data.account,
          token: data.token || data.account.token,
        };
        syncAccountState(newAccount);
        return { success: true, account: newAccount };
      } catch (err: any) {
        const errMsg = err?.message || 'Network error while registering account.';
        setError(errMsg);
        return { success: false, error: errMsg };
      } finally {
        setIsLoading(false);
      }
    },
    [syncAccountState]
  );

  const login = useCallback(
    async (
      username: string,
      password: string,
      captchaCode?: string,
      captchaToken?: string
    ): Promise<AuthActionResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/auth?action=login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.trim(),
            password,
            captchaCode: captchaCode?.trim(),
            captchaToken,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success || !data?.account) {
          const errMsg = data?.error || `Sign-in failed (HTTP ${res.status}).`;
          setError(errMsg);
          return { success: false, error: errMsg };
        }

        const loggedInAccount: ScholarAccount = {
          ...data.account,
          token: data.token || data.account.token,
        };
        syncAccountState(loggedInAccount);
        return { success: true, account: loggedInAccount };
      } catch (err: any) {
        const errMsg = err?.message || 'Network error while signing in.';
        setError(errMsg);
        return { success: false, error: errMsg };
      } finally {
        setIsLoading(false);
      }
    },
    [syncAccountState]
  );

  const logout = useCallback(async (): Promise<void> => {
    const current = account || getStoredAccount();
    setIsLoading(true);
    setError(null);
    try {
      if (current?.token) {
        await fetch('/api/auth?action=logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${current.token}`,
          },
          body: JSON.stringify({ token: current.token }),
        }).catch(() => {
          // Ignore network errors on logout; always clear local session
        });
      }
    } finally {
      syncAccountState(null);
      setIsLoading(false);
    }
  }, [account, syncAccountState]);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const current = account || getStoredAccount();
    if (current?.token) {
      return { Authorization: `Bearer ${current.token}` };
    }
    return {};
  }, [account]);

  return {
    account,
    isAuthenticated: Boolean(account?.userId && account?.token),
    isLoading,
    authLoading: isLoading,
    isVerifyingSession,
    error,
    authError: error,
    setError,
    setAuthError: setError,
    clearError,
    register,
    login,
    logout,
    refreshSession,
    getAuthHeaders,
  };
}
