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
  const [width, setWidth] = useState(256); // Default fallback (e.g. w-64 is 256px)

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
      setWidth(popoverRef.current.offsetWidth || 256);
    }
  }, [children, rect]);

  if (!anchorElement || !rect) return null;

  // Calculate dynamic constraints to ensure the popover floats entirely inside the viewport
  // We enforce a minimum padding margin of 8px from both left and right screen borders
  const safetyMargin = 8;
  const halfWidth = width / 2;
  const minLeft = halfWidth + safetyMargin;
  const maxLeft = window.innerWidth - (halfWidth + safetyMargin);
  
  // Guard against incredibly narrow viewports where halfWidth exceeds middle bounds
  const finalMinLeft = Math.min(minLeft, window.innerWidth / 2);
  const finalMaxLeft = Math.max(maxLeft, window.innerWidth / 2);

  const targetLeft = rect.left + rect.width / 2;
  const constrainedLeft = Math.min(Math.max(targetLeft, finalMinLeft), finalMaxLeft);

  return createPortal(
    <div 
      ref={popoverRef}
      className="fixed z-[9999] pointer-events-auto"
      style={{
        left: `${constrainedLeft}px`,
        top: `${Math.max(rect.top - offsetY, 16)}px`,
        transform: 'translate(-50%, -100%)'
      }}
    >
      {children}
    </div>,
    document.body
  );
};
