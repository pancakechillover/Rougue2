import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { APP_VERSION } from '../version';
import { AppIcon } from './icons/AppIcon';

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2500); // 2.5 seconds splash
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div 
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
    >
      {/* Background mystical effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] bg-indigo-600/20 blur-[100px] rounded-full mix-blend-screen"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1.5, opacity: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center">
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

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="text-center"
        >
          <h1 className="text-3xl font-bold text-indigo-400 tracking-widest uppercase mb-2">
            Scholar's Dungeon
          </h1>
          <motion.div 
            className="h-0.5 bg-indigo-500/50 mx-auto"
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 1, delay: 0.8, ease: "easeInOut" }}
          />
          <p className="text-slate-400 mt-4 text-sm tracking-widest uppercase font-medium">
            Forge Your Legend
          </p>

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
