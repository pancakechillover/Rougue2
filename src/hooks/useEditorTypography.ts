import { useState, useEffect } from 'react';

export type EditorFontSize = 12 | 13 | 14 | 15 | 16 | 18;
export type EditorLineHeight = 'tight' | 'normal' | 'relaxed' | 'loose';

export interface EditorTypographySettings {
  fontSize: EditorFontSize;
  lineHeight: EditorLineHeight;
}

const STORAGE_KEY = 'scholar_editor_typography';

export const LINE_HEIGHT_MAP: Record<EditorLineHeight, number> = {
  tight: 1.35,
  normal: 1.55,
  relaxed: 1.8,
  loose: 2.1,
};

export const DEFAULT_TYPOGRAPHY: EditorTypographySettings = {
  fontSize: 14,
  lineHeight: 'normal',
};

export function getStoredTypography(): EditorTypographySettings {
  if (typeof window === 'undefined') return DEFAULT_TYPOGRAPHY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        fontSize: [12, 13, 14, 15, 16, 18].includes(parsed.fontSize) ? parsed.fontSize : 14,
        lineHeight: ['tight', 'normal', 'relaxed', 'loose'].includes(parsed.lineHeight) ? parsed.lineHeight : 'normal',
      };
    }
  } catch (e) {
    console.error('Failed to parse editor typography settings', e);
  }
  return DEFAULT_TYPOGRAPHY;
}

export function saveStoredTypography(settings: EditorTypographySettings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('scholar-typography-change', { detail: settings }));
  } catch (e) {
    console.error('Failed to save editor typography settings', e);
  }
}

export function useEditorTypography() {
  const [typography, setTypography] = useState<EditorTypographySettings>(() => getStoredTypography());

  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<EditorTypographySettings>;
      if (customEvent.detail) {
        setTypography(customEvent.detail);
      } else {
        setTypography(getStoredTypography());
      }
    };

    window.addEventListener('scholar-typography-change', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('scholar-typography-change', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const updateFontSize = (fontSize: EditorFontSize) => {
    const updated = { ...typography, fontSize };
    setTypography(updated);
    saveStoredTypography(updated);
  };

  const updateLineHeight = (lineHeight: EditorLineHeight) => {
    const updated = { ...typography, lineHeight };
    setTypography(updated);
    saveStoredTypography(updated);
  };

  const lineMultiplier = LINE_HEIGHT_MAP[typography.lineHeight];

  return {
    typography,
    fontSize: typography.fontSize,
    lineHeight: typography.lineHeight,
    lineMultiplier,
    updateFontSize,
    updateLineHeight,
    setTypography: (settings: EditorTypographySettings) => {
      setTypography(settings);
      saveStoredTypography(settings);
    }
  };
}
