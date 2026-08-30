import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Sun, Sparkles } from 'lucide-react';
import { APP_VERSION } from '../version';
import { AppIcon } from './icons/AppIcon';

interface SplashScreenProps {
  onComplete: () => void;
  variant?: 'default' | 'sunrise';
}

export function SplashScreen({ onComplete, variant = 'default' }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2600); // 2.6 seconds splash
    return () => clearTimeout(timer);
  }, [onComplete]);

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
              className="absolute inset-0 bg-gradient-to-t from-amber-950/40 via-indigo-950/40 to-slate-950"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />

            {/* Rising Sun Radial Auroras */}
            <motion.div 
              className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[80vw] max-w-[650px] h-[80vw] max-h-[650px] bg-gradient-to-t from-orange-500/25 via-amber-500/20 to-transparent blur-[90px] rounded-full mix-blend-screen pointer-events-none"
              initial={{ y: 150, scale: 0.6, opacity: 0 }}
              animate={{ y: 0, scale: 1.2, opacity: 1 }}
              transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1] }}
            />

            {/* Rotating Sunbeams */}
            <motion.div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] pointer-events-none opacity-30"
              initial={{ rotate: 0, scale: 0.8, opacity: 0 }}
              animate={{ rotate: 45, scale: 1.1, opacity: 0.35 }}
              transition={{ duration: 3, ease: "easeOut" }}
            >
              <svg viewBox="0 0 200 200" className="w-full h-full text-amber-400/40">
                {[...Array(12)].map((_, i) => (
                  <line 
                    key={i} 
                    x1="100" 
                    y1="100" 
                    x2={100 + 90 * Math.cos((i * 30 * Math.PI) / 180)} 
                    y2={100 + 90 * Math.sin((i * 30 * Math.PI) / 180)} 
                    stroke="currentColor" 
                    strokeWidth="1.5" 
                    strokeDasharray="4 6" 
                  />
                ))}
              </svg>
            </motion.div>

            {/* The Glowing Rising Sun Disc behind Logo */}
            <motion.div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center"
              initial={{ y: 90, scale: 0.5, opacity: 0 }}
              animate={{ y: -38, scale: 1, opacity: 1 }}
              transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Sun Outer Glow */}
              <div className="w-40 h-40 rounded-full bg-gradient-to-t from-orange-500 via-amber-400 to-yellow-300 blur-2xl opacity-70 animate-pulse" />
              {/* Sun Core Disc */}
              <div className="absolute w-24 h-24 rounded-full bg-gradient-to-t from-amber-400 via-yellow-200 to-white shadow-[0_0_60px_rgba(251,191,36,0.9)] opacity-95" />
            </motion.div>

            {/* Dawn Horizon Arc */}
            <motion.div 
              className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent flex items-end justify-center pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2 }}
            >
              <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
            </motion.div>
          </>
        ) : (
          /* Default Mystical Twilight Aura */
          <motion.div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] bg-indigo-600/20 blur-[100px] rounded-full mix-blend-screen"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 1 }}
            transition={{ duration: 2, ease: "easeOut" }}
          />
        )}
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 flex flex-col items-center">
        {/* App Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 25 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: isSunrise ? 0.2 : 0, ease: "easeOut" }}
          className="relative"
        >
          <div className="mb-8 flex items-center justify-center relative">
            {isSunrise && (
              <motion.div 
                className="absolute -inset-4 bg-amber-400/20 blur-xl rounded-full mix-blend-screen"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1.2 }}
                transition={{ duration: 1.5, delay: 0.3 }}
              />
            )}
            <AppIcon 
              size={80} 
              className={isSunrise ? "text-amber-100 drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]" : "text-indigo-400"} 
            />
          </div>
        </motion.div>

        {/* App Title and Subtitles */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: isSunrise ? 0.5 : 0.4, ease: "easeOut" }}
          className="text-center"
        >
          <h1 className={`text-3xl font-bold tracking-widest uppercase mb-2 ${
            isSunrise ? "text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-200 to-yellow-300 drop-shadow-sm" : "text-indigo-400"
          }`}>
            Scholar's Dungeon
          </h1>

          {/* Animated Divider */}
          <motion.div 
            className={`h-0.5 mx-auto ${isSunrise ? "bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_8px_rgba(251,191,36,0.8)]" : "bg-indigo-500/50"}`}
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 1, delay: isSunrise ? 0.8 : 0.8, ease: "easeInOut" }}
          />

          {/* Subtitle / Mode Indicator */}
          {isSunrise ? (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.6 }}
              className="mt-4 flex items-center justify-center gap-2 text-amber-300 text-sm tracking-widest uppercase font-semibold drop-shadow-sm"
            >
              <Sun size={15} className="text-amber-400 animate-spin" style={{ animationDuration: '10s' }} />
              <span>Start of the Day</span>
              <Sparkles size={13} className="text-amber-400" />
            </motion.div>
          ) : (
            <p className="text-slate-400 mt-4 text-sm tracking-widest uppercase font-medium">
              Forge Your Legend
            </p>
          )}

          {/* Version Tag */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: isSunrise ? 1.3 : 1.2 }}
            className="mt-8 text-slate-600 text-[10px] font-bold tracking-[0.2em] uppercase"
          >
            Version {APP_VERSION.replace('v', '')}
          </motion.div>
        </motion.div>
      </div>

    </motion.div>
  );
}
