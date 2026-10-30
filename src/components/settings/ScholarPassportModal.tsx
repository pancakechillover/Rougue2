import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import {
  User,
  Key,
  Lock,
  LogIn,
  UserPlus,
  LogOut,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Cloud,
  Sparkles,
  Trash2,
  X,
  Eye,
  EyeOff,
  Search,
  Users,
  Database,
  FileText
} from 'lucide-react';
import { AppState } from '../../types';
import { cn, getDeviceCode, getBrowserEnvLabel, resetDeviceCode } from '../../lib/utils';
import {
  isValidUsernameForSignUp,
  isValidUsernameForSignIn,
  isValidPassword,
  USERNAME_MIN,
  USERNAME_MAX,
  PASSWORD_MIN,
  PASSWORD_MAX,
} from '../../lib/authRules';

const USER_AGREEMENT_SECTIONS = [
  {
    title: '1. Account Credentials & Zero-Recovery Encryption',
    body: 'Your Scholar Passport password is encrypted using cryptographic key derivation (scrypt) and is never stored in plain text. Because Scholar’s Dungeon does not collect your email address or phone number, forgotten passwords cannot be recovered or reset. Please record your credentials securely.'
  },
  {
    title: '2. Cloud Save & Free-Tier Storage Lifecycle',
    body: 'Cloud Archives and Fellowship Guilds operate on shared community infrastructure. To preserve capacity for active scholars, cloud saves or guilds with no activity for 15 consecutive days may be automatically pruned. You are strongly encouraged to periodically export local JSON backups.'
  },
  {
    title: '3. Fellowship Guild Code of Conduct',
    body: 'When joining or creating a Fellowship Guild, your scholar display name, avatar, title, level, bio, and focus time statistics are shared with fellow guild members. Respectful collaboration is required; captains reserve the right to remove disruptive members.'
  },
  {
    title: '4. Device Sequence & Web Push Reminders',
    body: 'When syncing or enabling Web Push notifications, an anonymous device sequence hash and browser push endpoint are stored solely to route your scheduled task reminders and prevent duplicate sync conflicts across your devices.'
  },
  {
    title: '5. Data Ownership & Right to Erasure',
    body: 'You retain full ownership of your focus history, tasks, and progression records. No personal data is sold or shared with third-party advertisers. You may overwrite or permanently delete your Cloud Archive at any time from your Scholar Passport dashboard.'
  }
];


interface ScholarPassportModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  authLoading?: boolean;
  authError?: string | null;
  setAuthError?: (err: string | null) => void;
  onLogin: (
    username: string,
    password: string,
    captchaCode?: string,
    captchaToken?: string
  ) => Promise<any>;
  onRegister: (
    username: string,
    password: string,
    registrationSecret: string,
    captchaCode?: string,
    captchaToken?: string
  ) => Promise<any>;
  onLogout: () => Promise<void>;
  isSyncing: boolean;
  isVerifying?: boolean;
  syncError: string | null;
  setSyncError?: (err: string | null) => void;
  syncCheckResult: {
    status: 'no_save' | 'cloud_newer' | 'local_newer';
    cloudData?: any;
    code: string;
  } | null;
  onSyncNow: () => void;
  onVerify: () => void;
  onResolveConflict: (useCloud: boolean) => void;
  onCancelConflict: () => void;
  onDeleteCloudData: () => void;
  promptMessage?: string | null;
  onClearPromptMessage?: () => void;
  initialTab?: 'login' | 'register';
}

export const ScholarPassportModal: React.FC<ScholarPassportModalProps> = ({
  isOpen,
  onClose,
  state,
  authLoading,
  authError,
  setAuthError,
  onLogin,
  onRegister,
  onLogout,
  isSyncing,
  isVerifying,
  syncError,
  setSyncError,
  syncCheckResult,
  onSyncNow,
  onVerify,
  onResolveConflict,
  onCancelConflict,
  onDeleteCloudData,
  promptMessage,
  onClearPromptMessage,
  initialTab = 'login'
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registrationSecret, setRegistrationSecret] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showRegistrationSecret, setShowRegistrationSecret] = useState(false);
  const [localFormError, setLocalFormError] = useState<string | null>(null);
  const [captchaSvg, setCaptchaSvg] = useState<string>('');
  const [captchaToken, setCaptchaToken] = useState<string>('');
  const [captchaLoading, setCaptchaLoading] = useState<boolean>(false);
  /**
   * Set when the challenge could not be fetched. The dialog used to silently
   * substitute a client-generated challenge in that case, but the server only
   * accepts codes it signed, so the user was asked to retype a code that could
   * never pass - and the error they got blamed the code, not the outage.
   */
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [captchaInput, setCaptchaInput] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showUserAgreement, setShowUserAgreement] = useState(false);
  const [usernameCheckStatus, setUsernameCheckStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle');
  const [usernameCheckMsg, setUsernameCheckMsg] = useState<string | null>(null);

  const refreshCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    setCaptchaInput('');
    try {
      const res = await fetch(`/api/auth?action=captcha&_t=${Date.now()}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success && typeof data.svg === 'string' && typeof data.captchaToken === 'string') {
        setCaptchaSvg(data.svg);
        setCaptchaToken(data.captchaToken);
        setCaptchaError(null);
        return;
      }
      setCaptchaSvg('');
      setCaptchaToken('');
      setCaptchaError('Verification service is unavailable. Please retry.');
    } catch {
      setCaptchaSvg('');
      setCaptchaToken('');
      setCaptchaError('Verification service is unreachable. Please retry.');
    } finally {
      setCaptchaLoading(false);
    }
  }, []);

  const [copiedId, setCopiedId] = useState(false);

  // Timers that outlive a single render must be cancelled on unmount, otherwise
  // a closed modal still fires a stray verify request / a setState on a dead tree.
  const verifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (verifyTimerRef.current) clearTimeout(verifyTimerRef.current);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    },
    []
  );

  // Confirmation sub-view for destructive / overwrite actions
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    isDanger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    if (isOpen && !(state.account?.token && state.account?.userId)) {
      void refreshCaptcha();
    }
  }, [isOpen, refreshCaptcha, state.account?.token, state.account?.userId]);

  // Real-time debounced username duplicate check during Sign Up
  useEffect(() => {
    if (!isOpen || activeTab !== 'register' || (state.account?.token && state.account?.userId)) {
      setUsernameCheckStatus('idle');
      setUsernameCheckMsg(null);
      return;
    }

    const trimmed = username.trim();
    if (!trimmed) {
      setUsernameCheckStatus('idle');
      setUsernameCheckMsg(null);
      return;
    }

    if (!isValidUsernameForSignUp(trimmed)) {
      setUsernameCheckStatus('invalid');
      setUsernameCheckMsg(
        `Must be ${USERNAME_MIN}–${USERNAME_MAX} characters (letters, numbers, or underscores only).`
      );
      return;
    }

    setUsernameCheckStatus('checking');
    setUsernameCheckMsg('Checking username availability...');

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/auth?action=check_username&username=${encodeURIComponent(trimmed)}&_t=${Date.now()}`,
          {
            method: 'GET',
            headers: { Accept: 'application/json' },
            cache: 'no-store',
            signal: controller.signal
          }
        );
        const data = await res.json().catch(() => ({}));
        if (controller.signal.aborted) return;

        if (res.ok && data?.success) {
          if (data.valid === false) {
            setUsernameCheckStatus('invalid');
            setUsernameCheckMsg(
              data.message || 'Must be 3–20 characters (letters, numbers, or underscores only).'
            );
          } else if (data.available === false) {
            setUsernameCheckStatus('taken');
            setUsernameCheckMsg(data.message || `Username "@${trimmed}" is already taken.`);
          } else {
            setUsernameCheckStatus('available');
            setUsernameCheckMsg(data.message || `Username "@${trimmed}" is available.`);
          }
        } else {
          setUsernameCheckStatus('idle');
          setUsernameCheckMsg(null);
        }
      } catch {
        if (!controller.signal.aborted) {
          setUsernameCheckStatus('idle');
          setUsernameCheckMsg(null);
        }
      }
    }, 320);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [isOpen, activeTab, username, state.account?.token, state.account?.userId]);

  if (!isOpen) return null;

  const account = state.account;
  const isAuthenticated = Boolean(account?.token && account?.userId);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalFormError(null);
    setAuthError?.(null);
    setSyncError?.(null);

    const prefix = activeTab === 'register' ? 'Sign-up failed' : 'Log-in failed';
    const trimmedUser = username.trim();

    if (!trimmedUser) {
      setLocalFormError(`${prefix}: Please enter your Scholar Username.`);
      return;
    }

    // Sign-up is strict; sign-in only checks the floor and character set, so an
    // account created before the rules were unified can still get in.
    const usernameAcceptable =
      activeTab === 'register'
        ? isValidUsernameForSignUp(trimmedUser)
        : isValidUsernameForSignIn(trimmedUser);

    if (!usernameAcceptable) {
      setLocalFormError(
        activeTab === 'register'
          ? `${prefix}: Username "${trimmedUser}" is invalid. Must be ${USERNAME_MIN}–${USERNAME_MAX} characters using only letters, numbers, or underscores.`
          : `${prefix}: Username "${trimmedUser}" is invalid. Must be at least ${USERNAME_MIN} characters using only letters, numbers, or underscores.`
      );
      return;
    }

    if (activeTab === 'register' && usernameCheckStatus === 'taken') {
      setLocalFormError(
        `Sign-up failed: Username "@${trimmedUser}" is already taken. Please choose another username or switch to Log In.`
      );
      return;
    }

    if (!password) {
      setLocalFormError(`${prefix}: Please enter your password.`);
      return;
    }

    // Captured before the guard below: isValidPassword is a type predicate, so
    // inside its failure branch TypeScript narrows `password` to never.
    const passwordLength = password.length;
    if (!isValidPassword(password)) {
      setLocalFormError(
        `${prefix}: Password length must be between ${PASSWORD_MIN} and ${PASSWORD_MAX} characters (currently ${passwordLength}).`
      );
      return;
    }

    if (activeTab === 'register') {
      if (!confirmPassword) {
        setLocalFormError('Sign-up failed: Please confirm your password.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalFormError('Sign-up failed: Confirm Password does not match your password.');
        return;
      }
      if (!registrationSecret.trim()) {
        setLocalFormError('Sign-up failed: Please enter the Registration Invite Key.');
        return;
      }
      if (!agreedToTerms) {
        setLocalFormError(
          'Sign-up failed: You must read and agree to the Scholar Passport User Agreement before signing up.'
        );
        return;
      }
    }

    if (!captchaInput.trim()) {
      setLocalFormError(`${prefix}: Please enter the 4-character verification code.`);
      return;
    }

    if (captchaInput.trim().length !== 4 || !captchaToken) {
      setLocalFormError(
        `${prefix}: Verification code must be 4 characters. Please check the code and try again.`
      );
      return;
    }

    if (activeTab === 'register') {
      const res = await onRegister(
        trimmedUser,
        password,
        registrationSecret.trim(),
        captchaInput.trim().toUpperCase(),
        captchaToken
      );
      if (res.success) {
        setPassword('');
        setConfirmPassword('');
        setRegistrationSecret('');
        setCaptchaInput('');
        if (verifyTimerRef.current) clearTimeout(verifyTimerRef.current);
        verifyTimerRef.current = setTimeout(() => onVerify(), 150);
      } else {
        if (typeof res.error === 'string' && res.error.toLowerCase().includes('already taken')) {
          setUsernameCheckStatus('taken');
          setUsernameCheckMsg(`Username "@${trimmedUser}" is already taken.`);
        }
        setLocalFormError(
          res.error || 'Sign-up failed: Unable to sign up. Please check your inputs and try again.'
        );
        void refreshCaptcha();
      }
    } else {
      const res = await onLogin(
        trimmedUser,
        password,
        captchaInput.trim().toUpperCase(),
        captchaToken
      );
      if (res.success) {
        setPassword('');
        setCaptchaInput('');
        if (verifyTimerRef.current) clearTimeout(verifyTimerRef.current);
        verifyTimerRef.current = setTimeout(() => onVerify(), 150);
      } else {
        setLocalFormError(
          res.error || 'Log-in failed: Unable to log in. Please check your username and password.'
        );
        void refreshCaptcha();
      }
    }
  };

  const copyUserId = () => {
    if (!account?.userId) return;
    navigator.clipboard.writeText(account.userId);
    setCopiedId(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopiedId(false), 2000);
  };

  const cloudState = syncCheckResult?.cloudData?.state || syncCheckResult?.cloudData;
  const cloudTimeStr = syncCheckResult?.cloudData?.lastUpdated
    ? new Date(syncCheckResult.cloudData.lastUpdated).toLocaleString()
    : 'Unknown';
  const localTimeStr = state.lastUpdated
    ? new Date(state.lastUpdated).toLocaleString()
    : 'Unsaved';

  // Which browser/device each side came from. Chrome and Edge on one machine have
  // separate saves, so the browser name is appended to keep them distinguishable.
  const localDeviceLabel = `${state.deviceNickname || state.deviceType || 'This device'} · ${getBrowserEnvLabel()}`;
  const cloudDeviceLabel =
    cloudState?.deviceNickname ||
    syncCheckResult?.cloudData?.savedBy ||
    (syncCheckResult?.cloudData?.savedByDeviceCode
      ? `Device ${String(syncCheckResult.cloudData.savedByDeviceCode).slice(0, 6)}`
      : 'Unknown');

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        className="bg-slate-900 border border-indigo-500/30 rounded-3xl shadow-2xl w-full max-w-lg relative overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Ambient Glow */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-indigo-500/5 blur-3xl rounded-full" />
        </div>

        {/* Header */}
        <div className="relative z-10 px-6 pt-6 pb-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/15 border border-indigo-500/30 rounded-2xl text-indigo-400">
              <Cloud size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight italic pr-1">
                Scholar Passport
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Unified Cloud Archive, Fellowship Guild & Push Identity
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (showUserAgreement) {
                setShowUserAgreement(false);
              } else if (confirmAction) {
                setConfirmAction(null);
              } else {
                onClose();
              }
            }}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="relative z-10 p-6 overflow-y-auto custom-scrollbar space-y-5 flex-1">
          {/* Prompt Banner (e.g. when redirected from Join/Create Guild) */}
          {!isAuthenticated && !showUserAgreement && promptMessage && (
            <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-start gap-3">
              <LogIn size={18} className="text-indigo-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs text-slate-200 font-medium leading-relaxed">
                {promptMessage}
              </div>
              {onClearPromptMessage && (
                <button
                  onClick={onClearPromptMessage}
                  className="text-indigo-400 hover:text-white p-0.5"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {/* Error Banner (Only shown in Authenticated view; Sign In / Create Account shows errors directly above the bottom submit button) */}
          {isAuthenticated && !showUserAgreement && (localFormError || authError || syncError) && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-3">
              <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs text-rose-300 leading-relaxed">
                {localFormError || authError || syncError}
              </div>
              <button
                onClick={() => {
                  setLocalFormError(null);
                  setAuthError?.(null);
                  setSyncError?.(null);
                }}
                className="text-rose-400 hover:text-white p-0.5"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* User Agreement & Privacy Covenant Sub-View */}
          {showUserAgreement ? (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 border border-indigo-500/30 rounded-2xl space-y-3">
                <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
                  <FileText size={18} className="text-indigo-400 shrink-0" />
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider">
                      Scholar Passport User Agreement
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      Terms of Service, Cloud Archive Policy & Privacy Covenant
                    </p>
                  </div>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-1 text-xs text-slate-300 leading-relaxed">
                  {USER_AGREEMENT_SECTIONS.map((sec) => (
                    <div key={sec.title} className="space-y-1">
                      <h5 className="font-bold text-indigo-400 text-[11px] uppercase tracking-wide">
                        {sec.title}
                      </h5>
                      <p className="text-slate-400 text-[11px] leading-relaxed">{sec.body}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowUserAgreement(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAgreedToTerms(true);
                    setShowUserAgreement(false);
                    setLocalFormError(null);
                  }}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5"
                >
                  <Check size={14} />
                  I Agree & Continue
                </button>
              </div>
            </div>
          ) : confirmAction ? (
            <div className="p-5 bg-slate-950/90 border border-slate-800 rounded-2xl space-y-4">
              <div className="flex items-center gap-2.5">
                <AlertTriangle
                  size={20}
                  className={confirmAction.isDanger ? 'text-rose-400' : 'text-indigo-400'}
                />
                <h4 className="text-base font-bold text-white">{confirmAction.title}</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{confirmAction.message}</p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const fn = confirmAction.onConfirm;
                    setConfirmAction(null);
                    fn();
                  }}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors text-white',
                    confirmAction.isDanger
                      ? 'bg-rose-600 hover:bg-rose-500'
                      : 'bg-indigo-600 hover:bg-indigo-500'
                  )}
                >
                  {confirmAction.confirmLabel}
                </button>
              </div>
            </div>
          ) : isAuthenticated && syncCheckResult ? (
            /* Cloud vs Local Comparison View */
            <div className="space-y-4">
              <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                    <Cloud size={15} />
                    {syncCheckResult.status === 'no_save'
                      ? 'No Cloud Archive Found'
                      : syncCheckResult.status === 'cloud_newer'
                        ? 'Cloud Archive is Newer'
                        : 'Archive Comparison'}
                  </span>
                  {account?.username && (
                    <span className="text-[10px] font-mono font-bold text-indigo-300">
                      @{account.username}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {syncCheckResult.status === 'no_save'
                    ? 'Your Scholar Passport does not have a cloud save yet. Upload your current local progress to initialize your archive.'
                    : 'Compare your local progress with the cloud archive below and choose which record to keep.'}
                </p>
              </div>

              {syncCheckResult.status !== 'no_save' && syncCheckResult.cloudData && (
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                  <div className="grid grid-cols-3 gap-2 text-[10px] font-black uppercase tracking-widest pb-2 border-b border-slate-800">
                    <span className="text-slate-500">Attribute</span>
                    <span className="text-center text-slate-300">Local Device</span>
                    <span className="text-center text-indigo-400">Cloud Archive</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs items-center">
                    <span className="text-slate-400">Level / XP</span>
                    <span className="text-center font-mono font-bold text-white">
                      Lv. {state.level || 1} · {(state.xp || 0).toLocaleString()}
                    </span>
                    <span className="text-center font-mono font-bold text-indigo-300">
                      Lv. {cloudState?.level ?? 1} · {(cloudState?.xp ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs items-center">
                    <span className="text-slate-400">Gold</span>
                    <span className="text-center font-mono font-bold text-amber-400">
                      {(state.coins || 0).toLocaleString()}
                    </span>
                    <span className="text-center font-mono font-bold text-amber-300">
                      {(cloudState?.coins ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs items-center">
                    <span className="text-slate-400">Sessions</span>
                    <span className="text-center font-mono text-slate-200">
                      {state.history?.length || 0}
                    </span>
                    <span className="text-center font-mono text-indigo-300">
                      {cloudState?.history?.length ?? 0}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] items-center pt-2 border-t border-slate-800/70">
                    <span className="text-slate-500">Updated</span>
                    <span className="text-center font-mono text-slate-400 truncate" title={localTimeStr}>
                      {localTimeStr}
                    </span>
                    <span className="text-center font-mono text-indigo-400 truncate" title={cloudTimeStr}>
                      {cloudTimeStr}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] items-center">
                    <span className="text-slate-500">Saved By</span>
                    <span className="text-center font-mono text-slate-400 truncate" title={localDeviceLabel}>
                      {localDeviceLabel}
                    </span>
                    <span className="text-center font-mono text-indigo-400 truncate" title={cloudDeviceLabel}>
                      {cloudDeviceLabel}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                {syncCheckResult.status === 'no_save' ? (
                  <button
                    onClick={() => onResolveConflict(false)}
                    disabled={isSyncing}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                  >
                    <Cloud size={16} />
                    Initialize Cloud Archive
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() =>
                        setConfirmAction({
                          title: 'Restore Cloud Archive to Local?',
                          message:
                            'This will overwrite your current local progress on this device with the Cloud Archive.',
                          confirmLabel: 'Use Cloud Save',
                          onConfirm: () => onResolveConflict(true)
                        })
                      }
                      disabled={isSyncing}
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-black uppercase tracking-widest text-[11px] transition-all"
                    >
                      Use Cloud Save
                    </button>
                    <button
                      onClick={() =>
                        setConfirmAction({
                          title: 'Overwrite Cloud Archive with Local?',
                          message:
                            'This will overwrite your Cloud Archive with the data currently on this device.',
                          confirmLabel: 'Upload Local Save',
                          onConfirm: () => onResolveConflict(false)
                        })
                      }
                      disabled={isSyncing}
                      className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all"
                    >
                      Keep Local Save
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={onCancelConflict}
                className="w-full py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
              >
                {syncCheckResult.status === 'no_save' ? 'Not Now' : 'Dismiss Comparison'}
              </button>
            </div>
          ) : !isAuthenticated ? (
            /* Unauthenticated View: Log In / Sign Up */
            <div className="space-y-5">
              {/* Segmented Tabs */}
              <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab !== 'login') {
                      setActiveTab('login');
                      setLocalFormError(null);
                      setAuthError?.(null);
                      void refreshCaptcha();
                    }
                  }}
                  className={cn(
                    'py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2',
                    activeTab === 'login'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                      : 'text-slate-400 hover:text-slate-200'
                  )}
                >
                  <LogIn size={14} />
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab !== 'register') {
                      setActiveTab('register');
                      setLocalFormError(null);
                      setAuthError?.(null);
                      void refreshCaptcha();
                    }
                  }}
                  className={cn(
                    'py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2',
                    activeTab === 'register'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                      : 'text-slate-400 hover:text-slate-200'
                  )}
                >
                  <UserPlus size={14} />
                  Sign Up
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between ml-1 mr-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <User size={12} className="text-indigo-400" />
                      Scholar Username
                    </label>
                    {activeTab === 'register' && usernameCheckStatus === 'checking' && (
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <RefreshCw size={10} className="animate-spin text-indigo-400" />
                        Checking...
                      </span>
                    )}
                    {activeTab === 'register' && usernameCheckStatus === 'available' && (
                      <span className="text-[10px] font-bold text-indigo-400 flex items-center gap-1">
                        <CheckCircle2 size={11} />
                        Available
                      </span>
                    )}
                    {activeTab === 'register' && usernameCheckStatus === 'taken' && (
                      <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1">
                        <AlertTriangle size={11} />
                        Already Taken
                      </span>
                    )}
                    {activeTab === 'register' && usernameCheckStatus === 'invalid' && (
                      <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                        <AlertTriangle size={11} />
                        Invalid Format
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      autoComplete="username"
                      placeholder="3-20 letters, numbers, or _"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={cn(
                        'w-full px-4 py-3 bg-slate-950 border rounded-xl text-white placeholder:text-slate-600 text-sm font-medium focus:outline-none transition-colors',
                        activeTab === 'register' && usernameCheckStatus === 'taken'
                          ? 'border-rose-500/60 focus:border-rose-500 pr-10'
                          : activeTab === 'register' && usernameCheckStatus === 'invalid'
                            ? 'border-amber-500/60 focus:border-amber-500 pr-10'
                            : activeTab === 'register' && usernameCheckStatus === 'available'
                              ? 'border-indigo-500/60 focus:border-indigo-500 pr-10'
                              : 'border-slate-800 focus:border-indigo-500'
                      )}
                    />
                    {activeTab === 'register' && usernameCheckStatus !== 'idle' && (
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
                        {usernameCheckStatus === 'checking' && (
                          <RefreshCw size={15} className="animate-spin text-indigo-400" />
                        )}
                        {usernameCheckStatus === 'available' && (
                          <CheckCircle2 size={16} className="text-indigo-400" />
                        )}
                        {usernameCheckStatus === 'taken' && (
                          <AlertTriangle size={16} className="text-rose-400" />
                        )}
                        {usernameCheckStatus === 'invalid' && (
                          <AlertTriangle size={16} className="text-amber-400" />
                        )}
                      </div>
                    )}
                  </div>
                  {activeTab === 'register' && usernameCheckMsg && (
                    <p
                      className={cn(
                        'text-[11px] font-medium ml-1 leading-relaxed',
                        usernameCheckStatus === 'taken'
                          ? 'text-rose-400'
                          : usernameCheckStatus === 'invalid'
                            ? 'text-amber-400'
                            : usernameCheckStatus === 'available'
                              ? 'text-indigo-400'
                              : 'text-slate-400'
                      )}
                    >
                      {usernameCheckMsg}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                    <Lock size={12} className="text-indigo-400" />
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={activeTab === 'login' ? 'current-password' : 'new-password'}
                      placeholder="6-64 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-4 pr-10 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-white placeholder:text-slate-600 text-sm font-medium focus:outline-none transition-colors [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {activeTab === 'register' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                        <Lock size={12} className="text-indigo-400" />
                        Confirm Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          placeholder="Re-enter your password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full pl-4 pr-10 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-white placeholder:text-slate-600 text-sm font-medium focus:outline-none transition-colors [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                          aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                        <Key size={12} />
                        Registration Invite Key
                      </label>
                      <div className="relative">
                        <input
                          type={showRegistrationSecret ? 'text' : 'password'}
                          autoComplete="off"
                          placeholder="Enter server invite key"
                          value={registrationSecret}
                          onChange={(e) => setRegistrationSecret(e.target.value)}
                          className="w-full pl-4 pr-10 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-white placeholder:text-slate-600 text-sm font-mono focus:outline-none transition-colors [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegistrationSecret(!showRegistrationSecret)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                          aria-label={showRegistrationSecret ? 'Hide registration invite key' : 'Show registration invite key'}
                        >
                          {showRegistrationSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 ml-1 leading-relaxed">
                        Invite-only beta protection. Note: Passwords are encrypted and cannot be recovered if forgotten.
                      </p>
                    </div>
                  </>
                )}

                {/* Server-Side SVG Captcha (svg-captcha) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={12} className="text-indigo-400" />
                      Verification Code
                    </span>
                    <button
                      type="button"
                      onClick={() => void refreshCaptcha()}
                      disabled={captchaLoading}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
                      title="Refresh Verification Code"
                    >
                      <RefreshCw size={10} className={cn(captchaLoading && 'animate-spin')} />
                      Refresh
                    </button>
                  </label>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="text"
                      maxLength={4}
                      autoComplete="off"
                      placeholder="4-char code"
                      value={captchaInput}
                      onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                      className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-white placeholder:text-slate-600 text-sm font-mono font-bold tracking-widest uppercase focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => void refreshCaptcha()}
                      title="Click to generate a new verification code"
                      className="w-[132px] h-[46px] px-1.5 bg-slate-950 border border-slate-800 hover:border-indigo-500/50 rounded-xl flex items-center justify-center shrink-0 transition-all relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors pointer-events-none" />
                      {captchaError && !captchaSvg ? (
                        <span className="flex flex-col items-center gap-0.5 text-[9px] font-black text-rose-400 leading-none text-center">
                          <AlertTriangle size={14} />
                          RETRY
                        </span>
                      ) : captchaLoading || !captchaSvg ? (
                        <RefreshCw size={16} className="animate-spin text-indigo-400" />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                          dangerouslySetInnerHTML={{ __html: captchaSvg }}
                        />
                      )}
                    </button>
                  </div>
                </div>

                {/* User Agreement Checkbox (Mandatory for Create Account, accessible link for Sign In) */}
                {activeTab === 'register' ? (
                  <div className="pt-1">
                    <div className="flex items-start gap-2.5 p-3 bg-slate-950/70 border border-slate-800/90 rounded-xl">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={agreedToTerms}
                        onClick={() => setAgreedToTerms(!agreedToTerms)}
                        className={cn(
                          'w-4 h-4 mt-0.5 rounded flex items-center justify-center border transition-all shrink-0',
                          agreedToTerms
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-900 border-slate-700 text-transparent hover:border-indigo-500/50'
                        )}
                      >
                        <Check size={11} strokeWidth={3} />
                      </button>
                      <div className="text-[11px] text-slate-400 leading-relaxed">
                        I have read and agree to the{' '}
                        <button
                          type="button"
                          onClick={() => setShowUserAgreement(true)}
                          className="text-indigo-400 hover:text-indigo-300 font-bold underline underline-offset-2"
                        >
                          Scholar Passport User Agreement & Privacy Covenant
                        </button>
                        .
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                    <span>By logging in, you accept our covenant.</span>
                    <button
                      type="button"
                      onClick={() => setShowUserAgreement(true)}
                      className="text-indigo-400 hover:text-indigo-300 font-bold underline underline-offset-2 flex items-center gap-1"
                    >
                      <FileText size={11} />
                      User Agreement
                    </button>
                  </div>
                )}

                {(localFormError || authError || syncError) && (
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5">
                    <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                    <span className="flex-1 text-xs font-medium text-rose-300 leading-relaxed">
                      {localFormError || authError || syncError}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setLocalFormError(null);
                        setAuthError?.(null);
                        setSyncError?.(null);
                      }}
                      className="text-rose-400 hover:text-white p-0.5 shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    authLoading ||
                    isSyncing ||
                    // No challenge means the server will reject the submit anyway;
                    // keeping the button disabled makes the retry control the
                    // obvious next step instead of a guaranteed failure.
                    !captchaToken ||
                    (activeTab === 'register' &&
                      (usernameCheckStatus === 'taken' || usernameCheckStatus === 'invalid'))
                  }
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                >
                  {authLoading ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      Authenticating...
                    </>
                  ) : activeTab === 'login' ? (
                    <>
                      <LogIn size={15} />
                      Log In to Passport
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      Sign Up for Passport
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* Authenticated View: Scholar Passport Dashboard */
            <div className="space-y-5">
              {/* Identity Card */}
              <div className="p-5 bg-slate-950 border border-indigo-500/30 rounded-2xl relative overflow-hidden">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-indigo-500/15 border border-indigo-500/30 rounded-md text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                        <CheckCircle2 size={11} />
                        Active Passport
                      </span>
                      {state.teamId && (
                        <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-md text-[10px] font-bold text-slate-300 flex items-center gap-1">
                          <Users size={11} className="text-indigo-400" />
                          Guild Linked
                        </span>
                      )}
                    </div>
                    <h4 className="text-xl font-black text-white tracking-tight truncate pt-1">
                      @{account.username}
                    </h4>
                  </div>

                  <button
                    onClick={copyUserId}
                    className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-[10px] font-mono text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors shrink-0"
                    title="Copy Scholar Account ID"
                  >
                    <span>{account.userId.slice(0, 14)}...</span>
                    {copiedId ? <Check size={12} className="text-indigo-400" /> : <Copy size={12} />}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-800/80 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">
                      Last Cloud Sync
                    </span>
                    <span className="text-slate-300 font-mono text-[11px]">
                      {state.lastUpdated ? new Date(state.lastUpdated).toLocaleString() : 'Not synced yet'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">
                      Device Sequence
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px]">
                      <span className="truncate">
                        {state.deviceNickname || state.deviceType || 'PC'} · {getBrowserEnvLabel()} ({getDeviceCode().slice(0, 6)})
                      </span>
                      <button
                        type="button"
                        title="Reset this browser's device identity"
                        onClick={() =>
                          setConfirmAction({
                            title: 'Reset Device Identity?',
                            message:
                              'This browser will be registered as a new device. Only do this if another browser on the same computer shows the same device code, which makes sync treat them as one machine.',
                            confirmLabel: 'Reset Identity',
                            onConfirm: () => {
                              resetDeviceCode();
                              setConfirmAction(null);
                              window.location.reload();
                            }
                          })
                        }
                        className="shrink-0 p-1 rounded-md text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        <RefreshCw size={11} />
                      </button>
                    </span>
                  </div>
                </div>
              </div>

              {/* Cloud Sync Operations */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Database size={12} className="text-indigo-400" />
                    Cloud Archive Operations
                  </span>
                  {(isSyncing || isVerifying) && (
                    <span className="text-[10px] font-bold text-indigo-400 flex items-center gap-1">
                      <RefreshCw size={11} className="animate-spin" />
                      Synchronizing...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={onSyncNow}
                    disabled={isSyncing || isVerifying}
                    className="py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                  >
                    <RefreshCw size={14} className={cn((isSyncing || isVerifying) && 'animate-spin')} />
                    Sync Now
                  </button>
                  <button
                    onClick={onVerify}
                    disabled={isSyncing || isVerifying}
                    className="py-3 px-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2"
                  >
                    <Search size={14} />
                    Verify & Compare
                  </button>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setConfirmAction({
                      title: 'Delete Cloud Archive?',
                      message:
                        'This will permanently erase your Cloud Save from the server. Your local data on this device will remain intact.',
                      confirmLabel: 'Delete Cloud Save',
                      isDanger: true,
                      onConfirm: onDeleteCloudData
                    })
                  }
                  className="px-3.5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Trash2 size={14} />
                  Delete Cloud Save
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setConfirmAction({
                      title: 'Sign Out of Scholar Passport?',
                      message:
                        'Your local progress will stay on this device, but automatic cloud sync and guild identity will pause until you sign back in.',
                      confirmLabel: 'Sign Out',
                      onConfirm: async () => {
                        await onLogout();
                      }
                    })
                  }
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
};
