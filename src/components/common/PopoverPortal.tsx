import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

interface PopoverPortalProps {
  anchorElement: HTMLElement | null;
  children: React.ReactNode;
  offsetY?: number;
}

export const PopoverPortal: React.FC<PopoverPortalProps> = ({ anchorElement, children, offsetY = 8 }) => {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 260, height: 160 });

  useEffect(() => {
    if (!anchorElement) {
      setRect(null);
      return;
    }
    
    let frameId: number;
    const updateRect = () => {
      setRect(anchorElement.getBoundingClientRect());
      frameId = requestAnimationFrame(updateRect);
    };
    updateRect();
    return () => cancelAnimationFrame(frameId);
  }, [anchorElement]);

  useLayoutEffect(() => {
    if (popoverRef.current) {
      setSize({
        width: popoverRef.current.offsetWidth || 260,
        height: popoverRef.current.offsetHeight || 160
      });
    }
  }, [children, rect]);

  if (!anchorElement || !rect) return null;

  // Calculate dynamic constraints to ensure the popover floats entirely inside the viewport
  // We enforce a minimum padding margin of 12px from both left and right screen borders
  const safetyMargin = 12;
  const halfWidth = size.width / 2;
  const minLeft = halfWidth + safetyMargin;
  const maxLeft = window.innerWidth - (halfWidth + safetyMargin);
  
  // Guard against incredibly narrow viewports where halfWidth exceeds middle bounds
  const finalMinLeft = Math.min(minLeft, window.innerWidth / 2);
  const finalMaxLeft = Math.max(maxLeft, window.innerWidth / 2);

  const anchorCenter = rect.left + rect.width / 2;
  const constrainedLeft = Math.min(Math.max(anchorCenter, finalMinLeft), finalMaxLeft);

  // If there is not enough room at the top (popover height + offset exceeds space), place below anchor
  const spaceAbove = rect.top - offsetY;
  const placeBelow = spaceAbove < size.height + 16 && (window.innerHeight - rect.bottom > size.height + 16);

  const topPos = placeBelow 
    ? rect.bottom + offsetY 
    : Math.max(rect.top - offsetY, 16);

  // Calculate arrow position relative to the popover center so it points directly at the anchor
  const arrowOffset = Math.max(-halfWidth + 16, Math.min(halfWidth - 16, anchorCenter - constrainedLeft));

  return createPortal(
    <div 
      ref={popoverRef}
      className="fixed z-[9999] pointer-events-auto select-none"
      style={{
        left: `${constrainedLeft}px`,
        top: `${topPos}px`,
        transform: placeBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)'
      }}
    >
      <div className="relative">
        {children}
        {/* Dynamic pointer arrow */}
        <div 
          className="absolute pointer-events-none"
          style={{
            left: `calc(50% + ${arrowOffset}px)`,
            transform: 'translateX(-50%)',
            ...(placeBelow 
              ? { bottom: '100%', marginBottom: '-1px' } 
              : { top: '100%', marginTop: '-1px' })
          }}
        >
          <div 
            className={placeBelow 
              ? "border-8 border-transparent border-b-slate-700" 
              : "border-8 border-transparent border-t-slate-700"
            } 
          />
        </div>
      </div>
    </div>,
    document.body
  );
};

