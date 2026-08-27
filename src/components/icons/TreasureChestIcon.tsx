import React from 'react';

export const TreasureChestIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M2 12V8.5a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4V12" />
      <path d="M2 12v8a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-8" />
      <path d="M2 12h7" />
      <path d="M15 12h7" />
      <path d="M6 21V4.5" />
      <path d="M18 21V4.5" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
      <path d="M12 11v2" />
    </svg>
  );
};
