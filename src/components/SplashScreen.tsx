import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Sun, Sparkles } from 'lucide-react';
import { APP_VERSION } from '../version';
import { AppIcon } from './icons/AppIcon';
import { cn } from '../lib/utils';

export interface SplashScreenProps {
  onComplete: () => void;
  variant?: 'default' | 'sunrise';
  theme?: string;
}


const AnimatedSunrise = ({ size = 80, className = "" }: { size?: number, className?: string }) => {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      initial="hidden"
      animate="visible"
    >
      {/* Horizon line */}
      <motion.path d="M22 22H2" variants={{ hidden: { pathLength: 0, opacity: 0 }, visible: { pathLength: 1, opacity: 1, transition: { duration: 0.8, ease: "easeInOut", delay: 0.2 } } }} />
      {/* Sun arc */}
      <motion.path d="M16 18a4 4 0 0 0-8 0" variants={{ hidden: { pathLength: 0, opacity: 0 }, visible: { pathLength: 1, opacity: 1, transition: { duration: 0.8, ease: "easeOut", delay: 0.5 } } }} />
      {/* Up arrow line */}
      <motion.path d="M12 2v8" variants={{ hidden: { pathLength: 0, opacity: 0 }, visible: { pathLength: 1, opacity: 1, transition: { duration: 0.6, ease: "easeOut", delay: 0.8 } } }} />
      {/* Up arrow head */}
      <motion.path d="m8 6 4-4 4 4" variants={{ hidden: { pathLength: 0, opacity: 0 }, visible: { pathLength: 1, opacity: 1, transition: { duration: 0.4, ease: "easeOut", delay: 1.1 } } }} />
      {/* Rays */}
      <motion.path d="M2 18h2" variants={{ hidden: { pathLength: 0, opacity: 0 }, visible: { pathLength: 1, opacity: 1, transition: { duration: 0.4, delay: 1.3 } } }} />
      <motion.path d="m4.93 10.93 1.41 1.41" variants={{ hidden: { pathLength: 0, opacity: 0 }, visible: { pathLength: 1, opacity: 1, transition: { duration: 0.4, delay: 1.4 } } }} />
      <motion.path d="m19.07 10.93-1.41 1.41" variants={{ hidden: { pathLength: 0, opacity: 0 }, visible: { pathLength: 1, opacity: 1, transition: { duration: 0.4, delay: 1.4 } } }} />
      <motion.path d="M20 18h2" variants={{ hidden: { pathLength: 0, opacity: 0 }, visible: { pathLength: 1, opacity: 1, transition: { duration: 0.4, delay: 1.3 } } }} />
    </motion.svg>
  );
};

export function SplashScreen({ onComplete, variant = 'default' }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2500); // 2.5 seconds splash
    return () => clearTimeout(timer);
  }, [onComplete]);

  const isSunrise = variant === 'sunrise';

  return (
    <motion.div 
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
    >
      {/* Background mystical effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {isSunrise ? (
          <motion.div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[45vw] h-[45vw] bg-indigo-500/15 blur-[100px] rounded-full mix-blend-screen"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.4, opacity: 1 }}
            transition={{ duration: 2, ease: "easeOut" }}
          />
        ) : (
          <motion.div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] bg-indigo-600/20 blur-[100px] rounded-full mix-blend-screen"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 1 }}
            transition={{ duration: 2, ease: "easeOut" }}
          />
        )}
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Emblem / Logo */}
        {isSunrise ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative"
          >
            <div className="mb-10 flex items-center justify-center drop-shadow-[0_0_15px_rgba(99,102,241,0.15)]">
              <AnimatedSunrise size={80} className="text-indigo-400" />
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative"
          >
            <div className="mb-10 flex items-center justify-center">
              <AppIcon size={80} className="text-indigo-400" />
            </div>
          </motion.div>
        )}

        {/* Title, Divider, Subtitle and Version (Original Elegant Typography & Theme Colors) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="text-center"
        >
          <h1 className={cn(
            "text-3xl font-bold tracking-widest uppercase mb-2",
            isSunrise ? "text-indigo-400" : "text-indigo-400"
          )}>
            Scholar's Dungeon
          </h1>

          <motion.div 
            className="h-0.5 mx-auto bg-indigo-500/50"
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 1, delay: 0.8, ease: "easeInOut" }}
          />

          {isSunrise ? (
            <p className="text-slate-400 mt-4 text-sm tracking-widest uppercase font-medium flex items-center justify-center gap-2">
              <Sun size={14} className="text-indigo-400" />
              <span>Start of the Day</span>
              <Sparkles size={12} className="text-indigo-400" />
            </p>
          ) : (
            <p className="text-slate-400 mt-4 text-sm tracking-widest uppercase font-medium">
              Forge Your Legend
            </p>
          )}

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-8 text-slate-600 text-[10px] font-bold tracking-[0.2em] uppercase"
          >
            Version {APP_VERSION.replace('v', '')}
          </motion.div>
        </motion.div>
      </div>

    </motion.div>
  );
}
