import React from 'react';

export const HandBook = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 19c0 0 0-13 1-14c1-1 5 0 7 1c2-1 6-2 7-1c1 1 1 14 1 14c0 0-5-2-8-1c-3-1-8 1-8 1z" />
    <path d="M12 6v12" />
  </svg>
);

export const HandCoins = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 9c0 2 3.5 3 7 3s7-1 7-3-3.5-3-7-3-7 1-7 3z" />
    <path d="M5 14c0 2 3.5 3 7 3s7-1 7-3" />
    <path d="M5 19c0 2 3.5 3 7 3s7-1 7-3" />
  </svg>
);

export const HandTarget = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 3C7 3 3 8 4 13c0 5 5 9 9 8c5-1 9-5 8-10c-1-5-5-8-9-8z" />
    <path d="M12 7c-3 0-5 3-4 6c0 2 3 4 5 3c3-1 4-4 3-6c-1-2-3-3-4-3z" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
  </svg>
);

export const HandZap = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M13 2L5 13h6l-1 9 9-11h-6z" />
  </svg>
);
