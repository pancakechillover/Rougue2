import { useEffect, useRef } from 'react';

export function useBackgroundKeepAlive(isActive: boolean, isResting: boolean, duration: number, timeLeft: number) {
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (isActive) {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: isResting ? 'Resting...' : 'Focusing...',
          artist: "Scholar's Dungeon",
          album: 'Timer Active',
        });
      }

      // Instead of audio, optionally request a screen wake lock if available
      // This prevents the device from sleeping while the timer is on screen
      if ('wakeLock' in navigator && navigator.wakeLock && navigator.wakeLock.request) {
        navigator.wakeLock.request('screen').then(lock => {
          wakeLockRef.current = lock;
        }).catch(err => {
          console.warn("Wake Lock not acquired:", err);
        });
      }
    } else {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
      }
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    }
    
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [isActive, isResting]);
  
  // Throttle media session progress updates to avoid performance hits
  useEffect(() => {
    if (isActive && 'mediaSession' in navigator && navigator.mediaSession.setPositionState) {
      try {
        const totalDuration = (duration || 25) * 60;
        const position = Math.max(0, totalDuration - timeLeft);
        navigator.mediaSession.setPositionState({
          duration: totalDuration > 0 ? totalDuration : 1,
          playbackRate: 1,
          position: position <= totalDuration ? position : 0
        });
      } catch (e) {
        // Some browsers don't support partial position state
      }
    }
  }, [isActive, timeLeft, duration]);
}

