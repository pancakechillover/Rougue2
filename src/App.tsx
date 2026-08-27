import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sword, 
  ShoppingBag, 
  BarChart3, 
  Timer as TimerIcon, 
  ChevronRight, 
  LayoutDashboard,
  Settings as SettingsIcon,
  User,
  Coins,
  Zap,
  Network,
  X,
  Trophy,
  Package,
  Scroll,
  Puzzle,
  RefreshCw,
  Gift,
  Flame
} from 'lucide-react';
import { AppIcon } from './components/icons/AppIcon';
import { DailySummaryModal } from './components/DailySummaryModal';
import { StartOfDayModal } from './components/StartOfDayModal';
import { CoinRain } from './components/CoinRain';
import { DashboardView } from './components/DashboardView';
import { ExploreView } from './components/ExploreView';
import { DungeonsView } from './components/dungeons/DungeonsView';
import { VaultView } from './components/VaultView';
import { TalentsView } from './components/TalentsView';
import { ShopView } from './components/ShopView';
import { StatsView } from './components/StatsView';
import { SettingsView } from './components/SettingsView';
import { ProfileModal } from './components/ProfileModal';
import { StreakRecordModal } from './components/StreakRecordModal';
import { GuideBookModal } from './components/GuideModals';
import { LevelUpModal } from './components/LevelUpModal';
import { RewardCompletionModal } from './components/RewardCompletionModal';
import { GachaResultModal } from './components/GachaResultModal';
import { BulkClaimModal } from './components/BulkClaimModal';
import { useGameState } from './hooks/useGameState';
import { useCloudSync } from './hooks/useCloudSync';
import { triggerSimpleConfetti } from './lib/effects';
import { cn, getXPForLevel, getSettlementDay, getTitleForLevel } from './lib/utils';
import { playSound } from './lib/sound';
import { Dungeon, MajorDungeon, DungeonReward, AppState } from './types';
import { CloudSyncModal } from './components/CloudSyncModal';
import { SplashScreen } from './components/SplashScreen';
import { CompactTimer } from './components/CompactTimer';
import { UpdateChecker } from './components/UpdateChecker';
import { useTimerStore } from './hooks/useTimerStore';
import { renderAvatar } from './components/TeamModule';

const isTalentLevel = (lvl: number) => {
  if (lvl <= 4) return true;
  if (lvl <= 16) return (lvl - 4) % 2 === 0;
  if (lvl <= 43) return (lvl - 16) % 3 === 0;
  return (lvl - 43) % 5 === 0;
};

const getNextTalentLevel = (currentLvl: number, levelRewards?: any[]) => {
  let nextLvl = currentLvl + 1;
  while (true) {
    const customReward = levelRewards?.find(r => r.level === nextLvl);
    if (customReward) {
      const subRewards = customReward.rewards && customReward.rewards.length > 0
        ? customReward.rewards
        : [{ type: customReward.type, amount: customReward.amount }];
      const hasTalent = subRewards.some((sub: any) => sub.type === 'talentPoint');
      if (hasTalent) return nextLvl;
    } else {
      if (isTalentLevel(nextLvl)) return nextLvl;
    }
    nextLvl++;
    if (nextLvl > 1000) return nextLvl;
  }
};

function App() {
  const [appReady, setAppReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'explore' | 'dungeons' | 'talents' | 'shop' | 'stats' | 'settings' | 'vault'>('dashboard');
  const [pipWindow, setPipWindow] = useState<Window | null>(null);

  useEffect(() => {
    // Inject any custom Quest Board CSS at app startup
    const savedCss = localStorage.getItem('questBoardCustomCss');
    if (savedCss && savedCss.trim() !== '') {
      let styleEl = document.getElementById('questboard-live-css');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'questboard-live-css';
        document.head.appendChild(styleEl);
      }
      styleEl.innerHTML = savedCss;
    }
  }, []);

  const [activeSettingsSection, setActiveSettingsSection] = useState<'menu' | 'general' | 'timer' | 'rewards' | 'shop' | 'gacha' | 'dev' | 'levelRewards' | 'about' | 'level' | 'merchant' | 'cloud' | 'calculator' | 'sage'>('menu');

  const canPip = 'documentPictureInPicture' in window && window.self === window.top;
  const isPWA = window.matchMedia('(display-mode: standalone)').matches;
  const isDesktop = !('ontouchstart' in window);

  // Timer States
  const [focusDuration, setFocusDuration] = useState(() => parseInt(localStorage.getItem('timer_focusDuration') || '25', 10));
  const [restDuration, setRestDuration] = useState(() => parseInt(localStorage.getItem('timer_restDuration') || '5', 10));
  const [enableRest, setEnableRest] = useState(() => localStorage.getItem('timer_enableRest') === 'true');
  const [isLooping, setIsLooping] = useState(() => localStorage.getItem('timer_isLooping') === 'true');
  const [isResting, setIsResting] = useState(() => localStorage.getItem('timer_isResting') === 'true');
  const [duration, setDuration] = useState(() => {
    const saved = localStorage.getItem('timer_duration');
    return saved ? parseInt(saved, 10) : 25;
  });
  const [isTimerActive, setIsTimerActive] = useState(() => localStorage.getItem('timer_isActive') === 'true');
  const [timerEndTime, setTimerEndTime] = useState<number | null>(() => {
    const saved = localStorage.getItem('timer_endTime');
    return saved ? parseInt(saved, 10) : null;
  });

  const [pipVictorySummary, setPipVictorySummary] = useState<{ xp: number, coins: number, ts: number } | null>(null);

  const [loopTarget, setLoopTarget] = useState(() => parseInt(localStorage.getItem('timer_loopTarget') || '0', 10));
  const [loopCount, setLoopCount] = useState(() => parseInt(localStorage.getItem('timer_loopCount') || '0', 10));

  const [timerPresets, setTimerPresets] = useState<{focus: number, rest: number}[]>(() => {
    const saved = localStorage.getItem('timer_presets');
    if (!saved) return [{focus: 25, rest: 5}, {focus: 50, rest: 10}];
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse timer presets:', e);
      return [{focus: 25, rest: 5}, {focus: 50, rest: 10}];
    }
  });

  // Timer Sync
  useEffect(() => {
    localStorage.setItem('timer_focusDuration', focusDuration.toString());
    localStorage.setItem('timer_restDuration', restDuration.toString());
    localStorage.setItem('timer_enableRest', enableRest.toString());
    localStorage.setItem('timer_isLooping', isLooping.toString());
    localStorage.setItem('timer_loopTarget', loopTarget.toString());
    localStorage.setItem('timer_loopCount', loopCount.toString());
    localStorage.setItem('timer_isResting', isResting.toString());
    localStorage.setItem('timer_duration', duration.toString());
    localStorage.setItem('timer_isActive', isTimerActive.toString());
    if (timerEndTime) {
      localStorage.setItem('timer_endTime', timerEndTime.toString());
    } else {
      localStorage.removeItem('timer_endTime');
    }
    localStorage.setItem('timer_presets', JSON.stringify(timerPresets));
  }, [focusDuration, restDuration, enableRest, isLooping, loopTarget, loopCount, isResting, duration, isTimerActive, timerEndTime, timerPresets]);

  const addTimerPreset = (focus: number, rest: number) => {
    if (!timerPresets.find(p => p.focus === focus && p.rest === rest)) {
      setTimerPresets(prev => [...prev, { focus, rest }]);
    }
  };

  const removeTimerPreset = (focus: number, rest: number) => {
    setTimerPresets(prev => prev.filter(p => !(p.focus === focus && p.rest === rest)));
  };

  const applyTimerPreset = (focus: number, rest: number) => {
    setFocusDuration(focus);
    setRestDuration(rest);
    setIsResting(false);
    setDuration(focus);
    useTimerStore.getState().setTimeLeft(focus * 60);
    setIsTimerActive(false);
    setTimerEndTime(null);
  };

  const togglePip = async () => {
    if (pipWindow) {
      pipWindow.close();
      setPipWindow(null);
      return;
    }

    if ('documentPictureInPicture' in window) {
      try {
        // @ts-ignore
        const pip = await window.documentPictureInPicture.requestWindow({
          width: 220,
          height: 300,
        });

        const copyStyles = () => {
          [...document.styleSheets].forEach((styleSheet) => {
            try {
              const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join("");
              const style = document.createElement("style");
              style.textContent = cssRules;
              pip.document.head.appendChild(style);
            } catch (e) {
              const link = document.createElement("link");
              if (styleSheet.href) {
                link.rel = "stylesheet";
                link.href = styleSheet.href;
                pip.document.head.appendChild(link);
              }
            }
          });
        };

        copyStyles();
        pip.document.body.style.backgroundColor = 'var(--color-slate-950, #020617)';
        pip.document.body.style.margin = '0';
        pip.document.body.style.overflow = 'hidden';
        if (document.documentElement.hasAttribute('data-theme')) {
          pip.document.documentElement.setAttribute('data-theme', document.documentElement.getAttribute('data-theme')!);
        }

        pip.addEventListener("pagehide", () => {
             setPipWindow(null);
        });
        setPipWindow(pip);
      } catch (err) {
        console.error('Failed to enter PiP mode:', err);
      }
    }
  };

  const handleTimerCustomChange = (focus: number, rest: number) => {
    const safeFocus = Math.max(1, focus);
    const safeRest = Math.max(1, rest);
    setFocusDuration(safeFocus);
    setRestDuration(safeRest);
    if (!isTimerActive) {
      if (isResting) {
        setDuration(safeRest);
        useTimerStore.getState().setTimeLeft(safeRest * 60);
      } else {
        setDuration(safeFocus);
        useTimerStore.getState().setTimeLeft(safeFocus * 60);
      }
    }
  };
  const [dungeonSubTab, setDungeonSubTab] = useState<'list' | 'quests' | 'achievements'>('list');
  const [isAddingMajor, setIsAddingMajor] = useState(false);
  const [isDungeonEditMode, setIsDungeonEditMode] = useState(false);
  const [isAddingQuest, setIsAddingQuest] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showTopStreakModal, setShowTopStreakModal] = useState(false);
  const [showXpTooltip, setShowXpTooltip] = useState(false);
  const [showTalentTooltip, setShowTalentTooltip] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', isSidebarCollapsed.toString());
  }, [isSidebarCollapsed]);
  const [isActiveTalentsCollapsed, setIsActiveTalentsCollapsed] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState('User');
  const [drawResult, setDrawResult] = useState<{item: string, rarity: string, poolType: 'gacha' | 'ichiban', color?: string}[] | null>(null);
  const [showCoinRain, setShowCoinRain] = useState(false);
  const [showBuildDetails, setShowBuildDetails] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState<number[] | null>(null);
  const [showGuideBook, setShowGuideBook] = useState(false);
  const [guideInitialPage, setGuideInitialPage] = useState(0);
  const [showDailySummary, setShowDailySummary] = useState(false);
  const [showStartOfDayModal, setShowStartOfDayModal] = useState<string | boolean>(false);
  const [showCloudSync, setShowCloudSync] = useState(false);
  const [isFullscreenExplore, setIsFullscreenExplore] = useState(false);

  // Global timer check to pop to explore tab and fullscreen when timer completes
  useEffect(() => {
    let interval: any = null;
    if (isTimerActive && timerEndTime) {
      interval = setInterval(() => {
        if (Date.now() >= timerEndTime) {
          if (activeTab !== 'explore') {
            setActiveTab('explore');
          }
          if (!isFullscreenExplore && !isResting) {
            setIsFullscreenExplore(true);
          }
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerActive, timerEndTime, activeTab, isFullscreenExplore, isResting]);

  const [isArchiveView, setIsArchiveView] = useState(false);
  
  const { 
    state, 
    dungeons, 
    setDungeons, 
    majorDungeons,
    setMajorDungeons,
    addXP,
    addCoins,
    addRewardToHistory,
    toggleRewardRedeemed,
    useInventoryItem,
    completeSession, 
    drawGacha,
    resetIchibanPool,
    unlockTalent, 
    toggleTalent,
    setState,
    reorderMajorDungeon,
    reorderSubDungeon,
    moveDungeonItem,
    finalizeMajorDungeon: finalizeMajorDungeonBase,
    updateQuests,
    updateSession,
    deleteSession,
    claimDailyTalentReward,
    claimQuestReward,
    saveDailyLog,
    purchaseShopItem,
    forceCompleteSubDungeon,
    claimAllQuestRewards,
    undoDungeonDrag,
    saveDungeonHistory,
    dungeonHistory,
    bulkCreateSessions,
    bulkDeleteSessions,
    combineShards,
    repairStreak,
    selectReward,
    resetLootPool,
    setActivePool,
    getNow
  } = useGameState();

  const {
    isSyncing,
    isVerifying,
    syncError,
    syncCheckResult,
    syncToCloud: baseSyncToCloud,
    resolveConflict,
    fetchFromCloud,
    unbindFromCloud,
    deleteCloudData,
    setSyncCheckResult,
    setSyncError,
    logSyncEvent,
    checkCloudSync,
    setIsSyncing,
    setIsVerifying,
    isInitialSyncCheckDone
  } = useCloudSync(state, setState, setDungeons, setMajorDungeons);

  const [hasUnreadFellowship, setHasUnreadFellowship] = useState(false);
  const [hasUnsyncedChanges, setHasUnsyncedChanges] = useState(() => {
    return localStorage.getItem('scholars_dungeon_unsynced') === 'true';
  });

  const localDirtyAtRef = React.useRef<number>(0);

  const syncToCloud = useCallback((forceOverwrite = false, specificState?: AppState, syncMethod: any = 'Manual', options?: any) => {
    return baseSyncToCloud(forceOverwrite, specificState, syncMethod, {
      ...options,
      onSuccess: () => {
        setHasUnsyncedChanges(false);
        localDirtyAtRef.current = 0;
        options?.onSuccess?.();
      }
    });
  }, [baseSyncToCloud]);
  
  const lastTeamDataRef = useRef(state.lastTeamData);
  useEffect(() => {
    lastTeamDataRef.current = state.lastTeamData;
  }, [state.lastTeamData]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (state.teamId && activeTab !== 'dashboard') {
      const checkTeam = async () => {
        try {
          const res = await fetch(`/api/teams?id=${state.teamId}`, {
            headers: {
              'x-secret-code': state.secretCode || '',
              'x-user-name': encodeURIComponent(state.userName || 'Scholar'),
              'x-user-level': (state.level || 1).toString(),
              'x-user-avatar': state.userAvatar || '🎓',
              'x-user-bio': encodeURIComponent(state.userBio || ''),
              'x-user-title': encodeURIComponent(state.userTitle || getTitleForLevel(state.level || 1)),
              'x-user-unique-id': state.userUniqueId || ''
            }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.team) {
              const lastData = lastTeamDataRef.current;
              const prevApplicants = lastData?.team?.applicants?.length || 0;
              const newApplicants = data.team.applicants?.length || 0;
              const prevMessages = lastData?.messages?.length || 0;
              const newMessages = data.messages?.length || 0;
              
              if (newApplicants > prevApplicants || newMessages > prevMessages) {
                setHasUnreadFellowship(true);
              }
            }
          }
        } catch (e) {}
      };
      checkTeam();
      interval = setInterval(checkTeam, 60000);
    } else if (activeTab === 'dashboard') {
      setHasUnreadFellowship(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state.teamId, activeTab, state.secretCode, state.userName]);

  // Auto show start of day modal
  useEffect(() => {
    if (!appReady) return;
    if (!state.enableStartOfDayPrompt) return;
    
    if (!state.lastStartOfDayPrompt) {
      setShowStartOfDayModal(true);
      return;
    }
    let now = new Date();
    if (state.timezone) {
      try {
        const str = now.toLocaleString('en-US', { timeZone: state.timezone });
        now = new Date(str);
      } catch (e) {}
    }
    const todayStr = getSettlementDay(now, state.timeSettings);
    if (state.lastStartOfDayPrompt !== todayStr) {
      setShowStartOfDayModal(true);
    }
  }, [state.lastStartOfDayPrompt, state.enableStartOfDayPrompt, state.timezone, state.timeSettings, appReady]);

  React.useEffect(() => {
    localStorage.setItem('scholars_dungeon_unsynced', hasUnsyncedChanges.toString());
  }, [hasUnsyncedChanges]);

  const isInitialMount = React.useRef(true);
  const syncTimeoutRef = React.useRef<any>(null);
  const lastSyncTimeRef = React.useRef<number>(Date.now());
  const prevSyncDataRef = React.useRef<string>("");

  React.useEffect(() => {
    const stripVolatile = (s: typeof state) => {
      const { lastUpdated, syncHistory, pushSubscription, ...rest } = s as any;
      return rest;
    };
    
    const currentData = JSON.stringify({
      state: stripVolatile(state),
      dungeons,
      majorDungeons
    });

    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevSyncDataRef.current = currentData;
      return;
    }

    if (prevSyncDataRef.current !== currentData) {
      prevSyncDataRef.current = currentData;
      localDirtyAtRef.current = Date.now();
      
      setHasUnsyncedChanges(true);

      const isCloudSyncConfigured = !!state.secretCode || state.syncProvider === 'WebDAV' || state.syncProvider === 'Google Drive';

      if (!isCloudSyncConfigured || state.autoSyncMode === 'manual' || !isInitialSyncCheckDone) {
        return; // Don't auto-upload yet, but dirty state is saved
      }

      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }

      const syncOptions = { 
        localDirtyAt: localDirtyAtRef.current,
        onSuccess: () => {
          setHasUnsyncedChanges(false);
          localDirtyAtRef.current = 0;
        }
      };

      if (state.autoSyncMode === 'debounce') {
        const delay = (state.autoSyncDebounceSeconds || 10) * 1000;
        syncTimeoutRef.current = setTimeout(() => {
          syncToCloud(false, undefined, 'Immediate', syncOptions);
          lastSyncTimeRef.current = Date.now();
        }, delay);
      } else if (state.autoSyncMode === 'interval') {
        const interval = (state.autoSyncIntervalMinutes || 1) * 60 * 1000;
        const timeSinceLastSync = Date.now() - lastSyncTimeRef.current;
        const timeToNextSync = Math.max(0, interval - timeSinceLastSync);
        
        syncTimeoutRef.current = setTimeout(() => {
          syncToCloud(false, undefined, 'Interval polling', syncOptions);
          lastSyncTimeRef.current = Date.now();
        }, timeToNextSync);
      }
    }
  }, [state, dungeons, majorDungeons, syncToCloud, isInitialSyncCheckDone]);

  // If initial check completes and we have unsynced changes, run auto-sync
  React.useEffect(() => {
    const isCloudSyncConfigured = !!state.secretCode || state.syncProvider === 'WebDAV' || state.syncProvider === 'Google Drive';
    if (!isCloudSyncConfigured || !isInitialSyncCheckDone || !hasUnsyncedChanges || state.autoSyncMode === 'manual') {
      return;
    }

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    const syncOptions = { 
      localDirtyAt: localDirtyAtRef.current,
      onSuccess: () => {
        setHasUnsyncedChanges(false);
        localDirtyAtRef.current = 0;
      }
    };

    if (state.autoSyncMode === 'debounce') {
      const delay = (state.autoSyncDebounceSeconds || 10) * 1000;
      syncTimeoutRef.current = setTimeout(() => {
        syncToCloud(false, undefined, 'Immediate', syncOptions);
        lastSyncTimeRef.current = Date.now();
      }, delay);
    } else if (state.autoSyncMode === 'interval') {
      const interval = (state.autoSyncIntervalMinutes || 1) * 60 * 1000;
      const timeSinceLastSync = Date.now() - lastSyncTimeRef.current;
      const timeToNextSync = Math.max(0, interval - timeSinceLastSync);
      
      syncTimeoutRef.current = setTimeout(() => {
        syncToCloud(false, undefined, 'Interval polling', syncOptions);
        lastSyncTimeRef.current = Date.now();
      }, timeToNextSync);
    }
  }, [isInitialSyncCheckDone, hasUnsyncedChanges, state.autoSyncMode, state.autoSyncDebounceSeconds, state.autoSyncIntervalMinutes, state.secretCode, state.syncProvider]);

  React.useEffect(() => {
    const isCloudSyncConfigured = !!state.secretCode || state.syncProvider === 'WebDAV' || state.syncProvider === 'Google Drive';

    const handleVisibilityChange = () => {
      if (document.hidden && hasUnsyncedChanges && isCloudSyncConfigured && state.autoSyncMode !== 'manual') {
        if (isInitialSyncCheckDone) {
          syncToCloud(false, undefined, 'Visibility API Active', { 
            localDirtyAt: localDirtyAtRef.current,
            onSuccess: () => {
              setHasUnsyncedChanges(false);
              localDirtyAtRef.current = 0;
            }
          });
        }
      } else if (!document.hidden) {
        // Silent check on return to the page
        if (isCloudSyncConfigured) {
          if (isInitialSyncCheckDone) {
            checkCloudSync(false, false);
          } else {
            checkCloudSync(false, true);
          }
        }
      }
    };

    const handleBeforeUnload = () => {
      if (hasUnsyncedChanges && isCloudSyncConfigured && state.autoSyncMode !== 'manual') {
        if (isInitialSyncCheckDone) {
          syncToCloud(false, undefined, 'Visibility API Active', { 
            localDirtyAt: localDirtyAtRef.current,
            onSuccess: () => {
              setHasUnsyncedChanges(false);
              localDirtyAtRef.current = 0;
            }
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsyncedChanges, state.secretCode, state.syncProvider, syncToCloud, isInitialSyncCheckDone, checkCloudSync]);

  React.useEffect(() => {
    if (state.theme) {
      document.documentElement.setAttribute('data-theme', state.theme);
      if (pipWindow) {
        pipWindow.document.documentElement.setAttribute('data-theme', state.theme);
      }
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (pipWindow) {
        pipWindow.document.documentElement.removeAttribute('data-theme');
      }
    }
    
    // Dynamically update theme-color meta tag for PWA status bar with raw HEX colors (iOS parses rgb poorly)
    setTimeout(() => {
      const themeColors: Record<string, string> = {
        night: '#020617',
        forest: '#022c22',
        ocean: '#083344',
        daylight: '#f8fafc',
        warm: '#fffbeb',
        candy: '#fdf2f8',
      };
      const hexColor = themeColors[state.theme] || '#020617';
      
      let metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.setAttribute('name', 'theme-color');
        document.head.appendChild(metaThemeColor);
      }
      metaThemeColor.setAttribute('content', hexColor);
    }, 50);
  }, [state.theme, pipWindow]);

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreenExplore(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const [prevLevel, setPrevLevel] = useState(state.level);
  const [isSyncingPush, setIsSyncingPush] = useState(false);
  const wasSyncingRef = React.useRef(false);

  // Track if we were recently syncing to handle React 18 state batching
  useEffect(() => {
    if (isSyncing) {
      wasSyncingRef.current = true;
    } else {
      const timer = setTimeout(() => {
        wasSyncingRef.current = false;
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isSyncing]);

  // Sync prevLevel with state.level during synchronization to prevent level-up popups
  useEffect(() => {
    if (isSyncing) {
      setPrevLevel(state.level);
    }
  }, [isSyncing, state.level]);

  // Sync Push Subscription to server whenever secretCode or pushEnabled changes
  useEffect(() => {
    const syncPushSubscription = async () => {
      if (state.pushEnabled && state.secretCode && !isSyncingPush) {
        setIsSyncingPush(true);
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
              if (import.meta.env.DEV) console.log('Push sync: Syncing subscription');
              const res = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  secretCode: state.secretCode,
                  subscription
                })
              });
              if (res.ok) {
                if (import.meta.env.DEV) console.log('Push sync: Success');
              } else {
                console.error('Push sync: Failed with status', res.status);
              }
            } else {
              console.warn('Push sync: No subscription found in browser even though pushEnabled is true. Auto-correcting state.');
              setState(prev => ({ ...prev, pushEnabled: false, pushSubscription: null }));
            }
          }
        } catch (error) {
          console.error('Push sync: Error', error);
        } finally {
          setIsSyncingPush(false);
        }
      }
    };

    if (appReady) {
      syncPushSubscription();
    }
  }, [state.pushEnabled, state.secretCode, appReady]);

  const handlePurchase = useCallback((itemId: string) => {
    if (import.meta.env.DEV) console.log('Purchasing item:', itemId);
    purchaseShopItem(itemId);
    triggerSimpleConfetti();
    playSound('reward', state.soundVolume, state.soundEnabled);
  }, [purchaseShopItem, state.soundVolume, state.soundEnabled]);

  React.useEffect(() => {
    if (state.level > prevLevel) {
      // If we are syncing or just finished syncing, just update the baseline without showing UI
      if (isSyncing || wasSyncingRef.current) {
        setPrevLevel(state.level);
        return;
      }
      const levelsGained = [];
      for (let l = prevLevel + 1; l <= state.level; l++) {
        levelsGained.push(l);
      }
      setShowLevelUp(levelsGained);
      triggerSimpleConfetti();
      playSound('levelUp', state.soundVolume, state.soundEnabled);
      setPrevLevel(state.level);
    }
  }, [state.level, prevLevel, state.soundVolume, state.soundEnabled, isSyncing]);

  const handleDraw = (poolId: string, amount: number) => {
    setDrawResult(null);
    setTimeout(() => {
      const results = drawGacha(poolId, amount);
      if (results && results.length > 0) {
        setDrawResult(results);
        triggerSimpleConfetti();
        playSound('gacha', state.soundVolume, state.soundEnabled);
      }
    }, 50);
  };

  const handleSaveProfile = () => {
    setState(prev => ({
      ...prev,
      userName: editName,
      userBio: editBio,
      userAvatar: editAvatar
    }));
    setIsEditingProfile(false);
  };

  const currentLevelUp = showLevelUp?.[0];

  const openProfile = () => {
    setEditName(state.userName || 'Scholar');
    setEditBio(state.userBio || 'Master of the Study Dungeon');
    setEditAvatar(state.userAvatar || 'User');
    setShowProfile(true);
    setIsEditingProfile(false);
  };

  const currentDungeon = useMemo(() => 
    dungeons.find(d => d.id === state.currentDungeonId),
    [dungeons, state.currentDungeonId]
  );

  const nextSessionStats = useMemo(() => {
    let xp = 100;
    let minXP = 100;
    let maxXP = 100;
    let minCoins = 5;
    let maxCoins = 15;

    if (state.devModeEnabled) {
      if (state.devXpMode === 'random') {
        minXP = state.devMinXP ?? 50;
        maxXP = state.devMaxXP ?? 150;
      } else {
        xp = state.devBaseXP ?? 100;
        minXP = maxXP = xp;
      }

      if (state.devCoinMode === 'fixed') {
        minCoins = maxCoins = state.devBaseCoins ?? 10;
      } else {
        minCoins = state.devMinCoins ?? 5;
        maxCoins = state.devMaxCoins ?? 15;
      }
    }

    const breakdown: { source: string; xpEffect?: string; coinEffect?: string }[] = [];
    breakdown.push({ 
      source: 'Base Reward', 
      xpEffect: minXP === maxXP ? `+${minXP}` : `+${minXP}-${maxXP}`, 
      coinEffect: minCoins === maxCoins ? `+${minCoins}` : `+${minCoins}-${maxCoins}` 
    });

    if (state.activeTalents.includes('a1')) {
      xp *= 1.1; // only accurately shown if fixed, but display is abstract enough
      minXP *= 1.1;
      maxXP *= 1.1;
      breakdown.push({ source: 'Talent: Mind Lubrication', xpEffect: '+10%' });
    }
    if (state.activeTalents.includes('b1')) {
      minCoins *= 1.15;
      maxCoins *= 1.15;
      breakdown.push({ source: 'Talent: Alchemy', coinEffect: '+15%' });
    }
    if (state.activeTalents.includes('c3')) {
      const critChance = state.devModeEnabled ? (state.devCritChance ?? 0.05) : 0.05;
      const critMult = state.devModeEnabled ? (state.devCritMultiplier ?? 5) : 5;
      breakdown.push({ source: 'Talent: Critical Intuition', coinEffect: `${critChance * 100}% chance for x${critMult}` });
    }
    
    // Inventory
    (state.inventory || []).forEach(cardId => {
      const card = (state.rewardPool || []).find(c => c.id === cardId);
      if (card && card.type === 'item') {
        if (card.itemType === 'xp_bonus_percent') {
          xp *= (1 + (card.amount || 0) / 100);
          breakdown.push({ source: `Card: ${card.name}`, xpEffect: `+${card.amount}%` });
        }
        if (card.itemType === 'coin_bonus_percent') {
          minCoins *= (1 + (card.amount || 0) / 100);
          maxCoins *= (1 + (card.amount || 0) / 100);
          breakdown.push({ source: `Card: ${card.name}`, coinEffect: `+${card.amount}%` });
        }
        if (card.itemType === 'double_xp') {
          xp *= 2;
          breakdown.push({ source: `Card: ${card.name}`, xpEffect: 'x2' });
        }
        if (card.itemType === 'double_coin') {
          minCoins *= 2;
          maxCoins *= 2;
          breakdown.push({ source: `Card: ${card.name}`, coinEffect: 'x2' });
        }
      }
    });

    return { xp: Math.floor(xp), minCoins: Math.ceil(minCoins), maxCoins: Math.ceil(maxCoins), breakdown };
  }, [state.devModeEnabled, state.devBaseXP, state.devXpMode, state.devMinXP, state.devMaxXP, state.devCoinMode, state.devBaseCoins, state.devMinCoins, state.devMaxCoins, state.activeTalents, state.dailySessions, state.streak, state.inventory, state.rewardPool]);

  const finalizeMajorDungeon = (id: string) => {
    finalizeMajorDungeonBase(id);
    setHasUnsyncedChanges(true);
  };

  const archiveMajorDungeon = useCallback((id: string) => {
    setMajorDungeons(prev => prev.map(m => m.id === id ? { ...m, status: 'archived' } : m));
    // Clear active dungeon if it belongs to the archived major dungeon
    if (state.currentDungeonId) {
      const activeDungeon = dungeons.find(d => d.id === state.currentDungeonId);
      if (activeDungeon && activeDungeon.parentId === id) {
        setState(prev => ({ ...prev, currentDungeonId: null }));
      }
    }
  }, [setMajorDungeons, state.currentDungeonId, dungeons, setState]);

  const handleCreateMajor = (name: string, description: string, rewards?: DungeonReward[], isRoutine?: boolean, routineType?: 'daily' | 'weekly' | 'monthly', deadline?: string) => {
    const newMajor: MajorDungeon = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      description,
      status: 'active' as const,
      rewards,
      isRoutine,
      routineType,
      deadline,
      lastRoutineReset: new Date().toISOString()
    };
    setMajorDungeons([...majorDungeons, newMajor]);
  };

  const handleUpdateMajor = (id: string, updates: Partial<MajorDungeon>) => {
    setMajorDungeons(prev => prev.map(m => {
      if (m.id === id) {
        const newMajor = { ...m, ...updates };
        if (newMajor.isRoutine && !m.isRoutine) {
          newMajor.lastRoutineReset = new Date().toISOString();
        }
        return newMajor;
      }
      return m;
    }));
  };

  const handleUpdateSub = (id: string, updates: Partial<Dungeon>) => {
    setDungeons(prev => prev.map(d => {
      if (d.id === id) {
        const newSub = { ...d, ...updates };
        if (newSub.isRoutine && !d.isRoutine) {
          newSub.lastRoutineReset = new Date().toISOString();
        }
        return newSub;
      }
      return d;
    }));
  };

  const handleCreateSub = (dungeon: Omit<Dungeon, 'id' | 'completedSessions' | 'status'>) => {
    const newSub: Dungeon = {
      ...dungeon,
      id: Math.random().toString(36).substr(2, 9),
      completedSessions: 0,
      status: 'active',
      lastRoutineReset: new Date().toISOString()
    };
    setDungeons([...dungeons, newSub]);
  };

  const handleDeleteMajor = (id: string) => {
    const dungeonsToDelete = new Set<string>();
    const rootSubs = dungeons.filter(d => d.parentId === id);
    
    const collectAllDescendants = (parentId: string) => {
      dungeonsToDelete.add(parentId);
      dungeons.filter(d => d.parentId === parentId).forEach(child => {
        collectAllDescendants(child.id);
      });
    };

    rootSubs.forEach(sub => collectAllDescendants(sub.id));
    
    setMajorDungeons(majorDungeons.filter(m => m.id !== id));
    setDungeons(dungeons.filter(d => d.parentId !== id && !dungeonsToDelete.has(d.id)));
  };

  const handleDeleteSub = (id: string) => {
    const dungeonsToDelete = new Set<string>();
    
    const collectAllDescendants = (parentId: string) => {
      dungeonsToDelete.add(parentId);
      dungeons.filter(d => d.parentId === parentId).forEach(child => {
        collectAllDescendants(child.id);
      });
    };

    collectAllDescendants(id);

    setDungeons(dungeons.filter(d => !dungeonsToDelete.has(d.id)));
    if (state.currentDungeonId && dungeonsToDelete.has(state.currentDungeonId)) {
      setState(prev => ({ ...prev, currentDungeonId: null }));
    }
  };

  const progressToNextLevel = (state.xp / getXPForLevel(state.level)) * 100;

  const unclaimedQuestsCount = state.quests.filter(q => !q.isAchievement && q.completed && !q.claimed).length;
  const unclaimedAchievementsCount = state.quests.filter(q => q.isAchievement && q.completed && !q.claimed).length;

  const navItems = [
    { id: 'dashboard', label: 'Sanctum', icon: LayoutDashboard },
    { id: 'dungeons', label: 'Dungeons', icon: Sword },
    { id: 'explore', label: 'Explore', icon: TimerIcon },
    { id: 'talents', label: 'Talents', icon: Network },
    { id: 'shop', label: 'Merchant', icon: ShoppingBag },
    { id: 'vault', label: 'Vault', icon: Package },
    { id: 'stats', label: 'Record', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  useEffect(() => {
    if (appReady) {
      if (state.syncProvider === 'Google Drive' || state.syncProvider === 'WebDAV' || state.secretCode) {
        checkCloudSync(false, true);
      }
    }
  }, [appReady, state.syncProvider, !!state.secretCode]);

  useEffect(() => {
    // Check and reset routine major dungeons
    let hasMajorChanges = false;
    let hasDungeonChanges = false;
    const now = new Date();
    
    const updatedMajors = majorDungeons.map(major => {
      if (!major.isRoutine || !major.routineType || !major.lastRoutineReset) return major;
      
      const lastReset = new Date(major.lastRoutineReset);
      let shouldReset = false;
      const resetHour = state.timeSettings?.night.end || 0;
      
      const logicalLastReset = new Date(lastReset);
      if (logicalLastReset.getHours() < resetHour) {
        logicalLastReset.setDate(logicalLastReset.getDate() - 1);
      }
      
      if (major.routineType === 'daily') {
        const resetTime = new Date(logicalLastReset);
        resetTime.setDate(resetTime.getDate() + 1);
        resetTime.setHours(resetHour, 0, 0, 0);
        if (now >= resetTime) shouldReset = true;
      } else if (major.routineType === 'weekly') {
        const resetTime = new Date(logicalLastReset);
        resetTime.setDate(resetTime.getDate() + 7);
        resetTime.setHours(resetHour, 0, 0, 0);
        if (now >= resetTime) shouldReset = true;
      } else if (major.routineType === 'monthly') {
        const resetTime = new Date(logicalLastReset);
        resetTime.setDate(1);
        resetTime.setMonth(resetTime.getMonth() + 1);
        resetTime.setHours(resetHour, 0, 0, 0);
        if (now >= resetTime) shouldReset = true;
      }

      if (shouldReset) {
        hasMajorChanges = true;
        return {
          ...major,
          status: 'active' as const,
          completedAt: undefined,
          lastRoutineReset: now.toISOString()
        };
      }
      return major;
    });

    const resetMajorIds = hasMajorChanges ? updatedMajors.filter((m, i) => m.lastRoutineReset !== majorDungeons[i].lastRoutineReset).map(m => m.id) : [];

    const updatedDungeons = dungeons.map(d => {
      let isResetting = false;

      // 1. Inherited reset from major
      if (d.parentId && resetMajorIds.includes(d.parentId)) {
        isResetting = true;
      }
      // 2. Direct routine reset
      else if (d.isRoutine && d.routineType && d.lastRoutineReset) {
        const lastReset = new Date(d.lastRoutineReset);
        const resetHour = state.timeSettings?.night.end || 0;
        
        const logicalLastReset = new Date(lastReset);
        if (logicalLastReset.getHours() < resetHour) {
          logicalLastReset.setDate(logicalLastReset.getDate() - 1);
        }
        
        if (d.routineType === 'daily') {
          const resetTime = new Date(logicalLastReset);
          resetTime.setDate(resetTime.getDate() + 1);
          resetTime.setHours(resetHour, 0, 0, 0);
          if (now >= resetTime) isResetting = true;
        } else if (d.routineType === 'weekly') {
          const resetTime = new Date(logicalLastReset);
          resetTime.setDate(resetTime.getDate() + 7);
          resetTime.setHours(resetHour, 0, 0, 0);
          if (now >= resetTime) isResetting = true;
        } else if (d.routineType === 'monthly') {
          const resetTime = new Date(logicalLastReset);
          resetTime.setDate(1);
          resetTime.setMonth(resetTime.getMonth() + 1);
          resetTime.setHours(resetHour, 0, 0, 0);
          if (now >= resetTime) isResetting = true;
        }
      }

      if (isResetting) {
        hasDungeonChanges = true;
        return {
          ...d,
          completedSessions: 0,
          status: 'active' as const,
          completedAt: undefined,
          lastRoutineReset: d.isRoutine ? now.toISOString() : undefined // Update direct routine timer if it's routine
        };
      }
      return d;
    });

    if (hasMajorChanges) {
      setMajorDungeons(updatedMajors);
    }
    if (hasDungeonChanges) {
      setDungeons(updatedDungeons);
    }
  }, [appReady, state.timeSettings?.night.end]); // Run after app loads

  const handleSplashComplete = useCallback(() => setAppReady(true), []);

  const toggleTimerPip = useCallback(() => {
    if (isTimerActive) {
      setIsTimerActive(false);
      setTimerEndTime(null);
    } else {
      if (!isResting && isLooping && loopTarget > 0 && loopCount >= loopTarget) {
        setLoopCount(0);
      }
      setIsTimerActive(true);
      setTimerEndTime(Date.now() + useTimerStore.getState().timeLeft * 1000);
    }
  }, [isTimerActive, isResting, isLooping, loopTarget, loopCount]);

  const resetTimerPip = useCallback(() => {
    setIsTimerActive(false);
    setTimerEndTime(null);
    setIsResting(false);
    setDuration(focusDuration);
    useTimerStore.getState().setTimeLeft(focusDuration * 60);
    setLoopCount(0);
  }, [focusDuration]);

  const skipSessionPip = useCallback(() => {
    setIsTimerActive(true);
    setTimerEndTime(Date.now() - 1000);
  }, []);

  return (
    <>
      <AnimatePresence>
        {!appReady && <SplashScreen key="splash" onComplete={handleSplashComplete} />}
      </AnimatePresence>

      {pipWindow && createPortal(
        <CompactTimer 
          endTime={timerEndTime}
          isActive={isTimerActive}
          isResting={isResting}
          currentDungeon={currentDungeon || null}
          duration={duration}
          toggleTimer={toggleTimerPip}
          resetTimer={resetTimerPip}
          skipSession={skipSessionPip}
          timerSkipVictoryMode={state.timerSkipVictoryMode}
          requireFocusConfirmation={state.requireFocusConfirmation}
          lastCompletionRewards={state.lastCompletionRewards}
          pipVictorySummary={pipVictorySummary}
          standardSessionMinutes={state.standardSessionMinutes}
        />,
        pipWindow.document.body
      )}

      <UpdateChecker />

      <div className="min-h-[100dvh] w-full max-w-full bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30 relative">
      {/* Sidebar Navigation - Hidden on mobile, visible on tablet/desktop */}
      {!isFullscreenExplore && (
        <nav className={cn(
          "hidden md:flex fixed left-0 top-0 h-[100dvh] bg-slate-900 border-r border-slate-800 z-[70] flex-col transition-all duration-300 pt-[env(safe-area-inset-top)]",
          isSidebarCollapsed ? "w-20" : "w-64"
        )}>
        <div className={cn(
          "p-4 md:px-5 md:py-5 flex items-center",
          isSidebarCollapsed ? "justify-center" : "justify-between"
        )}>
          <div className="flex items-center space-x-3">
            {!isSidebarCollapsed && (
              <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                <AppIcon size={24} className="text-[#ffffff]" />
              </div>
            )}
            {!isSidebarCollapsed && (
              <motion.span 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="font-bold text-lg tracking-tight text-white whitespace-nowrap"
              >
                Scholar's Dungeon
              </motion.span>
            )}
          </div>
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors"
          >
            {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronRight size={18} className="rotate-180" />}
          </button>
        </div>

        <div className="flex-grow px-3 py-6 space-y-2 overflow-y-auto scrollbar-hide overscroll-contain">
          {navItems.map(item => (
            <NavItem 
              key={item.id}
              active={activeTab === item.id} 
              onClick={() => setActiveTab(item.id as any)} 
              icon={<item.icon size={22} />} 
              label={item.label} 
              collapsed={isSidebarCollapsed}
              showDot={
                (item.id === 'dungeons' && state.unclaimedQuests > 0 && state.questNotificationStyle === 'red_dot') ||
                (item.id === 'explore' && isTimerActive) ||
                (item.id === 'dashboard' && hasUnreadFellowship)
              }
            />
          ))}
        </div>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={openProfile}
            className={cn(
              "w-full flex items-center p-3 rounded-xl hover:bg-slate-800 transition-colors group",
              isSidebarCollapsed ? "justify-center" : "space-x-3"
            )}
          >
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/20 group-hover:text-indigo-300 transition-all shrink-0 overflow-hidden">
              {renderAvatar(state.userAvatar, 20)}
            </div>
            {!isSidebarCollapsed && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-left overflow-hidden"
              >
                <p className="text-sm font-bold text-white truncate">{state.userName || 'Scholar'}</p>
                <p className="text-xs text-slate-500">Lv. {state.level}</p>
              </motion.div>
            )}
          </button>
        </div>
      </nav>
      )}

      {/* Main Content - Adjust margin based on sidebar visibility */}
      <main className={cn(
        "min-h-[100dvh] flex flex-col md:pb-0",
        isFullscreenExplore ? "m-0 p-0" : (isSidebarCollapsed ? "md:ml-20" : "md:ml-64")
      )}>
        {!isFullscreenExplore && (
          <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-3 sm:px-8 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))] flex items-center justify-between gap-2">
          {/* Top Bar Left Content */}
          <div className="hidden lg:flex items-center">
            {/* Title removed for cleaner UI */}
          </div>

          {/* Persistent Active Dungeon Widget - Simplified */}
          {currentDungeon ? (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setActiveTab('explore')}
              className="flex items-center gap-2 sm:gap-3 group cursor-pointer transition-all max-w-[140px] xs:max-w-[180px] sm:max-w-none px-2"
            >
              <div className="flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Sword size={14} className="text-indigo-400" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-[10px] sm:text-xs font-bold text-white truncate max-w-[45px] xs:max-w-[80px] sm:max-w-[180px] leading-tight">
                    {currentDungeon.name}
                  </span>
                  <span className="text-[9px] font-black text-slate-600 tabular-nums shrink-0">
                    {Math.floor(currentDungeon.completedSessions * (state.standardSessionMinutes || 25))}m / {currentDungeon.totalSessions * (state.standardSessionMinutes || 25)}m
                  </span>
                </div>
                <div className="w-16 sm:w-24 h-0.5 sm:h-1 bg-slate-800 rounded-full overflow-hidden mt-0.5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentDungeon.completedSessions / currentDungeon.totalSessions) * 100}%` }}
                    className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.3)]"
                  />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setActiveTab('dungeons')}
              className="flex items-center gap-2 sm:gap-2.5 group cursor-pointer transition-all px-2"
            >
              <div className="flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Sword size={14} className="text-slate-500 group-hover:text-indigo-400" />
              </div>
              <span className="hidden sm:inline text-[10px] sm:text-[11px] font-black text-slate-500 group-hover:text-white uppercase tracking-[0.15em] italic pr-1 transition-colors">
                Go Dungeons
              </span>
            </motion.div>
          )}
          
          <div className="flex-1 flex items-center justify-end gap-2 sm:gap-4 md:gap-6">

            {/* Cloud Status */}
            {(state.secretCode || state.syncProvider) && (
              <button 
                onClick={() => checkCloudSync(true)}
                disabled={isSyncing || isVerifying}
                className={cn(
                  "hidden md:flex items-center justify-center transition-all group relative shrink-0",
                  hasUnsyncedChanges 
                    ? "text-amber-500 hover:text-amber-400" 
                    : (isSyncing || isVerifying)
                      ? "text-indigo-400"
                      : "text-slate-400 hover:text-indigo-400"
                )}
                title={hasUnsyncedChanges ? "Unsynced Changes - Click to Verify" : "Verify & Compare Archives"}
              >
                <div className={cn("transition-transform group-hover:rotate-180 duration-500 flex items-center")}>
                  <RefreshCw size={14} className={isSyncing || isVerifying ? "animate-spin" : ""} />
                </div>
                {hasUnsyncedChanges && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 border border-slate-900"></span>
                  </span>
                )}
              </button>
            )}

            {/* XP Bar */}
            <div 
              className="flex items-center gap-1 sm:gap-2 mr-auto sm:mr-0 relative cursor-pointer" 
              onClick={() => setShowXpTooltip(!showXpTooltip)}
              title="Experience"
            >
              <span className={cn(
                "text-[11px] sm:text-xs font-black italic pr-1 leading-none shrink-0 shadow-none sm:shadow-lg bg-transparent sm:bg-indigo-600 px-0 sm:px-2 py-0 sm:py-0.5 rounded-none sm:rounded-lg text-white sm:text-white-pure opacity-100",
              )}>
                LV.{state.level}
              </span>
              <div className="hidden sm:flex items-center gap-1.5 sm:gap-2">
                <div className="w-10 sm:w-16 md:w-20 h-1 sm:h-2 bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50 shrink-0">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 shadow-[0_0_8px_rgba(99,102,241,0.4)] transition-all duration-700 ease-in-out" 
                    style={{ width: `${(state.xp / getXPForLevel(state.level)) * 100}%` }} 
                  />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 tabular-nums whitespace-nowrap">
                    {state.xp.toLocaleString()}
                    <span className="text-slate-600 ml-1">/ {getXPForLevel(state.level).toLocaleString()}</span>
                  </span>
                </div>
              </div>

              {/* Tooltip on Click */}
              <div className={cn(
                "absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-all duration-200 z-50 whitespace-nowrap origin-top",
                showXpTooltip ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
              )}>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-6">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Progress</span>
                    <span className="text-xs font-bold text-white italic pr-1">{state.xp.toLocaleString()} / {getXPForLevel(state.level).toLocaleString()}</span>
                  </div>
                  <div className="h-[1px] w-full bg-slate-800 my-1" />
                  <div className="flex items-center justify-between gap-6">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Next Level</span>
                    <span className="text-[10px] font-bold text-slate-500 italic pr-1">{(state.xp / getXPForLevel(state.level) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-[1px] w-full bg-slate-800 my-1" />
                  <div className="flex items-center justify-between gap-8">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Remaining</span>
                    <span className="text-xs font-black text-white italic pr-1">{(getXPForLevel(state.level) - state.xp).toLocaleString()} XP</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Talent Shards and Scrolls */}
            <div className="relative flex items-center shrink-0">
              <div 
                className="flex items-center cursor-pointer hover:bg-white/5 active:scale-95 transition-all p-1 -m-1 rounded-lg space-x-2 sm:space-x-3" 
                onClick={() => setShowTalentTooltip(!showTalentTooltip)}
              >
                <div className="hidden xl:flex items-center space-x-1.5 shrink-0" title="Talent Shards">
                  <Puzzle className="text-amber-400" size={14} />
                  <span className="font-bold text-white text-sm">{state.talentShards}<span className="text-slate-500 text-xs">/3</span></span>
                </div>
                <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0" title="Talent Scrolls">
                  <Scroll className="text-emerald-400 shrink-0" size={14} />
                  <span className="font-bold text-white text-xs sm:text-sm">{state.talentPoints}</span>
                </div>
              </div>

              {/* Tooltip on Click */}
              <div className={cn(
                "absolute top-[calc(100%+0.5rem)] right-0 sm:left-1/2 sm:-translate-x-1/2 p-3 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-all duration-200 z-50 origin-top min-w-[200px]",
                showTalentTooltip ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
              )}>
                <div className="flex flex-col gap-3 text-left">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">Talent Shards</span>
                      <div className="flex items-center gap-1.5">
                        <Puzzle className="text-amber-400" size={12} />
                        <span className="text-sm font-bold text-white">{state.talentShards}<span className="text-xs text-slate-500">/3</span></span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 leading-relaxed max-w-[200px] whitespace-normal">Combine 3 Talent Shards to forge 1 unified Talent Scroll.</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (state.talentShards >= 3) {
                         combineShards();
                         playSound('redeem', state.soundVolume, state.soundEnabled);
                      }
                    }}
                    disabled={state.talentShards < 3}
                    className={cn("w-full py-2 rounded-lg text-xs font-bold transition-all", state.talentShards >= 3 ? "bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95" : "bg-slate-800 text-slate-500 cursor-not-allowed")}
                  >
                    Combine Shards
                  </button>
                </div>
              </div>
            </div>

            {/* Coins */}
            <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
              <Coins className="text-amber-500 shrink-0" size={14} />
              <span className="font-bold text-white text-xs sm:text-sm">{state.coins > 999999 ? '999,999+' : state.coins.toLocaleString()}</span>
            </div>

            {/* Streak */}
            <div 
              className="hidden sm:flex items-center space-x-1 sm:space-x-1.5 shrink-0 cursor-pointer hover:bg-white/5 active:scale-95 transition-all p-1 -m-1 rounded-lg"
              onClick={() => setShowTopStreakModal(true)}
              title="View 7-Day Activity Record"
            >
              <div className="relative flex items-center justify-center">
                <Flame className={cn("shrink-0", state.lastStudyDate === getSettlementDay(getNow(), state.timeSettings) ? "text-orange-500" : "text-rose-500")} size={14} />
              </div>
              <span className={cn("font-bold text-xs sm:text-sm", state.lastStudyDate === getSettlementDay(getNow(), state.timeSettings) ? "text-white" : "text-rose-500")}>
                {state.streak} <span className={cn("hidden lg:inline text-[10px]", state.lastStudyDate === getSettlementDay(getNow(), state.timeSettings) ? "text-slate-500" : "text-rose-500/70")}>{state.streak === 1 ? 'Day' : 'Days'}</span>
              </span>
            </div>
            
            {/* Mobile-only Profile and Settings */}
            <div className="flex items-center space-x-2 md:hidden">
              <div className="relative">
                <button 
                  onClick={openProfile}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800 flex items-center justify-center text-indigo-400 hover:bg-slate-700 transition-all overflow-hidden"
                >
                  {renderAvatar(state.userAvatar, 16)}
                </button>
                {(state.secretCode || state.syncProvider) && (hasUnsyncedChanges || isSyncing || isVerifying || syncError) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); checkCloudSync(true); }}
                    disabled={isSyncing || isVerifying}
                    className={cn(
                      "absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center border-2 border-slate-900 z-10 transition-all",
                      hasUnsyncedChanges 
                        ? "bg-amber-500 hover:bg-amber-400 text-slate-900" 
                        : isSyncing || isVerifying 
                          ? "bg-indigo-400 text-white" 
                          : syncError
                            ? "bg-rose-500 hover:bg-rose-400 text-white"
                            : "bg-slate-500 hover:bg-indigo-400 text-white"
                    )}
                  >
                    {(isSyncing || isVerifying) && (
                      <RefreshCw size={8} className="animate-spin" />
                    )}
                    {hasUnsyncedChanges && (
                      <span className="absolute inset-0 rounded-full animate-ping bg-amber-400 opacity-75"></span>
                    )}
                  </button>
                )}
              </div>
              <button 
                onClick={() => setActiveTab('settings')}
                className={cn(
                  "w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center border border-slate-700 transition-all",
                  activeTab === 'settings' ? "bg-indigo-600 text-white border-indigo-500" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                )}
              >
                <SettingsIcon size={16} />
              </button>
            </div>
          </div>
        </header>
        )}

        <div className={cn("relative max-w-[1600px] mx-auto w-full flex-grow flex flex-col min-h-0 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]", isFullscreenExplore ? "h-[100dvh] justify-center" : "pb-[calc(7.5rem+env(safe-area-inset-bottom))] md:pb-8")}>
          <AnimatePresence mode="popLayout" initial={false}>
            {activeTab === 'dashboard' && (
              <DashboardView 
                state={state}
                setState={setState}
                dungeons={dungeons}
                currentDungeon={currentDungeon || null}
                setActiveTab={setActiveTab}
                setShowDailySummary={setShowDailySummary}
                setShowStartOfDayModal={setShowStartOfDayModal}
                openGuideBook={(chapter) => {
                  setGuideInitialPage(chapter);
                  setShowGuideBook(true);
                }}
                saveDailyLog={saveDailyLog}
                applyExpeditionPlan={(plan) => {
                  const generateId = () => Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
                  const majorId = generateId();
                  const newMajor: MajorDungeon = {
                    id: majorId,
                    name: plan.title,
                    description: plan.description,
                    status: 'active',
                    isFinalized: false,
                    rewards: []
                  };
                  
                  if (plan.reward.amount > 0) newMajor.rewards?.push({ type: 'coins', amount: plan.reward.amount });
                  if (plan.reward.xp > 0) newMajor.rewards?.push({ type: 'xp', amount: plan.reward.xp });
                  if (plan.reward.shards > 0) newMajor.rewards?.push({ type: 'item', itemType: 'talent_shard', amount: plan.reward.shards });

                  const newSubs: Dungeon[] = plan.tiers.map(tier => {
                    const subRewards: DungeonReward[] = [];
                    if (tier.reward.amount > 0) subRewards.push({ type: 'coins', amount: tier.reward.amount });
                    if (tier.reward.xp > 0) subRewards.push({ type: 'xp', amount: tier.reward.xp });
                    if (tier.reward.shards > 0) subRewards.push({ type: 'item', itemType: 'talent_shard', amount: tier.reward.shards });

                    return {
                      id: generateId(),
                      parentId: majorId,
                      name: tier.name,
                      description: tier.requirement,
                      totalSessions: tier.sessions || 1,
                      completedSessions: 0,
                      rewardCoins: tier.reward.amount || 0,
                      rewardXP: tier.reward.xp || 0,
                      rewardText: '',
                      rewards: subRewards,
                      isLongTerm: false,
                      status: 'active',
                      deadline: tier.deadline
                    };
                  });

                  setMajorDungeons(prev => [newMajor, ...prev]);
                  setDungeons(prev => [...prev, ...newSubs]);
                  setActiveTab('dungeons');
                }}
                navigateToSettings={(section, settingId) => {
                  setActiveTab('settings');
                  setActiveSettingsSection(section);
                  if (settingId) {
                      setTimeout(() => {
                        const el = document.getElementById(settingId);
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          el.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2', 'ring-offset-slate-900', 'transition-all', 'duration-500');
                          setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2', 'ring-offset-slate-900'), 1500);
                        }
                      }, 250);
                  }
                }}
              />
            )}

            {activeTab === 'explore' && (
               <ExploreView 
                 state={state}
                 dungeons={dungeons}
                 majorDungeons={majorDungeons}
                 currentDungeon={currentDungeon || null}
                 nextSessionStats={nextSessionStats}
                 isTimerActive={isTimerActive}
                 setIsTimerActive={setIsTimerActive}
                 isResting={isResting}
                 setIsResting={setIsResting}
                 duration={duration}
                 setDuration={setDuration}
                 endTime={timerEndTime}
                 setEndTime={setTimerEndTime}
                 focusDuration={focusDuration}
                 setFocusDuration={setFocusDuration}
                 restDuration={restDuration}
                 setRestDuration={setRestDuration}
                 enableRest={enableRest}
                 setEnableRest={setEnableRest}
                 isLooping={isLooping}
                 setIsLooping={setIsLooping}
                 loopTarget={loopTarget}
                 setLoopTarget={setLoopTarget}
                 loopCount={loopCount}
                 setLoopCount={setLoopCount}
                 timerPresets={timerPresets}
                 addTimerPreset={addTimerPreset}
                 removeTimerPreset={removeTimerPreset}
                 applyTimerPreset={applyTimerPreset}
                 handleTimerCustomChange={handleTimerCustomChange}
                 activeTab={activeTab}
                 setActiveTab={setActiveTab}
                 setDungeonSubTab={setDungeonSubTab}
                 isFullscreenExplore={isFullscreenExplore}
                 setIsFullscreenExplore={setIsFullscreenExplore}
                 showCoinRain={showCoinRain}
                 setShowCoinRain={setShowCoinRain}
                 showBuildDetails={showBuildDetails}
                 setShowBuildDetails={setShowBuildDetails}
                 completeSession={completeSession}
                 selectReward={selectReward}
                 setState={setState}
                 syncToCloud={syncToCloud}
                 updateSession={updateSession}
                 deleteSession={deleteSession}
                 claimDailyTalentReward={claimDailyTalentReward}
                 bulkCreateSessions={bulkCreateSessions}
                 bulkDeleteSessions={bulkDeleteSessions}
                 setPipVictorySummary={setPipVictorySummary}
                 togglePip={togglePip}
                 pipWindow={pipWindow}
                 canPip={canPip}
                 isPWA={isPWA}
                 isDesktop={isDesktop}
                 unclaimedQuestsCount={unclaimedQuestsCount}
                 unclaimedAchievementsCount={unclaimedAchievementsCount}
                 openTimerSettings={() => {
                   setActiveSettingsSection('timer');
                   setActiveTab('settings');
                 }}
                 setShowDailySummary={setShowDailySummary}
                 setShowStartOfDayModal={setShowStartOfDayModal}
               />
             )}

            {activeTab === 'vault' && (
              <VaultView 
                state={state}
                toggleRewardRedeemed={toggleRewardRedeemed}
                useInventoryItem={useInventoryItem}
              />
            )}

            {activeTab === 'dungeons' && (
              <DungeonsView 
                state={state}
                dungeons={dungeons}
                majorDungeons={majorDungeons}
                dungeonSubTab={dungeonSubTab}
                setDungeonSubTab={setDungeonSubTab}
                isDungeonEditMode={isDungeonEditMode}
                setIsDungeonEditMode={setIsDungeonEditMode}
                isAddingMajor={isAddingMajor}
                setIsAddingMajor={setIsAddingMajor}
                isAddingQuest={isAddingQuest}
                setIsAddingQuest={setIsAddingQuest}
                isArchiveView={isArchiveView}
                setIsArchiveView={setIsArchiveView}
                unclaimedQuestsCount={unclaimedQuestsCount}
                unclaimedAchievementsCount={unclaimedAchievementsCount}
                setState={setState}
                handleCreateMajor={handleCreateMajor}
                handleCreateSub={handleCreateSub}
                handleUpdateMajor={handleUpdateMajor}
                handleUpdateSub={handleUpdateSub}
                handleDeleteMajor={handleDeleteMajor}
                handleDeleteSub={handleDeleteSub}
                reorderMajorDungeon={reorderMajorDungeon}
                reorderSubDungeon={reorderSubDungeon}
                onMoveDungeonItem={moveDungeonItem}
                onDragStart={saveDungeonHistory}
                undoDungeonDrag={undoDungeonDrag}
                canUndoDrag={dungeonHistory.length > 0}
                setMajorDungeons={setMajorDungeons}
                setDungeons={setDungeons}
                finalizeMajorDungeon={finalizeMajorDungeon}
                archiveMajorDungeon={archiveMajorDungeon}
                forceCompleteSubDungeon={forceCompleteSubDungeon}
                claimQuestReward={claimQuestReward}
                claimAllQuestRewards={claimAllQuestRewards}
                questHistory={state.questHistory}
              />
            )}

            {activeTab === 'talents' && (
              <TalentsView 
                state={state}
                unlockTalent={unlockTalent}
                toggleTalent={toggleTalent}
                openGuideBook={(chapter) => {
                  setGuideInitialPage(chapter || 0);
                  setShowGuideBook(true);
                }}
              />
            )}

            {activeTab === 'shop' && (
              <ShopView 
                state={state}
                handlePurchase={handlePurchase}
                handleDraw={handleDraw}
                resetIchibanPool={resetIchibanPool}
                setDrawResult={setDrawResult}
                openGuideBook={(chapter) => {
                  setGuideInitialPage(chapter);
                  setShowGuideBook(true);
                }}
                onSetActivePool={setActivePool}
                onOpenSettings={() => {
                  setActiveTab('settings');
                  setActiveSettingsSection('merchant');
                }}
              />
            )}

            {activeTab === 'stats' && (
              <StatsView 
                state={state} 
                saveDailyLog={saveDailyLog} 
                onUpdateState={(update) => setState(s => ({ ...s, ...update }))}
                updateSession={updateSession}
                deleteSession={deleteSession}
                completeSession={completeSession}
                dungeons={dungeons}
                majorDungeons={majorDungeons}
                setShowStartOfDayModal={setShowStartOfDayModal}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView 
                state={state}
                setState={setState}
                resetLootPool={resetLootPool}
                addXP={addXP}
                getNow={getNow}
                activeSection={activeSettingsSection}
                setActiveSection={setActiveSettingsSection}
                onTabChange={setActiveTab}
                onOpenAstralArchives={() => setShowCloudSync(true)}
                isSyncing={isSyncing}
                hasUnsyncedChanges={hasUnsyncedChanges}
                triggerSyncCheck={(force) => {
                  if (force) setShowCloudSync(true);
                  checkCloudSync(force);
                }}
              />
            )}
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {showDailySummary && (
          <DailySummaryModal 
            state={state}
            dungeons={dungeons}
            majorDungeons={majorDungeons}
            onClose={() => setShowDailySummary(false)}
            onNavigateToStats={() => {
              setShowDailySummary(false);
              setActiveTab('stats');
            }}
            onSave={saveDailyLog}
            onUpdateState={(update) => setState(s => ({ ...s, ...update }))}
          />
        )}
        {showStartOfDayModal && (
          <StartOfDayModal
            state={state}
            dungeons={dungeons}
            initialDateStr={typeof showStartOfDayModal === 'string' ? showStartOfDayModal : undefined}
            repairStreak={repairStreak}
            onUpdateState={(update) => setState(s => ({ ...s, ...update }))}
            onClose={() => setShowStartOfDayModal(false)}
            onSave={(dateStr, sleepTime, wakeTime, sleepDurationMin, reflection, mood) => {
              const logs = state.dailyLogs || {};
              const current = logs[dateStr] || { rating: 0, reflection: '' };
              setState(s => ({
                ...s,
                lastStartOfDayPrompt: dateStr,
                dailyLogs: {
                  ...logs,
                  [dateStr]: {
                    ...current,
                    sleepTime,
                    wakeTime,
                    sleepDurationMin,
                    reflection,
                    mood: mood || current.mood
                  }
                }
              }));
            }}
          />
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <ProfileModal 
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        state={state}
        isEditingProfile={isEditingProfile}
        setIsEditingProfile={setIsEditingProfile}
        editName={editName}
        setEditName={setEditName}
        editBio={editBio}
        setEditBio={setEditBio}
        editAvatar={editAvatar}
        setEditAvatar={setEditAvatar}
        handleSaveProfile={handleSaveProfile}
        setShowCloudSync={setShowCloudSync}
        setActiveTab={setActiveTab}
        isSyncing={isSyncing}
        hasUnsyncedChanges={hasUnsyncedChanges}
        triggerSyncCheck={() => checkCloudSync(true)}
        isTalentLevel={isTalentLevel}
        getNextTalentLevel={getNextTalentLevel}
        repairStreak={repairStreak}
        openGuideBook={(chapter) => {
          setGuideInitialPage(chapter);
          setShowGuideBook(true);
        }}
      />

      <AnimatePresence>
        {showTopStreakModal && (
          <StreakRecordModal
            state={state}
            onClose={() => setShowTopStreakModal(false)}
            repairStreak={repairStreak}
            openGuideBook={(chapter) => {
              setShowTopStreakModal(false);
              setGuideInitialPage(chapter);
              setShowGuideBook(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* Reward Completion Popup */}
      <RewardCompletionModal 
        rewardData={state.lastCompletionRewards}
        onClose={() => setState(s => ({ ...s, lastCompletionRewards: null }))}
        onNavigate={(tab, subTab) => {
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
          setIsFullscreenExplore(false);
          setActiveTab(tab as any);
          if (subTab) setDungeonSubTab(subTab as any);
          setState(s => ({ ...s, lastCompletionRewards: null }));
        }}
      />

      {/* Modern Floating Bottom Navigation for Mobile */}
      {!isFullscreenExplore && (
        <div className="md:hidden fixed bottom-6 left-4 right-4 z-[90] pb-[env(safe-area-inset-bottom)]">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-[2rem] p-2 flex justify-between items-center shadow-[0_20px_40px_-15px_rgba(0,0,0,0.7)] shadow-indigo-500/10 mx-auto max-w-sm">
            {navItems.filter(i => i.id !== 'settings').map(item => (
              <MobileNavItem 
                key={item.id}
                active={activeTab === item.id} 
                onClick={() => setActiveTab(item.id as any)} 
                icon={<item.icon size={22} />} 
                label={item.label}
                showDot={
                  (item.id === 'dungeons' && state.unclaimedQuests > 0 && state.questNotificationStyle === 'red_dot') ||
                  (item.id === 'explore' && isTimerActive) ||
                  (item.id === 'dashboard' && hasUnreadFellowship)
                }
              />
            ))}
          </div>
        </div>
      )}
      <CoinRain active={showCoinRain} onComplete={() => setShowCoinRain(false)} />

      {/* Cloud Sync Modal */}
      {createPortal(
        <AnimatePresence>
          {(showCloudSync || syncCheckResult || syncError) && (
            <CloudSyncModal
              isOpen={showCloudSync || !!syncCheckResult || !!syncError}
              onClose={() => {
                setShowCloudSync(false);
                if (syncCheckResult) setSyncCheckResult(null);
                if (syncError) setSyncError(null);
              }}
              secretCode={state.secretCode}
              isSyncing={isSyncing}
              isVerifying={isVerifying}
              syncError={syncError}
              syncCheckResult={syncCheckResult}
              syncProvider={state.syncProvider}
              onConnect={fetchFromCloud}
              onResolveConflict={resolveConflict}
              onCancelConnect={(code) => {
                setSyncCheckResult(null);
                logSyncEvent('cancel_login', code);
              }}
              onManualSync={() => checkCloudSync(true)}
              onUnbind={unbindFromCloud}
              onDeleteCloudData={deleteCloudData}
              onVerify={() => checkCloudSync(true)}
              onCancelSync={() => {
                setIsSyncing(false);
                setIsVerifying(false);
                setSyncError(null);
                setSyncCheckResult(null);
              }}
              syncHistory={state.syncHistory}
              localState={state}
            />
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Book Guide Modal */}
      <GuideBookModal 
        isOpen={showGuideBook}
        initialPage={guideInitialPage}
        onClose={() => setShowGuideBook(false)}
        soundEnabled={state.soundEnabled}
        soundVolume={state.soundVolume}
        navigateToSettings={(section, settingId) => {
          setActiveTab('settings');
          setActiveSettingsSection(section);
          setShowGuideBook(false);
          if (settingId) {
            setTimeout(() => {
              const el = document.getElementById(settingId);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2', 'ring-offset-slate-900', 'transition-all', 'duration-500');
                setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2', 'ring-offset-slate-900'), 1500);
              }
            }, 250);
          }
        }}
        onTabChange={(tab, subTab) => {
          setActiveTab(tab);
          if (subTab && tab === 'dungeons') {
            setDungeonSubTab(subTab as any);
          }
          setShowGuideBook(false);
        }}
      />

      {/* Level Up Modal */}
      <LevelUpModal 
        levels={showLevelUp}
        onClose={() => {
          setShowLevelUp(prev => {
            if (!prev || prev.length <= 1) return null;
            return prev.slice(1);
          });
        }}
        state={state}
        openGuideBook={(chapter) => {
          setGuideInitialPage(chapter);
          setShowGuideBook(true);
        }}
        isTalentLevel={isTalentLevel}
        getNextTalentLevel={getNextTalentLevel}
      />

      {createPortal(
        <AnimatePresence>
          {drawResult && (
            <GachaResultModal 
              results={drawResult as any} 
              allowOverlap={state.gachaAllowOverlap}
              gachaAnimation={state.gachaAnimation}
              ichibanAnimation={state.ichibanAnimation}
              soundEnabled={state.soundEnabled}
              soundVolume={state.soundVolume}
              onClose={() => setDrawResult(null)} 
            />
          )}

          {state.bulkClaimResult && (
            <BulkClaimModal 
              isOpen={!!state.bulkClaimResult}
              result={state.bulkClaimResult}
              onClose={() => setState(prev => ({ ...prev, bulkClaimResult: null }))}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
    </>
  );
}

function NavItem({ active, onClick, icon, label, collapsed, showDot }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; collapsed?: boolean; showDot?: boolean; key?: string }) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        "flex items-center transition-all group relative rounded-xl",
        collapsed 
          ? "w-12 h-12 justify-center mx-auto" 
          : "w-full p-3 space-x-3",
        active 
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
          : "text-slate-500 hover:bg-slate-800 hover:text-slate-200"
      )}
    >
      <div className={cn("transition-transform group-hover:scale-110 shrink-0 relative", active ? "scale-110" : "")}>
        {icon}
        {showDot && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-slate-950" />
        )}
      </div>
      {!collapsed && (
        <motion.span 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="font-bold text-sm tracking-wide whitespace-nowrap overflow-hidden"
        >
          {label}
        </motion.span>
      )}
    </button>
  );
}

function MobileNavItem({ active, onClick, icon, label, showDot }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; showDot?: boolean; key?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center flex-1 max-w-[56px] min-w-0 sm:min-w-[40px] px-0.5 sm:px-1 h-12 rounded-2xl transition-all relative group",
        active ? "text-indigo-400 bg-indigo-500/10" : "text-slate-500 hover:text-slate-300"
      )}
    >
      <div className={cn("relative transition-transform duration-300", active ? "-translate-y-2 opacity-100 scale-110" : "opacity-80")}>
        {icon}
        {showDot && (
          <span className="absolute -bottom-0 -right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-slate-900" />
        )}
      </div>
      <AnimatePresence>
        {active && (
          <motion.span 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute bottom-1 text-[9px] font-black tracking-wider text-indigo-400"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

export default App;
