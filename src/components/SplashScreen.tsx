import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Sun, Sparkles } from 'lucide-react';
import { APP_VERSION } from '../version';
import { AppIcon } from './icons/AppIcon';
import { cn } from '../lib/utils';

interface SplashScreenProps {
  onComplete: () => void;
  variant?: 'default' | 'sunrise';
  theme?: string;
}

export function SplashScreen({ onComplete, variant = 'default', theme }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2600); // 2.6 seconds splash
    return () => clearTimeout(timer);
  }, [onComplete]);

  const currentTheme = theme || (typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : '') || 'night';
  const isLight = ['daylight', 'warm', 'candy'].includes(currentTheme);
  const isSunrise = variant === 'sunrise';

  return (
    <motion.div 
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.6, ease: "easeInOut" } }}
    >
      {/* Background Atmosphere */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {isSunrise ? (
          <>
            {/* Sunrise Morning Sky Gradient Bloom */}
            <motion.div 
              className={cn(
                "absolute inset-0",
                isLight 
                  ? "bg-gradient-to-t from-amber-200/40 via-orange-100/20 to-transparent" 
                  : "bg-gradient-to-t from-amber-950/50 via-indigo-950/40 to-slate-950"
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />

            {/* Rising Sun Radial Auroras */}
            <motion.div 
              className={cn(
                "absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[80vw] max-w-[650px] h-[80vw] max-h-[650px] blur-[90px] rounded-full pointer-events-none",
                isLight 
                  ? "bg-gradient-to-t from-orange-400/25 via-amber-300/20 to-transparent" 
                  : "bg-gradient-to-t from-orange-600/20 via-amber-600/15 to-transparent"
              )}
              initial={{ y: 150, scale: 0.6, opacity: 0 }}
              animate={{ y: 0, scale: 1.2, opacity: 1 }}
              transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1] }}
            />

            {/* Dawn Horizon Arc */}
            <motion.div 
              className={cn(
                "absolute bottom-0 inset-x-0 h-40 flex items-end justify-center pointer-events-none",
                isLight 
                  ? "bg-gradient-to-t from-amber-100/60 via-amber-50/30 to-transparent" 
                  : "bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent"
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2 }}
            >
              <div className={cn(
                "w-full h-[1px]",
                isLight 
                  ? "bg-gradient-to-r from-transparent via-amber-400/60 to-transparent shadow-[0_0_12px_rgba(245,158,11,0.4)]" 
                  : "bg-gradient-to-r from-transparent via-amber-500/40 to-transparent shadow-[0_0_15px_rgba(245,158,11,0.5)]"
              )} />
            </motion.div>
          </>
        ) : (
          /* Default Mystical Twilight Aura */
          <motion.div 
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] blur-[100px] rounded-full",
              isLight ? "bg-indigo-400/20" : "bg-indigo-600/20 mix-blend-screen"
            )}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 1 }}
            transition={{ duration: 2, ease: "easeOut" }}
          />
        )}
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Centerpiece: Rising Sun with Emblem Core in Sunrise Mode, or Standalone Logo in Default Mode */}
        {isSunrise ? (
          <motion.div
            className="relative flex items-center justify-center mb-8"
            initial={{ y: 80, scale: 0.65, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* 1. Rotating Radiant Sunbeams (Centered exactly on the Logo/Sun) */}
            <motion.div 
              className="absolute w-[440px] h-[440px] sm:w-[520px] sm:h-[520px] pointer-events-none flex items-center justify-center"
              initial={{ rotate: 0, opacity: 0 }}
              animate={{ rotate: 45, opacity: isLight ? 0.35 : 0.3 }}
              transition={{ duration: 3, ease: "easeOut" }}
            >
              <svg viewBox="0 0 200 200" className={cn("w-full h-full", isLight ? "text-amber-500/50" : "text-amber-500/30")}>
                {[...Array(12)].map((_, i) => (
                  <line 
                    key={i} 
                    x1="100" 
                    y1="100" 
                    x2={100 + 92 * Math.cos((i * 30 * Math.PI) / 180)} 
                    y2={100 + 92 * Math.sin((i * 30 * Math.PI) / 180)} 
                    stroke="currentColor" 
                    strokeWidth="1.5" 
                    strokeDasharray="4 6" 
                  />
                ))}
              </svg>
            </motion.div>

            {/* 2. Pulsing Sun Outer Atmosphere Glow */}
            <div className={cn(
              "absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full blur-2xl pointer-events-none animate-pulse",
              isLight 
                ? "bg-gradient-to-t from-orange-400/50 via-amber-300/60 to-yellow-200/50" 
                : "bg-gradient-to-t from-orange-600/35 via-amber-500/30 to-amber-400/15"
            )} />

            {/* 3. The Solid Radiant Sun Disc (The Orb) */}
            <motion.div 
              className={cn(
                "relative w-28 h-28 sm:w-32 sm:h-32 rounded-full flex items-center justify-center overflow-hidden shadow-2xl",
                isLight 
                  ? "bg-gradient-to-br from-yellow-200 via-amber-400 to-orange-500 shadow-[0_0_35px_rgba(245,158,11,0.45)] border border-amber-200/60" 
                  : "bg-gradient-to-b from-amber-300 via-amber-500 to-orange-600 shadow-[0_0_30px_rgba(245,158,11,0.35)] border border-amber-400/30"
              )}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            >
              {/* Subtle inner sun ambient sheen */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/15 via-transparent to-white/20 pointer-events-none" />

              {/* App Logo EXACTLY in the Center of the Sun */}
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                className="relative z-10 flex items-center justify-center"
              >
                <AppIcon 
                  size={68} 
                  className={cn(
                    "transition-all duration-300",
                    isLight 
                      ? "text-slate-900 drop-shadow-[0_2px_8px_rgba(0,0,0,0.18)]" 
                      : "text-slate-950 drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
                  )} 
                />
              </motion.div>
            </motion.div>
          </motion.div>
        ) : (
          /* Default Logo Container */
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 25 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="relative mb-8"
          >
            <div className="flex items-center justify-center relative">
              <AppIcon 
                size={80} 
                className={isLight ? "text-indigo-600" : "text-indigo-400"} 
              />
            </div>
          </motion.div>
        )}

        {/* App Title and Subtitles */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: isSunrise ? 0.4 : 0.3, ease: "easeOut" }}
          className="text-center"
        >
          <h1 className={cn(
            "text-3xl sm:text-4xl font-black tracking-widest uppercase mb-2",
            isSunrise 
              ? (isLight 
                  ? "text-slate-900 drop-shadow-sm" 
                  : "text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-300 to-orange-300 drop-shadow-sm") 
              : (isLight ? "text-slate-900" : "text-indigo-400")
          )}>
            Scholar's Dungeon
          </h1>

          {/* Animated Divider */}
          <motion.div 
            className={cn(
              "h-0.5 mx-auto rounded-full",
              isSunrise 
                ? (isLight 
                    ? "bg-gradient-to-r from-transparent via-amber-500/80 to-transparent shadow-[0_0_8px_rgba(245,158,11,0.4)]" 
                    : "bg-gradient-to-r from-transparent via-amber-500/60 to-transparent shadow-[0_0_6px_rgba(245,158,11,0.4)]")
                : (isLight ? "bg-indigo-600/30" : "bg-indigo-500/50")
            )}
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 1, delay: isSunrise ? 0.7 : 0.6, ease: "easeInOut" }}
          />

          {/* Subtitle / Mode Indicator */}
          {isSunrise ? (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.6 }}
              className={cn(
                "mt-4 flex items-center justify-center gap-2 text-sm tracking-widest uppercase font-bold",
                isLight ? "text-amber-700" : "text-amber-300 drop-shadow-sm"
              )}
            >
              <Sun size={15} className={cn("animate-spin", isLight ? "text-amber-600" : "text-amber-400")} style={{ animationDuration: '10s' }} />
              <span>Start of the Day</span>
              <Sparkles size={13} className={isLight ? "text-amber-600" : "text-amber-400"} />
            </motion.div>
          ) : (
            <p className={cn(
              "mt-4 text-sm tracking-widest uppercase font-medium",
              isLight ? "text-slate-500" : "text-slate-400"
            )}>
              Forge Your Legend
            </p>
          )}

          {/* Version Tag */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: isSunrise ? 1.2 : 1.0 }}
            className={cn(
              "mt-8 text-[10px] font-bold tracking-[0.2em] uppercase",
              isLight ? "text-slate-400" : "text-slate-600"
            )}
          >
            Version {APP_VERSION.replace('v', '')}
          </motion.div>
        </motion.div>
      </div>

    </motion.div>
  );
}

