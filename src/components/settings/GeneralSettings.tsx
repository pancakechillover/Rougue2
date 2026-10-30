import React, { useState } from 'react';
import { motion } from 'motion/react';
import { MOOD_OPTIONS, DEFAULT_ENABLED_MOODS } from '../../constants';
import { Trash2, Volume2, VolumeX, Sun, Moon, Smile, Trees, Waves, Target, Gift, Eye, Palette, Check, Bell, BellOff, RefreshCw, Sunrise, CloudSun, Lollipop, History, Globe, CalendarCheck, Clock, MapPin, Settings2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { playSound } from '../../lib/sound';
import { ConfirmModal } from '../modals/ConfirmModal';
import { SpinnerInput } from '../common/SpinnerInput';
import { TimePicker } from '../common/TimePicker';
import { ManageLocationsModal } from '../workstation/ManageLocationsModal';
import { LocationIcon } from '../workstation/LocationIcon';
import { getMaxWorkstationSessionMinutes, getWorkstationLocations } from '../../lib/workstationUtils';

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

import { ActivityTimeSettings } from './ActivityTimeSettings';

export const GeneralSettings = ({ state, setState }: { state: any, setState: (fn: (prev: any) => any) => void }) => {
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{ 
    isOpen: boolean; 
    title: string; 
    message: string; 
    onConfirm?: () => void; 
    confirmText?: string;
    type?: 'danger' | 'warning' | 'info';
    isAlert?: boolean;
  }>({ isOpen: false, title: '', message: '' });

  const themes = [
    { id: 'night', name: 'Night', color: '#4F39F6', icon: Moon, iconColor: '#f1efff' },
    { id: 'daylight', name: 'Daylight', color: '#f8fafc', icon: CloudSun, iconColor: '#4F39F6' },
    { id: 'warm', name: 'Warm Sun', color: '#F97C1E', icon: Sun, iconColor: '#FDE68A' },
    { id: 'candy', name: 'Candy', color: '#e656b1', icon: Lollipop, iconColor: '#fff2ff' },
    { id: 'forest', name: 'Forest', color: '#34d399', icon: Trees, iconColor: '#064e3b' },
    { id: 'ocean', name: 'Ocean', color: '#38bdf8', icon: Waves, iconColor: '#0c4a6e' },
  ];
  
  const autoTheme = state.autoTheme ?? true;
  const dayTheme = state.dayTheme || 'daylight';
  const nightTheme = state.nightTheme || 'night';
  const dayStart = state.autoThemeDayStart ?? 8;
  const nightStart = state.autoThemeNightStart ?? 20;
  const timezone = state.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const soundEnabled = state.soundEnabled ?? true;
  const soundVolume = state.soundVolume ?? 0.5;
  const defaultMarkdownEnabled = state.defaultMarkdownEnabled ?? true;

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setState(prev => ({ ...prev, soundVolume: newVolume }));
    if (soundEnabled) {
      playSound('click', newVolume, true);
    }
  };

  const toggleSound = () => {
    const newEnabled = !soundEnabled;
    setState(prev => ({ ...prev, soundEnabled: newEnabled }));
    if (newEnabled) {
      playSound('click', soundVolume, true);
    }
  };

  const [isSubscribing, setIsSubscribing] = useState(false);

  const handleNotificationToggle = async () => {
    if (state.pushEnabled) {
      // Unsubscribe
      try {
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        const swUrl = import.meta.env.DEV ? '/dev-sw.js?dev-sw' : '/sw.js';
        const swType = import.meta.env.DEV ? 'module' : 'classic';
        registration = await navigator.serviceWorker.register(swUrl, { scope: '/', type: swType });
      }
      registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
        setState(prev => ({ ...prev, pushEnabled: false, pushSubscription: null }));
      } catch (error) {
        console.error('Failed to unsubscribe:', error);
      }
      return;
    }

    // Subscribe
    if (!state.isRedisUnlocked) {
      setModalConfig({
        isOpen: true,
        title: "Developer Access Required",
        message: "Due to free-tier cloud quotas, Push Notifications and Cloud Sync are currently restricted to authorized testers via an invite code. You can enter your invite code in the Data Management section below.",
        confirmText: "Got it",
        type: "warning",
        isAlert: true
      });
      return;
    }
    
    setIsSubscribing(true);
    try {
      if (typeof Notification === 'undefined') {
        throw new Error('Notifications are not supported in this browser environment.');
      }
      if (import.meta.env.DEV) console.log('Requesting notification permission...');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission denied:', permission);
        setModalConfig({
          isOpen: true,
          title: "Permission Denied",
          message: `Notification permission ${permission}. Please enable it in your browser settings to receive alerts.`,
          confirmText: "Understood",
          type: "warning",
          isAlert: true
        });
        return;
      }

      if (import.meta.env.DEV) console.log('Checking for service worker registration...');
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        if (import.meta.env.DEV) console.log('No service worker found, registering...');
        const swUrl = import.meta.env.DEV ? '/dev-sw.js?dev-sw' : '/sw.js';
        const swType = import.meta.env.DEV ? 'module' : 'classic';
        registration = await navigator.serviceWorker.register(swUrl, { 
          scope: '/',
          updateViaCache: 'none',
          type: swType
        });
      }
      
      if (import.meta.env.DEV) console.log('Waiting for service worker to be ready...');
      // Add a timeout to prevent hanging on Android
      const readyPromise = navigator.serviceWorker.ready;
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Service Worker ready timeout (10s). If using Android, ensure the app is in foreground and not in an iframe.')), 10000)
      );
      
      registration = await Promise.race([readyPromise, timeoutPromise]) as ServiceWorkerRegistration;
      if (import.meta.env.DEV) console.log('Service worker ready:', registration.active?.state);
      
      if (import.meta.env.DEV) console.log('Fetching VAPID public key...');
      let publicKey: string;
      try {
        const vapidResponse = await fetch('/api/push/vapid-public-key');
        if (!vapidResponse.ok) throw new Error(`Status: ${vapidResponse.status}`);
        const data = await vapidResponse.json();
        publicKey = data.publicKey;
      } catch (err) {
        console.warn('Failed to fetch VAPID key from server, checking for existing env...', err);
        throw new Error('Could not retrieve VAPID key from server. Check your internet connection.');
      }
      
      if (import.meta.env.DEV) console.log('VAPID key received, converting...');
      const convertedVapidKey = urlBase64ToUint8Array(publicKey);

      if (import.meta.env.DEV) console.log('Subscribing to push manager...');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
      if (import.meta.env.DEV) console.log('Push subscription successful');

      // Save to server, which authenticates by session now
      if (state.account?.token) {
        if (import.meta.env.DEV) console.log('Push sync: Syncing subscription');
        const syncRes = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${state.account.token}`
          },
          body: JSON.stringify({
            subscription,
            deviceInfo: {
              userAgent: navigator.userAgent,
              browser: /Chrome/i.test(navigator.userAgent) ? 'Chrome' : /Firefox/i.test(navigator.userAgent) ? 'Firefox' : /Edge/i.test(navigator.userAgent) ? 'Edge' : 'Unknown'
            }
          })
        });
        if (!syncRes.ok) throw new Error(`Server sync failed: ${syncRes.status}`);
        if (import.meta.env.DEV) console.log('Push sync: Success');
      }

      setState(prev => ({ ...prev, pushEnabled: true, pushSubscription: subscription }));
      if (import.meta.env.DEV) console.log('Successfully enabled notifications and synced to server');
    } catch (error: any) {
      console.error('Failed to subscribe:', error);
      const msg = error.message || 'Unknown error';
      if (msg.includes('push service error')) {
        setModalConfig({
          isOpen: true,
          title: "Android Limitation",
          message: "Push Service Error on Android detected.\n\nThis is a known Android limitation issue. We have applied a patch (gcm_sender_id) in version 1.7.2.\n\nTo fix:\n1. Delete/Uninstall this PWA from your phone.\n2. In your browser settings, clear cookies/cache for this site.\n3. Reload the site and install the PWA again.",
          confirmText: "Got it",
          type: "warning",
          isAlert: true
        });
      } else {
        setModalConfig({
          isOpen: true,
          title: "Enable Failed",
          message: `Failed to enable notifications: ${msg}.\n\nCommon fixes:\n1. Open as New Tab\n2. Re-install PWA\n3. Reset SW in Dev Tools`,
          confirmText: "Close",
          type: "danger",
          isAlert: true
        });
      }
    } finally {
      setIsSubscribing(false);
    }
  };

  const forceSyncNotifications = async () => {
    if (!state.isRedisUnlocked) {
      setModalConfig({
        isOpen: true,
        title: "Developer Access Required",
        message: "Due to free-tier cloud quotas, Push Notifications and Cloud Sync are currently restricted to authorized testers via an invite code. You can enter your invite code in the Data Management section below.",
        confirmText: "Got it",
        type: "warning",
        isAlert: true
      });
      return;
    }

    if (!state.account?.token) {
      setModalConfig({
        isOpen: true,
        title: "Scholar Account Required",
        message: "Reminders are tied to your Scholar Account. Sign in first, then sync notifications.",
        confirmText: "Got it",
        type: "warning",
        isAlert: true
      });
      return;
    }
    
    setIsSubscribing(true);
    try {
      if (import.meta.env.DEV) console.log('Force Sync: Checking service worker...');
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        if (import.meta.env.DEV) console.log('Force Sync: Registering new service worker...');
        const swUrl = import.meta.env.DEV ? '/dev-sw.js?dev-sw' : '/sw.js';
        const swType = import.meta.env.DEV ? 'module' : 'classic';
        registration = await navigator.serviceWorker.register(swUrl, { scope: '/', type: swType });
      }
      
      if (import.meta.env.DEV) console.log('Force Sync: Waiting for ready...');
      const readyPromise = navigator.serviceWorker.ready;
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Service Worker ready timeout (10s)')), 10000)
      );
      registration = await Promise.race([readyPromise, timeoutPromise]) as ServiceWorkerRegistration;
      
      if (import.meta.env.DEV) console.log('Force Sync: Checking subscription...');
      let subscription = await registration.pushManager.getSubscription();
      
      const vapidResponse = await fetch('/api/push/vapid-public-key');
      const { publicKey } = await vapidResponse.json();
      const convertedVapidKey = urlBase64ToUint8Array(publicKey);

      // Check for VAPID mismatch
      if (subscription && subscription.options.applicationServerKey) {
        const currentKey = new Uint8Array(subscription.options.applicationServerKey);
        const isMatch = currentKey.every((val, i) => val === convertedVapidKey[i]);
        if (!isMatch) {
          console.warn('Force Sync: VAPID key mismatch detected. Re-subscribing...');
          await subscription.unsubscribe();
          subscription = null;
        }
      }
      
      if (!subscription) {
        if (import.meta.env.DEV) console.log('Force Sync: No subscription (or mismatch), attempting to re-subscribe...');
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
        if (import.meta.env.DEV) console.log('Force Sync: Re-subscribed successfully');
      }

      if (import.meta.env.DEV) console.log('Force Sync: Sending to server...');
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(state.account?.token ? { Authorization: `Bearer ${state.account.token}` } : {})
        },
        body: JSON.stringify({
          subscription
        })
      });

      if (res.ok) {
        setModalConfig({
          isOpen: true,
          title: "Sync Successful",
          message: "Notifications synced successfully!",
          confirmText: "Great",
          type: "info",
          isAlert: true
        });
        setState(prev => ({ ...prev, pushEnabled: true, pushSubscription: subscription }));
      } else {
        throw new Error(`Server error: ${res.status}`);
      }
    } catch (error) {
      console.error('Force sync failed:', error);
      setModalConfig({
        isOpen: true,
        title: "Sync Failed",
        message: "Failed to sync notifications. Please try toggling the switch off and on again.",
        confirmText: "Close",
        type: "danger",
        isAlert: true
      });
    } finally {
      setIsSubscribing(false);
    }
  };

  const resetPushState = async () => {
    setModalConfig({
      isOpen: true,
      title: "Reset Push State?",
      message: "This will clear all push subscriptions for this secret code on the server and locally. Proceed?",
      confirmText: "Clear Everything",
      type: "danger",
      onConfirm: async () => {
        setIsSubscribing(true);
        try {
          // 1. Unsubscribe locally
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) await subscription.unsubscribe();
          }
          
          // 2. Clear server
          if (state.account?.token) {
            await fetch('/api/push/subscribe', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${state.account.token}`
              },
              body: JSON.stringify({ subscription: null })
            });
          }
          
          setState(prev => ({ ...prev, pushEnabled: false, pushSubscription: null }));
          setModalConfig({
            isOpen: true,
            title: "Reset Complete",
            message: "Push state reset successfully. You can now try re-enabling notifications.",
            confirmText: "Got it",
            type: "info",
            isAlert: true
          });
        } catch (err) {
          console.error('Reset failed:', err);
          setModalConfig({
            isOpen: true,
            title: "Reset Failed",
            message: "Failed to reset: " + (err as Error).message,
            confirmText: "Close",
            type: "danger",
            isAlert: true
          });
        } finally {
          setIsSubscribing(false);
        }
      }
    });
  };

  return (
    <div className="space-y-8">
      <div id="setting-themes" className="space-y-6">
        <div className="flex items-center gap-2.5 text-indigo-400 mb-6 pb-2">
          <Palette size={20} />
          <h4 className="text-lg font-bold uppercase tracking-widest pr-1">Themes</h4>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {themes.map(theme => {
              const isActive = (state.theme || 'night') === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => setState(prev => ({ ...prev, theme: theme.id, autoTheme: false }))}
                  className={cn(
                    "flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all",
                    isActive 
                      ? "bg-indigo-500/10 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]" 
                      : "bg-slate-900 border-slate-800 hover:border-slate-700"
                  )}
                >
                  <div 
                    className="w-12 h-12 rounded-full border-2 border-slate-700/50 shadow-inner flex items-center justify-center"
                    style={{ backgroundColor: theme.color }}
                  >
                    <theme.icon size={20} style={{ color: theme.iconColor }} />
                  </div>
                  <span className={cn("text-xs font-bold", isActive ? "text-indigo-400" : "text-slate-400")}>
                    {theme.name}
                  </span>
                </button>
              );
            })}
          </div>

          <div id="setting-auto-sync" className="flex items-center justify-between gap-3 py-3.5 border-b border-slate-800/60">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-xl transition-colors", autoTheme ? "bg-indigo-500/10 text-indigo-400" : "bg-slate-800 text-slate-500")}>
                <History size={20} />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-slate-100">Auto Sync System</div>
                <div className="text-[11px] text-slate-500">Switch Day/Night themes automatically</div>
              </div>
            </div>
            <button
              onClick={() => setState(prev => ({ ...prev, autoTheme: !autoTheme }))}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                autoTheme ? "bg-indigo-500" : "bg-slate-700"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  autoTheme ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>

          {autoTheme && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-3">
                  {/* Row 1: Header */}
                  <div className="flex items-center gap-2 text-[10px] font-bold text-amber-400 uppercase tracking-widest border-b border-slate-800/50 pb-2">
                    <Sunrise size={12} /> Day Configuration
                  </div>
                  
                  {/* Row 2: Time Set */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Transition Time</span>
                    <TimePicker 
                      value={dayStart}
                      onChange={(val) => setState(prev => ({ ...prev, autoThemeDayStart: val }))}
                      className="bg-slate-950 border-slate-800 text-xs w-24 py-1.5"
                    />
                  </div>

                  {/* Row 3: Themes */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {themes.map(t => (
                      <button
                        key={`day-${t.id}`}
                        onClick={() => setState(prev => ({ ...prev, dayTheme: t.id }))}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center",
                          dayTheme === t.id ? "border-amber-500 scale-110 shadow-lg shadow-amber-500/20" : "border-slate-800 hover:border-slate-600"
                        )}
                        title={t.name}
                        style={{ backgroundColor: t.color }}
                      >
                        {dayTheme === t.id && <Check size={12} className="text-amber-500" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-3">
                  {/* Row 1: Header */}
                  <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-400 uppercase tracking-widest border-b border-slate-800/50 pb-2">
                    <Moon size={12} /> Night Configuration
                  </div>

                  {/* Row 2: Time Set */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Transition Time</span>
                    <TimePicker 
                      value={nightStart}
                      onChange={(val) => setState(prev => ({ ...prev, autoThemeNightStart: val }))}
                      className="bg-slate-950 border-slate-800 text-xs w-24 py-1.5"
                    />
                  </div>

                  {/* Row 3: Themes */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {themes.map(t => (
                      <button
                        key={`night-${t.id}`}
                        onClick={() => setState(prev => ({ ...prev, nightTheme: t.id }))}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center",
                          nightTheme === t.id ? "border-indigo-500 scale-110 shadow-lg shadow-indigo-500/20" : "border-slate-800 hover:border-slate-600"
                        )}
                        title={t.name}
                        style={{ backgroundColor: t.color }}
                      >
                        {nightTheme === t.id && <Check size={12} className="text-indigo-400" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div id="setting-timezone" className="flex items-center gap-3 p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl shrink-0">
                  <Globe size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white uppercase tracking-widest mb-1 flex flex-col xs:flex-row xs:items-center justify-between gap-1">
                    <span>Timezone Selection</span>
                    <span className="text-[9px] text-slate-500 normal-case font-normal truncate">Detected: {Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
                  </div>
                  <select
                    value={timezone}
                    onChange={(e) => setState(prev => ({ ...prev, timezone: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value={Intl.DateTimeFormat().resolvedOptions().timeZone}>Local System Time ({Intl.DateTimeFormat().resolvedOptions().timeZone})</option>
                    <option value="UTC">UTC (Universal Time)</option>
                    <option value="America/New_York">New York (EST/EDT)</option>
                    <option value="America/Los_Angeles">Los Angeles (PST/PDT)</option>
                    <option value="Europe/London">London (GMT/BST)</option>
                    <option value="Europe/Paris">Paris (CET/CEST)</option>
                    <option value="Asia/Tokyo">Tokyo (JST)</option>
                    <option value="Asia/Shanghai">Shanghai (CST)</option>
                    <option value="Australia/Sydney">Sydney (AEST/AEDT)</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div className="space-y-6 pt-6 border-t border-slate-800">
        <div className="flex items-center gap-2.5 text-emerald-400 mb-6 pb-2">
          <Volume2 size={20} />
          <h4 className="text-lg font-bold uppercase tracking-widest pr-1">Audio</h4>
        </div>

        <div className="space-y-6">
          <div id="setting-sound" className="flex items-center justify-between gap-3 py-3.5 border-b border-slate-800/60">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-xl", soundEnabled ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-500")}>
                {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </div>
              <div>
                <div className="text-[13px] font-semibold text-slate-100">Sound Effects</div>
                <div className="text-[11px] text-slate-500">Play sounds for actions like gacha and rewards</div>
              </div>
            </div>
            <button
              onClick={toggleSound}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                soundEnabled ? "bg-emerald-500" : "bg-slate-700"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  soundEnabled ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>

          {soundEnabled && (
            <div className="py-3.5 border-b border-slate-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Volume</label>
                <span className="text-xs font-bold text-emerald-400">{Math.round(soundVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={soundVolume}
                onChange={handleVolumeChange}
                className="w-full text-emerald-500 rounded-lg cursor-pointer transition-all"
                style={{
                  background: `linear-gradient(to right, currentColor ${soundVolume * 100}%, var(--color-slate-800, #1e293b) ${soundVolume * 100}%)`
                }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6 pt-6 border-t border-slate-800">
        <ActivityTimeSettings state={state} setState={setState} />
      </div>

      <div id="setting-workstation" className="space-y-6 pt-6 border-t border-slate-800">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 text-indigo-400">
            <MapPin size={20} />
            <h4 className="text-lg font-bold uppercase tracking-widest pr-1">Workstation Check-in</h4>
          </div>
          <p className="text-[10px] text-slate-500 italic leading-relaxed pr-1">
            Configure the maximum single-session auto-checkout limit and manage your desk locations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Auto-Cutoff Limit Card */}
          <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
                  Auto-Cutoff Duration
                </span>
                <span className="text-xs font-mono font-black text-indigo-400">
                  {Math.round(getMaxWorkstationSessionMinutes(state) / 60)}h ({getMaxWorkstationSessionMinutes(state)}m)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Automatically checks out and saves the interval if a workstation session runs longer than this limit.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-5 gap-1.5">
                {[2, 4, 6, 8, 12].map((hr) => {
                  const mins = hr * 60;
                  const isSelected = getMaxWorkstationSessionMinutes(state) === mins;
                  return (
                    <button
                      key={hr}
                      type="button"
                      onClick={() => setState((prev) => ({ ...prev, workstationMaxSessionMinutes: mins }))}
                      className={cn(
                        'py-1.5 rounded-xl text-xs font-bold border transition-all',
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      )}
                    >
                      {hr}h
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800">
                <span className="text-xs font-bold text-slate-400">Custom Hours:</span>
                <SpinnerInput
                  value={Math.max(1, Math.round(getMaxWorkstationSessionMinutes(state) / 60))}
                  onChange={(val) => {
                    const hours = typeof val === 'number' ? Math.max(1, Math.min(24, val)) : 4;
                    setState((prev) => ({ ...prev, workstationMaxSessionMinutes: hours * 60 }));
                  }}
                  min={1}
                  max={24}
                />
              </div>
            </div>
          </div>

          {/* Check-in Locations Card */}
          <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
                  Check-In Locations
                </span>
                <span className="text-xs font-mono font-bold text-slate-500">
                  {getWorkstationLocations(state).length} configured
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Customize the desk, lab, or library locations available in your top-bar workstation menu.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex flex-wrap gap-1.5">
                {getWorkstationLocations(state).map((loc) => (
                  <span
                    key={loc}
                    className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-300 flex items-center gap-1.5"
                  >
                    <LocationIcon
                      locName={loc}
                      customIcons={state.workstationLocationIcons}
                      size={12}
                    />
                    <span>{loc}</span>
                  </span>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setIsLocationModalOpen(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Settings2 size={14} className="text-indigo-400" />
                <span>Manage Locations & Icons</span>
              </button>
            </div>
          </div>
        </div>

        <ManageLocationsModal
          isOpen={isLocationModalOpen}
          onClose={() => setIsLocationModalOpen(false)}
          state={state}
          setState={setState}
        />
      </div>

      <div className="space-y-6 pt-6 border-t border-slate-800">
        <div className="flex items-center gap-2.5 text-indigo-400 mb-6 pb-2">
          <CalendarCheck size={20} />
          <h4 className="text-lg font-bold uppercase tracking-widest pr-1">Start/End of the day</h4>
        </div>

        <div className="space-y-6">
           <div id="setting-open-ended" className="flex items-center justify-between gap-3 py-3.5 border-b border-slate-800/60">
             <div className="flex items-center gap-3">
               <div className={cn("p-2 rounded-xl", state.defaultOpenEndedDungeon ? "bg-indigo-500/10 text-indigo-400" : "bg-slate-800 text-slate-500")}>
                 <Clock size={20} />
               </div>
               <div className="flex-1 pr-4">
                 <div className="text-[13px] font-semibold text-slate-100 mb-0.5">Tasks Default to Open-Ended</div>
                 <div className="text-[11px] text-slate-500 leading-snug">
                   New tasks will not require a "Total Rooms" goal. They will run endlessly and track total focus time until manually completed.
                 </div>
               </div>
             </div>
             <button
               onClick={() => setState(prev => ({ ...prev, defaultOpenEndedDungeon: !prev.defaultOpenEndedDungeon }))}
               className={cn(
                 "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                 state.defaultOpenEndedDungeon ? "bg-indigo-500" : "bg-slate-700"
               )}
             >
               <span
                 className={cn(
                   "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                   state.defaultOpenEndedDungeon ? "translate-x-6" : "translate-x-1"
                 )}
               />
             </button>
           </div>
           <div id="setting-start-of-day" className="flex items-center justify-between gap-3 py-3.5 border-b border-slate-800/60">
             <div className="flex items-center gap-3">
               <div className={cn("p-2 rounded-xl", state.enableStartOfDayPrompt ? "bg-indigo-500/10 text-indigo-400" : "bg-slate-800 text-slate-500")}>
                 <Sunrise size={20} />
               </div>
               <div className="flex-1 pr-4">
                 <div className="text-[13px] font-semibold text-slate-100 mb-0.5">Show "Start of the Day" Prompt</div>
                 <div className="text-[11px] text-slate-500 leading-snug">
                   When enabled, the app will play a sunrise animation on startup and open directly into the Start of the Day screen on a new day. Disabled by default.
                 </div>
               </div>
             </div>
             <button
               onClick={() => setState(prev => ({ ...prev, enableStartOfDayPrompt: !prev.enableStartOfDayPrompt }))}
               className={cn(
                 "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                 state.enableStartOfDayPrompt ? "bg-indigo-500" : "bg-slate-700"
               )}
             >
               <span
                 className={cn(
                   "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                   state.enableStartOfDayPrompt ? "translate-x-6" : "translate-x-1"
                 )}
               />
             </button>
           </div>
          <div id="setting-markdown" className="flex items-center justify-between gap-3 py-3.5 border-b border-slate-800/60">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-xl", defaultMarkdownEnabled ? "bg-indigo-500/10 text-indigo-400" : "bg-slate-800 text-slate-500")}>
                <Eye size={20} />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-slate-100">Default Markdown</div>
                <div className="text-[11px] text-slate-500">Enable Markdown in Daily Reflection by default</div>
              </div>
            </div>
            <button
              onClick={() => setState(prev => ({ ...prev, defaultMarkdownEnabled: !defaultMarkdownEnabled }))}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                defaultMarkdownEnabled ? "bg-indigo-500" : "bg-slate-700"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  defaultMarkdownEnabled ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>

          <div id="setting-moods" className="py-3.5 border-b border-slate-800/60 space-y-3">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-rose-400">
                <Smile size={18} />
                <h5 className="text-xs font-bold uppercase tracking-widest">Mood Configuration</h5>
              </div>
              <p className="text-xs text-slate-500 italic">Select which moods are available in your daily summary.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MOOD_OPTIONS.map(mood => {
                  const isEnabled = (state.enabledMoods || DEFAULT_ENABLED_MOODS).includes(mood.id);
                  const Icon = mood.icon;
                  return (
                    <button
                      key={mood.id}
                      onClick={() => {
                        const currentEnabled = state.enabledMoods || DEFAULT_ENABLED_MOODS;
                        let nextEnabled;
                        if (isEnabled) {
                          if (currentEnabled.length <= 1) return;
                          nextEnabled = currentEnabled.filter(id => id !== mood.id);
                        } else {
                          nextEnabled = [...currentEnabled, mood.id];
                        }
                        setState(prev => ({ ...prev, enabledMoods: nextEnabled }));
                      }}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-2xl border transition-all",
                        isEnabled 
                          ? "bg-slate-800/80 border-slate-700 shadow-sm" 
                          : "bg-slate-900 border-slate-800 opacity-60 grayscale-[0.5]"
                      )}
                    >
                      <div className={cn("p-2 rounded-xl transition-colors", isEnabled ? `${mood.bg} ${mood.color}` : "bg-slate-800 text-slate-500")}>
                        <Icon size={18} />
                      </div>
                      <div className="flex-1 text-left">
                        <div className={cn("text-sm font-bold", isEnabled ? "text-white" : "text-slate-500")}>{mood.label}</div>
                      </div>
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                        isEnabled ? "bg-indigo-500 border-indigo-500" : "border-slate-700"
                      )}>
                        {isEnabled && <Check size={10} className="text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div id="setting-daily-goal" className="py-3.5 border-b border-slate-800/60 space-y-3">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-400">
                  <Target size={18} />
                  <h5 className="text-xs font-bold uppercase tracking-widest">Daily Progress Goal</h5>
                </div>
                <button
                  onClick={() => setState(prev => ({ ...prev, useSameDailyProgressGoalEveryDay: !prev.useSameDailyProgressGoalEveryDay }))}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                    state.useSameDailyProgressGoalEveryDay ?? true ? "bg-slate-700" : "bg-amber-500"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      state.useSameDailyProgressGoalEveryDay ?? true ? "translate-x-1" : "translate-x-6"
                    )}
                  />
                </button>
              </div>
              
              <p className="text-xs text-slate-500 italic">Sets the target focus session count to track your completion progress in daily summaries.</p>

              {state.useSameDailyProgressGoalEveryDay ?? true ? (
                <div className="flex items-center justify-between bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                   <span className="text-sm font-bold text-slate-300">Goal per day:</span>
                   <SpinnerInput
                      value={state.dailyProgressGoal ?? 8}
                      onChange={(val) => setState(prev => ({ ...prev, dailyProgressGoal: typeof val === 'number' ? val : 8 }))}
                      min={1}
                    />
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6, 0].map(day => (
                    <div key={day} className="flex flex-col items-center w-[calc(14.28%-0.5rem)] min-w-[4rem] bg-slate-950/50 p-2 rounded-xl border border-slate-800">
                      <label className="text-[9px] font-bold text-slate-500 uppercase mb-1">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]}
                      </label>
                      <SpinnerInput
                        value={state.dailyProgressGoalConfig?.[day] ?? 8}
                        onChange={(val) => {
                          const num = typeof val === 'number' ? val : 1;
                          setState(prev => ({
                            ...prev,
                            dailyProgressGoalConfig: {
                              ...(prev.dailyProgressGoalConfig || {}),
                              [day]: num
                            }
                          }));
                        }}
                        min={1}
                      />
                    </div>
                  ))}
                </div>
              )}
              
              <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between">
                <div className="max-w-[70%]">
                  <h6 className="text-[11px] font-bold text-slate-300 mb-1">Limited Mental Effort Mode</h6>
                  <p className="text-[10px] text-slate-500 leading-snug">When enabled, the app will prevent you from starting new sessions and prompt you to rest once you reach your daily progress goal.</p>
                </div>
                 <button
                   onClick={() => setState(prev => ({ ...prev, limitedMentalEffort: !prev.limitedMentalEffort }))}
                   className={cn(
                     "relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0",
                     state.limitedMentalEffort ? "bg-amber-500" : "bg-slate-700"
                   )}
                 >
                   <span
                     className={cn(
                       "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                       state.limitedMentalEffort ? "translate-x-6" : "translate-x-1"
                     )}
                   />
                 </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 pt-6 border-t border-slate-800">
        <div className="flex items-center gap-2.5 text-indigo-400 mb-6 pb-2">
          <Bell size={20} />
          <h4 className="text-lg font-bold uppercase tracking-widest pr-1">System Notifications</h4>
        </div>

        <div id="setting-push" className="space-y-4">
          <div className="flex items-center justify-between gap-3 py-3.5 border-b border-slate-800/60">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-xl", state.pushEnabled ? "bg-indigo-500/10 text-indigo-400" : "bg-slate-800 text-slate-500")}>
                {state.pushEnabled ? <Bell size={20} /> : <BellOff size={20} />}
              </div>
              <div>
                <div className="text-[13px] font-semibold text-slate-100">Push Notifications</div>
                <div className="text-[11px] text-slate-500">Alerts for timer ends and rest periods</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {state.pushEnabled && (
                <div className="flex gap-2">
                  <button
                    onClick={forceSyncNotifications}
                    disabled={isSubscribing}
                    className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-indigo-400 transition-colors"
                    title="Force Sync Notifications"
                  >
                    <RefreshCw size={16} className={cn(isSubscribing && "animate-spin")} />
                  </button>
                  <button
                    onClick={resetPushState}
                    disabled={isSubscribing}
                    className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                    title="Reset Push State"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
              <button
                onClick={handleNotificationToggle}
                disabled={isSubscribing}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                  state.pushEnabled ? "bg-indigo-500" : "bg-slate-700",
                  isSubscribing && "opacity-50 cursor-not-allowed"
                )}
              >
              {isSubscribing ? (
                <RefreshCw size={12} className="animate-spin text-white mx-auto" />
              ) : (
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    state.pushEnabled ? "translate-x-6" : "translate-x-1"
                  )}
                />
              )}
            </button>
          </div>
        </div>
          {!state.pushEnabled && (
            <p className="text-[10px] text-slate-500 px-4 italic">
              Requires PWA installation on iOS. Make sure to allow permissions when prompted.
            </p>
          )}
        </div>
      </div>


      <div className="space-y-6 pt-6 border-t border-slate-800">
        <div className="flex items-center gap-2.5 text-amber-400 mb-6 pb-2">
          <Target size={20} />
          <h4 className="text-lg font-bold uppercase tracking-widest pr-1">Quest UI Notifications</h4>
        </div>

        <div className="space-y-4">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Completion Notification</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setState(prev => ({ ...prev, questNotificationStyle: 'red_dot' }))}
              className={cn(
                "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left",
                state.questNotificationStyle === 'red_dot' 
                  ? "bg-amber-500/10 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]" 
                  : "bg-slate-900 border-slate-800 hover:border-slate-700"
              )}
            >
              <div className="relative p-2 bg-slate-800 rounded-xl text-slate-400">
                <Target size={20} />
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-indigo-500 rounded-full border-2 border-slate-950" />
              </div>
              <div>
                <div className={cn("font-bold", state.questNotificationStyle === 'red_dot' ? "text-amber-400" : "text-white")}>Red Dot</div>
                <div className="text-[10px] text-slate-500">Show indicator on tab icon</div>
              </div>
            </button>

            <button
              onClick={() => setState(prev => ({ ...prev, questNotificationStyle: 'popup' }))}
              className={cn(
                "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left",
                state.questNotificationStyle === 'popup' 
                  ? "bg-amber-500/10 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]" 
                  : "bg-slate-900 border-slate-800 hover:border-slate-700"
              )}
            >
              <div className="p-2 bg-slate-800 rounded-xl text-slate-400">
                <Gift size={20} />
              </div>
              <div>
                <div className={cn("font-bold", state.questNotificationStyle === 'popup' ? "text-amber-400" : "text-white")}>Instant Popup</div>
                <div className="text-[10px] text-slate-500">Show reward window immediately</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal 
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        type={modalConfig.type}
        isAlert={modalConfig.isAlert}
      />
    </div>
  );
};

