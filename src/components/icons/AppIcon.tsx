import React from 'react';

export const AppIcon = ({ size = 64, className = "" }: { size?: number | string, className?: string }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <g id="Centered-Icon-Group" transform="translate(0, -1) scale(1.2)">
        <path d="M 5 146.25 C 20 146.25 40 145.5 52 144 C 58 143.2 64 143.2 64 146.25 C 64 149.3 58 149.3 52 148.5 C 40 147 20 146.25 5 146.25 Z" fill="currentColor"/>
        <g id="Icon-Scholar-Sword" transform="rotate(30, 60, 145)">
          <mask id="sword-mask">
            <rect x="-100" y="-100" width="400" height="400" fill="white" />
            <circle cx="60" cy="60" r="6" fill="black"/>
            <rect x="58.75" y="63" width="2.5" height="80" fill="black"/>
          </mask>
          
          <g mask="url(#sword-mask)">
            <path d="M60 145Q57 125 48 105L50 42L60 18L70 42L72 105Q63 125 60 145Z" fill="currentColor"/>
            <rect x="30" y="36" width="60" height="6" rx="1" fill="currentColor"/>
            <circle cx="30" cy="39" r="5" fill="currentColor"/>
            <circle cx="90" cy="39" r="5" fill="currentColor"/>
            <rect x="55" y="15" width="10" height="21" fill="currentColor"/>
            <circle cx="60" cy="12" r="7" fill="currentColor"/>
          </g>
        </g>
      </g>
    </svg>
  );
};
