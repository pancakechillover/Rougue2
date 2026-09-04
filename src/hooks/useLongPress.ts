import { useRef, useCallback } from 'react';
import { useTimerStore } from './useTimerStore';
import { playSound } from '../lib/sound';

interface UseLongPressOptions {
  onShortPress: () => void;
  onLongPress: () => void;
  onContinuousPress?: () => void;
  delay?: number;
  interval?: number;
}

export function useLongPress({
  onShortPress,
  onLongPress,
  onContinuousPress,
  delay = 800,
  interval = 300,
}: UseLongPressOptions) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;

    isLongPressRef.current = false;
    clear();

    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onLongPress();

      if (onContinuousPress) {
        intervalRef.current = setInterval(() => {
          onContinuousPress();
        }, interval);
      }
    }, delay);
  }, [onLongPress, onContinuousPress, delay, interval, clear]);

  const handlePointerUp = useCallback(() => {
    clear();
  }, [clear]);

  const handlePointerLeave = useCallback(() => {
    clear();
  }, [clear]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isLongPressRef.current) {
      e.preventDefault();
      e.stopPropagation();
      isLongPressRef.current = false;
      return;
    }
    onShortPress();
  }, [onShortPress]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (isLongPressRef.current) {
      e.preventDefault();
    }
  }, []);

  return {
    onClick: handleClick,
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
    onPointerLeave: handlePointerLeave,
    onPointerCancel: handlePointerUp,
    onContextMenu: handleContextMenu,
  };
}

export function useDistractionButton(
  type: 'internal' | 'external' | 'unavoidable',
  soundType: 'click' | 'pop' | 'error' = 'click'
) {
  const { setDistractions } = useTimerStore();

  return useLongPress({
    onShortPress: () => {
      playSound(soundType, 0.5, true);
      setDistractions((d) => ({ ...d, [type]: d[type] + 1 }));
    },
    onLongPress: () => {
      playSound('pop', 0.4, true);
      setDistractions((d) => ({ ...d, [type]: Math.max(0, d[type] - 1) }));
    },
    onContinuousPress: () => {
      playSound('pop', 0.3, true);
      setDistractions((d) => ({ ...d, [type]: Math.max(0, d[type] - 1) }));
    },
    delay: 800,
    interval: 300,
  });
}
