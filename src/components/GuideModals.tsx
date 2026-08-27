import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Bookmark, Compass, Network, LayoutDashboard, Sword, Timer as TimerIcon, ShoppingBag, Package, BarChart3, Scroll as ScrollIcon, Trophy, Sparkles, Shield, Rocket, Briefcase, BookOpen, Coins, Puzzle, Zap, Star, Scroll } from 'lucide-react';
import { HandBook, HandCoins, HandTarget, HandZap } from './icons/HandDrawnIcons';
import { createPortal } from 'react-dom';
import { playSound } from '../lib/sound';

interface GuideBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPage: number;
  soundEnabled?: boolean;
  soundVolume?: number;
  navigateToSettings: (section: 'general' | 'timer' | 'level' | 'merchant' | 'calculator' | 'sage' | 'cloud' | 'dev' | 'about', settingId?: string) => void;
  onTabChange: (tab: 'dashboard' | 'dungeons' | 'explore' | 'talents' | 'shop' | 'vault' | 'stats' | 'settings', subTab?: string) => void;
}

export const GuideBookModal: React.FC<GuideBookModalProps> = ({ 
  isOpen, 
  onClose, 
  initialPage,
  soundEnabled = true,
  soundVolume = 0.5,
  navigateToSettings,
  onTabChange
}) => {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 640 : false);
  const [pageIndex, setPageIndex] = useState(initialPage * 2);
  const [direction, setDirection] = useState(1);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDir, setFlipDir] = useState(1);
  const [oldPages, setOldPages] = useState<number[]>([]);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const minSwipeDistance = 50;

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setPageIndex(initialPage * 2 + (isMobile ? 1 : 0));
      setIsFlipping(false);
      playSound('pageTurn', soundVolume, soundEnabled);
    }
  }

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const goToChapter = (chapter: number) => {
    const target = chapter * 2 + (isMobile ? 1 : 0);
    if (target === pageIndex) return;
    setDirection(target > pageIndex ? 1 : -1);
    setPageIndex(target);
    playSound('pageTurn', soundVolume, soundEnabled);
  };

  const pages = [
    // Page 0: Transparent Left (Cover outside)
    (<div className="w-full h-full bg-transparent" />),

    // Page 1: Front Cover
    (
      <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-[var(--gb-cover)] relative z-10 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)] border-l flex-1 border-black/30 transition-colors duration-300">
        <div className="absolute inset-3 border-2 border-dashed border-[#8b6b4a]/60 pointer-events-none" />
        <svg width="0" height="0" className="absolute">
          <defs>
            <linearGradient id="goldGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#bfa256" />
              <stop offset="50%" stopColor="#f7e6a1" />
              <stop offset="100%" stopColor="#c79132" />
            </linearGradient>
          </defs>
        </svg>
        <Compass stroke="url(#goldGradient)" className="mb-8 w-20 h-20 sm:w-24 sm:h-24 drop-shadow-md" style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.4))" }} />
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black md:leading-normal font-serif uppercase tracking-widest mb-6 leading-snug drop-shadow-md bg-clip-text text-transparent bg-gradient-to-tr from-[#bfa256] via-[#f7e6a1] to-[#c79132]" style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.4))" }}>
          Adventure<br/>Guide
        </h1>
        <div className="w-24 h-1 bg-gradient-to-r from-transparent via-[#f7e6a1] to-transparent my-6 rounded-full opacity-60" />
        <p className="text-[#e8dac1]/70 text-sm sm:text-base font-serif uppercase tracking-widest font-bold">Auth. KARAKAN</p>
      </div>
    ),

    // Page 2: Inside cover (Left page) - Introduction
    (
      <div className="w-full h-full paper-texture p-4 sm:p-8 flex flex-col pb-12 sm:pb-16 relative shadow-[inset_-10px_0_20px_rgba(0,0,0,0.06)] transition-colors duration-300 overflow-y-auto hide-scrollbar">
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-[var(--gb-spine-l)] pointer-events-none" />
        
        <h2 className="text-2xl sm:text-3xl font-bold font-serif text-[var(--gb-title)] border-b-2 border-[var(--gb-border)] pb-2 sm:pb-4 mb-4 sm:mb-6 transition-colors duration-300">Welcome, Seeker</h2>
        
        <p className="text-[var(--gb-body)] text-sm md:text-base mb-2 sm:mb-4 leading-relaxed font-sans transition-colors duration-300">
          Welcome to the Scholar's Sanctum! This platform is crafted to help you track your progress, build unshakeable habits, and reward your daily achievements. 
        </p>
        <p className="text-[var(--gb-body)] text-xs sm:text-sm md:text-base mb-3 sm:mb-3 sm:mb-6 leading-relaxed font-sans transition-colors duration-300">
          As you traverse this journey, we hope you find joy in the little progressions and satisfaction in unlocking your full potential. Enjoy the adventure!
        </p>
        
        <div className="text-center mt-8 space-y-1 sm:space-y-2 opacity-80">
          <Compass className="w-8 h-8 mx-auto text-[var(--gb-label)] transition-colors duration-300" />
          <p className="font-serif italic text-[var(--gb-accent-text)] font-bold border-t border-[var(--gb-footer-border)] pt-2 inline-block transition-colors duration-300">Best Wishes</p>
        </div>

        <p className="text-center font-serif text-[var(--gb-label)] text-sm mt-auto pt-4 border-t border-[var(--gb-footer-border)] transition-colors duration-300">Page 1</p>
      </div>
    ),

    // Page 3: TOC (Right page)
    (
      <div className="w-full h-full paper-texture p-4 sm:p-8 flex flex-col pb-12 sm:pb-16 relative shadow-[inset_10px_0_20px_rgba(0,0,0,0.06)] transition-colors duration-300 overflow-y-auto hide-scrollbar">
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-[var(--gb-spine-r)] pointer-events-none" />
          <h2 className="text-2xl sm:text-3xl font-bold font-serif text-[var(--gb-title)] border-b-2 border-[var(--gb-border)] pb-2 sm:pb-4 mb-4 sm:mb-6 transition-colors duration-300">Table of Contents</h2>
        <div className="flex flex-col gap-2 sm:gap-4">
          <button onClick={() => goToChapter(2)} className="flex items-center gap-2 sm:gap-4 group w-full p-2 hover:bg-[var(--gb-toc-btn-hover)] rounded-xl transition-colors border border-transparent hover:border-[var(--gb-border)]">
            <div className="p-2 bg-sky-100 rounded-lg text-sky-600 group-hover:scale-110 transition-transform shadow-sm"><Compass className="w-6 h-6" /></div>
            <div className="flex-1 text-left">
              <span className="block font-bold text-[var(--gb-title)] text-xl font-serif">Sanctum Map</span>
              <span className="block text-sm text-[var(--gb-body)] font-sans">Navigate the Dungeon</span>
            </div>
            <span className="text-[var(--gb-label)] text-sm sm:text-base font-serif italic">Pg 3</span>
          </button>
          <button onClick={() => goToChapter(3)} className="flex items-center gap-2 sm:gap-4 group w-full p-2 hover:bg-[var(--gb-toc-btn-hover)] rounded-xl transition-colors border border-transparent hover:border-[var(--gb-border)]">
            <div className="p-2 bg-rose-100 rounded-lg text-rose-600 group-hover:scale-110 transition-transform shadow-sm"><Package className="w-6 h-6" /></div>
            <div className="flex-1 text-left">
              <span className="block font-bold text-[var(--gb-title)] text-xl font-serif">Sanctum Items</span>
              <span className="block text-sm text-[var(--gb-body)] font-sans">Resources & Consumables</span>
            </div>
            <span className="text-[var(--gb-label)] text-sm sm:text-base font-serif italic">Pg 5</span>
          </button>
          <button onClick={() => goToChapter(6)} className="flex items-center gap-2 sm:gap-4 group w-full p-2 hover:bg-[var(--gb-toc-btn-hover)] rounded-xl transition-colors border border-transparent hover:border-[var(--gb-border)]">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-600 group-hover:scale-110 transition-transform shadow-sm"><HandCoins className="w-6 h-6" /></div>
            <div className="flex-1 text-left">
              <span className="block font-bold text-[var(--gb-title)] text-xl font-serif">Gold Coins</span>
              <span className="block text-sm text-[var(--gb-body)] font-sans">Economy & Wealth</span>
            </div>
            <span className="text-[var(--gb-label)] text-sm sm:text-base font-serif italic">Pg 9</span>
          </button>
          <button onClick={() => goToChapter(4)} className="flex items-center gap-2 sm:gap-4 group w-full p-2 hover:bg-[var(--gb-toc-btn-hover)] rounded-xl transition-colors border border-transparent hover:border-[var(--gb-border)]">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600 group-hover:scale-110 transition-transform shadow-sm"><HandTarget className="w-6 h-6" /></div>
            <div className="flex-1 text-left">
              <span className="block font-bold text-[var(--gb-title)] text-xl font-serif">XP <span className="font-sans">&</span> Leveling</span>
              <span className="block text-sm text-[var(--gb-body)] font-sans">Growth & Progression</span>
            </div>
            <span className="text-[var(--gb-label)] text-sm sm:text-base font-serif italic">Pg 11</span>
          </button>
          <button onClick={() => goToChapter(5)} className="flex items-center gap-2 sm:gap-4 group w-full p-2 hover:bg-[var(--gb-toc-btn-hover)] rounded-xl transition-colors border border-transparent hover:border-[var(--gb-border)]">
            <div className="p-2 bg-[var(--gb-talent-bg)] rounded-lg text-[var(--gb-talent-color)] group-hover:scale-110 transition-transform shadow-sm"><Network className="w-6 h-6" /></div>
            <div className="flex-1 text-left">
              <span className="block font-bold text-[var(--gb-title)] text-xl font-serif">Talent System</span>
              <span className="block text-sm text-[var(--gb-body)] font-sans">Unlocking Potential</span>
            </div>
            <span className="text-[var(--gb-label)] text-sm sm:text-base font-serif italic">Pg 13</span>
          </button>
        </div>
        <p className="text-center font-serif text-[var(--gb-label)] text-sm mt-auto pt-4 border-t border-[var(--gb-footer-border)] transition-colors duration-300">Page 2</p>
      </div>
    ),

    // Page 4: Map to the Sanctum (Left Page)
    (
      <div className="w-full h-full paper-texture p-4 sm:p-8 flex flex-col pb-12 sm:pb-16 relative shadow-[inset_-10px_0_20px_rgba(0,0,0,0.06)] transition-colors duration-300 overflow-y-auto hide-scrollbar">
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-[var(--gb-spine-l)] pointer-events-none" />
        <div className="flex items-center gap-2 sm:gap-3 border-b-2 border-[var(--gb-border)] pb-2 sm:pb-4 mb-4 sm:mb-6 transition-colors duration-300">
          <Compass className="text-sky-600 w-7 h-7" />
          <h2 className="text-2xl sm:text-3xl font-bold font-serif text-[var(--gb-title)] transition-colors duration-300">Sanctum Map</h2>
        </div>
        <p className="text-[var(--gb-body)] text-xs sm:text-sm md:text-base mb-3 sm:mb-3 sm:mb-6 leading-relaxed font-sans transition-colors duration-300">
          The Scholar's Sanctum is a vast dungeon with many rooms. Familiarize yourself with these major halls to master your journey.
        </p>
        <div className="space-y-1 sm:space-y-2 sm:space-y-4">
          <button 
            onClick={() => { onClose(); onTabChange('dashboard'); }}
            className="w-full flex items-start gap-2 sm:gap-4 p-3 rounded-xl bg-[var(--gb-card)] hover:bg-[var(--gb-card-hover)] border border-[var(--gb-border)] transition-all text-left group"
          >
            <div className="p-2 bg-indigo-50/10 text-indigo-400 rounded-lg group-hover:scale-110 transition-transform">
              <LayoutDashboard size={18} />
            </div>
            <div>
              <strong className="text-[var(--gb-title)] block font-serif transition-colors duration-300">Sanctum</strong>
              <span className="text-xs text-[var(--gb-body)] font-sans transition-colors duration-300">View your overall progress, daily goals, and quick guides.</span>
            </div>
          </button>
          
          <button 
            onClick={() => { onClose(); onTabChange('dungeons'); }}
            className="w-full flex items-start gap-2 sm:gap-4 p-3 rounded-xl bg-[var(--gb-card)] hover:bg-[var(--gb-card-hover)] border border-[var(--gb-border)] transition-all text-left group"
          >
            <div className="p-2 bg-emerald-50/10 text-emerald-400 rounded-lg group-hover:scale-110 transition-transform">
              <Sword size={18} />
            </div>
            <div>
              <strong className="text-[var(--gb-title)] block font-serif transition-colors duration-300">Dungeon</strong>
              <span className="text-xs text-[var(--gb-body)] font-sans transition-colors duration-300">Embark on long-term goals and claim your hard-earned rewards.</span>
            </div>
          </button>
          <button 
            onClick={() => { onClose(); onTabChange('explore'); }}
            className="w-full flex items-start gap-2 sm:gap-4 p-3 rounded-xl bg-[var(--gb-card)] hover:bg-[var(--gb-card-hover)] border border-[var(--gb-border)] transition-all text-left group"
          >
            <div className="p-2 bg-rose-50/10 text-rose-400 rounded-lg group-hover:scale-110 transition-transform">
              <TimerIcon size={18} />
            </div>
            <div>
              <strong className="text-[var(--gb-title)] block font-serif transition-colors duration-300">Explore</strong>
              <span className="text-xs text-[var(--gb-body)] font-sans transition-colors duration-300">The heart of focus. Engage the timer to record your study sessions.</span>
            </div>
          </button>
        </div>
        <p className="text-center font-serif text-[var(--gb-label)] text-sm mt-auto pt-4 border-t border-[var(--gb-footer-border)] transition-colors duration-300">Page 3</p>
      </div>
    ),

    // Page 5: Map to the Sanctum (Right Page)
    (
      <div className="w-full h-full paper-texture p-4 sm:p-8 flex flex-col pb-12 sm:pb-16 relative shadow-[inset_10px_0_20px_rgba(0,0,0,0.06)] transition-colors duration-300 overflow-y-auto hide-scrollbar">
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-[var(--gb-spine-r)] pointer-events-none" />
        <div className="space-y-1 sm:space-y-2 sm:space-y-4 mt-4">
          <button 
            onClick={() => { onClose(); onTabChange('shop'); }}
            className="w-full flex items-start gap-2 sm:gap-4 p-3 rounded-xl bg-[var(--gb-card)] hover:bg-[var(--gb-card-hover)] border border-[var(--gb-border)] transition-all text-left group"
          >
            <div className="p-2 bg-amber-50/10 text-amber-400 rounded-lg group-hover:scale-110 transition-transform">
              <ShoppingBag size={18} />
            </div>
            <div>
              <strong className="text-[var(--gb-title)] block font-serif transition-colors duration-300">Merchant</strong>
              <span className="text-xs text-[var(--gb-body)] font-sans transition-colors duration-300">Spend your gold here on mysterious Gacha pools and rare items.</span>
            </div>
          </button>

          <button 
            onClick={() => { onClose(); onTabChange('vault'); }}
            className="w-full flex items-start gap-2 sm:gap-4 p-3 rounded-xl bg-[var(--gb-card)] hover:bg-[var(--gb-card-hover)] border border-[var(--gb-border)] transition-all text-left group"
          >
            <div className="p-2 bg-blue-50/10 text-blue-400 rounded-lg group-hover:scale-110 transition-transform">
              <Package size={18} />
            </div>
            <div>
              <strong className="text-[var(--gb-title)] block font-serif transition-colors duration-300">Vault</strong>
              <span className="text-xs text-[var(--gb-body)] font-sans transition-colors duration-300">Review your collection of treasures and track your reward history.</span>
            </div>
          </button>

          <button 
            onClick={() => { onClose(); onTabChange('stats'); }}
            className="w-full flex items-start gap-2 sm:gap-4 p-3 rounded-xl bg-[var(--gb-card)] hover:bg-[var(--gb-card-hover)] border border-[var(--gb-border)] transition-all text-left group"
          >
            <div className="p-2 bg-sky-50/10 text-sky-400 rounded-lg group-hover:scale-110 transition-transform">
              <BarChart3 size={18} />
            </div>
            <div>
              <strong className="text-[var(--gb-title)] block font-serif transition-colors duration-300">Record</strong>
              <span className="text-xs text-[var(--gb-body)] font-sans transition-colors duration-300">Analyze your performance statistics and long-term activity.</span>
            </div>
          </button>
        </div>

        <div className="mt-auto bg-[var(--gb-accent-bg)] p-4 rounded-xl border border-[var(--gb-accent-border)] transition-colors duration-300">
           <p className="text-xs text-[var(--gb-accent-text)] font-sans italic opacity-80">
             "Navigation Tip: You can jump to any section directly from the icons in this book. Go ahead, try it!"
           </p>
        </div>
        <p className="text-center font-serif text-[var(--gb-label)] text-sm mt-auto pt-4 border-t border-[var(--gb-footer-border)] transition-colors duration-300">Page 4</p>
      </div>
    ),


    // Page 6: Sanctum Items - Core 1 (Left Page)
    (
      <div className="w-full h-full paper-texture p-4 sm:p-8 flex flex-col pb-12 sm:pb-16 relative shadow-[inset_-10px_0_20px_rgba(0,0,0,0.06)] transition-colors duration-300 overflow-y-auto hide-scrollbar">
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-[var(--gb-spine-l)] pointer-events-none" />
        <div className="flex items-center gap-2 sm:gap-3 border-b-2 border-[var(--gb-border)] pb-3 sm:pb-4 mb-3 sm:mb-6 transition-colors duration-300">
          <Package className="text-rose-600 w-6 h-6 sm:w-7 sm:h-7" />
          <h2 className="text-2xl sm:text-2xl sm:text-3xl font-bold font-serif text-[var(--gb-title)] transition-colors duration-300">Sanctum Items</h2>
        </div>
        <p className="text-[var(--gb-body)] text-xs sm:text-sm md:text-base mb-4 sm:mb-3 sm:mb-6 leading-relaxed font-sans transition-colors duration-300">
          These essential resources and artifacts form the foundation of your journey within the Sanctum.
        </p>
        <div className="space-y-3 sm:space-y-1 sm:space-y-2 sm:space-y-4 text-[var(--gb-body)] text-xs sm:text-sm md:text-base font-sans mt-auto mb-auto transition-colors duration-300">
          <div className="flex gap-2 items-start">
            <span className="text-[var(--gb-label)] font-bold mt-0.5 sm:mt-1">-</span>
            <div>
              <strong className="text-amber-700 font-serif text-base sm:text-lg flex items-center gap-2 transition-colors duration-300"><Coins size={16} /> Gold Coins</strong>
              <p className="mt-1 leading-relaxed text-[var(--gb-body)] transition-colors duration-300">The primary currency. Earned through sessions, <button onClick={() => { onClose(); onTabChange('dungeons'); }} className="font-bold underline text-amber-700 decoration-amber-700/30 hover:text-amber-800 transition-colors">Dungeons</button>, and <button onClick={() => { onClose(); onTabChange('dungeons', 'quests'); }} className="font-bold underline text-amber-700 decoration-amber-700/30 hover:text-amber-800 transition-colors">Quests</button>. Used in the <button onClick={() => { onClose(); onTabChange('shop'); }} className="font-bold underline text-amber-700 decoration-amber-700/30 hover:text-amber-800 transition-colors">Merchant Outpost</button> for items and Gacha.</p>
            </div>
          </div>
          <div className="flex gap-2 items-start">
            <span className="text-[var(--gb-label)] font-bold mt-0.5 sm:mt-1">-</span>
            <div>
              <strong className="text-[var(--gb-xp-color)] font-serif text-base sm:text-lg flex items-center gap-2 transition-colors duration-300"><Sparkles size={16} /> XP (Experience)</strong>
              <p className="mt-1 leading-relaxed text-[var(--gb-body)] transition-colors duration-300">Represents your overall growth. Earn <span className="font-bold">XP</span> to level up, which unlocks rewards and <button onClick={() => { onClose(); onTabChange('talents'); }} className="font-bold underline text-[var(--gb-xp-color)] decoration-[var(--gb-xp-border)] hover:opacity-80 transition-colors">Talent Scrolls</button>.</p>
            </div>
          </div>
        </div>
        <p className="text-center font-serif text-[var(--gb-label)] text-sm mt-auto pt-4 border-t border-[var(--gb-footer-border)] transition-colors duration-300">Page 5</p>
      </div>
    ),

    // Page 7: Sanctum Items - Core 2 (Right Page)
    (
      <div className="w-full h-full paper-texture p-4 sm:p-8 flex flex-col pb-12 sm:pb-16 relative shadow-[inset_10px_0_20px_rgba(0,0,0,0.06)] transition-colors duration-300 overflow-y-auto hide-scrollbar">
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-[var(--gb-spine-r)] pointer-events-none" />
        
        <p className="text-[var(--gb-body)] text-xs sm:text-sm md:text-base mb-4 sm:mb-3 sm:mb-6 leading-relaxed font-sans mt-2 sm:mt-4 transition-colors duration-300">
          Resources dedicated to your skill development:
        </p>
        <div className="space-y-3 sm:space-y-1 sm:space-y-2 sm:space-y-4 text-[var(--gb-body)] text-xs sm:text-sm md:text-base font-sans mb-auto transition-colors duration-300">
          <div className="flex gap-2 items-start">
            <span className="text-[var(--gb-label)] font-bold mt-0.5 sm:mt-1">-</span>
            <div>
              <strong className="text-indigo-600 font-serif text-base sm:text-lg flex items-center gap-2 transition-colors duration-300"><Scroll size={16} /> Talent Scrolls</strong>
              <p className="mt-1 leading-relaxed text-[var(--gb-body)] transition-colors duration-300">Rare points used exclusively to unlock powerful passive traits in the <button onClick={() => { onClose(); onTabChange('talents'); }} className="font-bold underline text-indigo-600 decoration-indigo-600/30 hover:text-indigo-700 transition-colors">Talent Tree</button>.</p>
            </div>
          </div>
          <div className="flex gap-2 items-start">
            <span className="text-[var(--gb-label)] font-bold mt-0.5 sm:mt-1">-</span>
            <div>
              <strong className="text-indigo-400 font-serif text-base sm:text-lg flex items-center gap-2 transition-colors duration-300"><Puzzle size={16} /> Talent Shards</strong>
              <p className="mt-1 leading-relaxed text-[var(--gb-body)] transition-colors duration-300">Fragments of potential. Collect 3 shards to automatically forge 1 full <span className="font-bold">Talent Scroll</span>. Sometimes they drop together with items.</p>
            </div>
          </div>
        </div>
        <p className="text-center font-serif text-[var(--gb-label)] text-sm mt-auto pt-4 border-t border-[var(--gb-footer-border)] transition-colors duration-300">Page 6</p>
      </div>
    ),

    // Page 8: Sanctum Items - Advanced 1 (Left Page)
    (
      <div className="w-full h-full paper-texture p-4 sm:p-8 flex flex-col pb-12 sm:pb-16 relative shadow-[inset_-10px_0_20px_rgba(0,0,0,0.06)] transition-colors duration-300 overflow-y-auto hide-scrollbar">
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-[var(--gb-spine-l)] pointer-events-none" />
        <p className="text-[var(--gb-body)] text-xs sm:text-sm md:text-base mb-4 sm:mb-3 sm:mb-6 leading-relaxed font-sans mt-2 sm:mt-4 transition-colors duration-300">
          Powerful artifacts that can significantly alter your progress. Obtained mainly from the <button onClick={() => { onClose(); onTabChange('shop'); }} className="font-bold underline text-[var(--gb-label)] decoration-[var(--gb-border)] hover:text-[var(--gb-body)] transition-colors">Merchant's shop</button> or Dungeon rewards:
        </p>
        <div className="space-y-3 sm:space-y-1 sm:space-y-2 sm:space-y-4 text-[var(--gb-body)] text-xs sm:text-sm md:text-base font-sans mt-auto mb-auto transition-colors duration-300">
          <div className="flex gap-2 items-start bg-[var(--gb-accent-bg)] p-2 sm:p-3 rounded-xl border border-[var(--gb-accent-border)]">
            <span className="text-[var(--gb-label)] font-bold mt-0.5 sm:mt-1">-</span>
            <div>
              <strong className="text-rose-400 font-serif text-base flex items-center gap-2 transition-colors duration-300"><Shield size={16} /> Death Defying Medal</strong>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-[var(--gb-body)] transition-colors duration-300">Automatically consumed to prevent a <button onClick={() => { onClose(); onTabChange('dungeons'); }} className="font-bold underline text-rose-400 decoration-rose-400/30 hover:text-rose-500 transition-colors">Dungeon Goal</button> from failing if you miss a deadline, preserving your progress.</p>
            </div>
          </div>
          <div className="flex gap-2 items-start bg-[var(--gb-accent-bg)] p-2 sm:p-3 rounded-xl border border-[var(--gb-accent-border)]">
            <span className="text-[var(--gb-label)] font-bold mt-0.5 sm:mt-1">-</span>
            <div>
              <strong className="text-sky-400 font-serif text-base flex items-center gap-2 transition-colors duration-300"><Rocket size={16} /> Double XP Card</strong>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-[var(--gb-body)] transition-colors duration-300">When activated in your <button onClick={() => { onClose(); onTabChange('vault'); }} className="font-bold underline text-sky-400 decoration-sky-400/30 hover:text-sky-500 transition-colors">Vault</button>, temporarily doubles all <span className="font-bold">Experience Points</span> earned from sessions and quests.</p>
            </div>
          </div>
        </div>
        <p className="text-center font-serif text-[var(--gb-label)] text-sm mt-auto pt-4 border-t border-[var(--gb-footer-border)] transition-colors duration-300">Page 7</p>
      </div>
    ),

    // Page 9: Sanctum Items - Advanced 2 (Right Page)
    (
      <div className="w-full h-full paper-texture p-4 sm:p-8 flex flex-col pb-12 sm:pb-16 relative shadow-[inset_10px_0_20px_rgba(0,0,0,0.06)] transition-colors duration-300 overflow-y-auto hide-scrollbar">
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-[var(--gb-spine-r)] pointer-events-none" />
        
        <p className="text-[var(--gb-body)] text-xs sm:text-sm md:text-base mb-4 sm:mb-3 sm:mb-6 leading-relaxed font-sans mt-2 sm:mt-4 transition-colors duration-300">
          More artifacts you can discover:
        </p>
        <div className="space-y-3 sm:space-y-1 sm:space-y-2 sm:space-y-4 text-[var(--gb-body)] text-xs sm:text-sm md:text-base font-sans mb-auto transition-colors duration-300">
          <div className="flex gap-2 items-start bg-[var(--gb-accent-bg)] p-2 sm:p-3 rounded-xl border border-[var(--gb-accent-border)]">
            <span className="text-[var(--gb-label)] font-bold mt-0.5 sm:mt-1">-</span>
            <div>
              <strong className="text-[var(--gb-gold-color)] font-serif flex text-base items-center gap-2 transition-colors duration-300"><Briefcase size={16} /> Double Gold Card</strong>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-[var(--gb-body)] transition-colors duration-300">When activated in your <button onClick={() => { onClose(); onTabChange('vault'); }} className="font-bold underline text-[var(--gb-gold-color)] decoration-[var(--gb-gold-border)] hover:opacity-80 transition-colors">Vault</button>, temporarily doubles all <span className="font-bold">Gold Coins</span> earned, accelerating your wealth.</p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--gb-accent-bg)] p-3 sm:p-4 rounded-xl border border-[var(--gb-accent-border)] shadow-inner mb-4 transition-colors duration-300">
           <h3 className="font-bold text-[var(--gb-accent-text)] mb-1 sm:mb-2 uppercase tracking-wider font-serif text-xs sm:text-sm transition-colors duration-300">Pro Tip: Item Usage</h3>
           <p className="text-xs sm:text-sm text-[var(--gb-body)] leading-relaxed font-sans transition-colors duration-300">
             Visit the Vault and click "Use Item" on consumable cards to activate their effects. 
             They usually expire at the end of the day.
           </p>
        </div>
        <p className="text-center font-serif text-[var(--gb-label)] text-sm mt-auto pt-4 border-t border-[var(--gb-footer-border)] transition-colors duration-300">Page 8</p>
      </div>
    ),

    // Page 10: Coins (Left Page)
    (
      <div className="w-full h-full paper-texture p-4 sm:p-8 flex flex-col pb-12 sm:pb-16 relative shadow-[inset_-10px_0_20px_rgba(0,0,0,0.06)] transition-colors duration-300 overflow-y-auto hide-scrollbar">
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-[var(--gb-spine-l)] pointer-events-none" />
        <div className="flex items-center gap-2 sm:gap-3 border-b-2 border-[var(--gb-border)] pb-2 sm:pb-4 mb-4 sm:mb-6 transition-colors duration-300">
          <HandCoins className="text-[var(--gb-gold-color)] w-7 h-7" />
          <h2 className="text-2xl sm:text-3xl font-bold font-serif text-[var(--gb-title)] transition-colors duration-300">Gold Coins</h2>
        </div>
        <p className="text-[var(--gb-body)] text-xs sm:text-sm md:text-base mb-3 sm:mb-3 sm:mb-6 leading-relaxed font-sans transition-colors duration-300">
          Gold is the primary currency within the Sanctum. It is used to purchase items from the <button onClick={() => { onClose(); onTabChange('shop'); }} className="font-bold underline text-[var(--gb-gold-color)] decoration-[var(--gb-gold-border)] hover:opacity-80 transition-colors">Merchant's Outpost</button> and roll the Gacha.
        </p>
        <div className="bg-[var(--gb-accent-bg)] p-3 sm:p-5 rounded-xl border border-[var(--gb-accent-border)] transition-colors duration-300">
          <h3 className="font-bold text-[var(--gb-title)] mb-2 sm:mb-3 uppercase tracking-wider font-serif text-lg transition-colors duration-300">How to Acquire</h3>
          <ul className="space-y-1 sm:space-y-2 text-[var(--gb-body)] text-sm md:text-base font-sans transition-colors duration-300">
            <li className="flex gap-2 items-start"><span className="text-[var(--gb-gold-color)] mt-[2px] shrink-0">❖</span> <span>Complete sessions using the <button onClick={() => { onClose(); onTabChange('explore'); }} className="font-bold underline text-[var(--gb-gold-color)] decoration-[var(--gb-gold-border)] hover:opacity-80">Timer</button></span></li>
            <li className="flex gap-2 items-start"><span className="text-[var(--gb-gold-color)] mt-[2px] shrink-0">❖</span> <span>Clear rooms in <button onClick={() => { onClose(); onTabChange('dungeons'); }} className="font-bold underline text-[var(--gb-gold-color)] decoration-[var(--gb-gold-border)] hover:opacity-80">Dungeons</button></span></li>
            <li className="flex gap-2 items-start">
              <span className="text-[var(--gb-gold-color)] mt-[2px] shrink-0">❖</span> 
              <span>Complete <button onClick={() => { onClose(); onTabChange('dungeons', 'quests'); }} className="font-bold underline text-[var(--gb-gold-color)] decoration-[var(--gb-gold-border)] hover:opacity-80">Quests</button> & <button onClick={() => { onClose(); onTabChange('dungeons', 'achievements'); }} className="font-bold underline text-[var(--gb-gold-color)] decoration-[var(--gb-gold-border)] hover:opacity-80">Achievements</button></span>
            </li>
          </ul>
        </div>
        <p className="text-center font-serif text-[var(--gb-label)] text-sm mt-auto pt-4 border-t border-[var(--gb-footer-border)] transition-colors duration-300">Page 9</p>
      </div>
    ),

    // Page 11: Coins Pro tips (Right Page)
    (
      <div className="w-full h-full paper-texture p-4 sm:p-8 flex flex-col pb-12 sm:pb-16 relative shadow-[inset_10px_0_20px_rgba(0,0,0,0.06)] transition-colors duration-300 overflow-y-auto hide-scrollbar">
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-[var(--gb-spine-r)] pointer-events-none" />
        <div className="bg-[var(--gb-accent-bg)] p-3 sm:p-5 rounded-xl border border-[var(--gb-accent-border)] shadow-inner mb-auto mt-4 transition-colors duration-300">
          <h3 className="font-bold text-[var(--gb-gold-color)] mb-2 sm:mb-3 uppercase tracking-wider font-serif text-lg border-b border-[var(--gb-border)] pb-2 transition-colors duration-300">Pro Tip: Customization</h3>
          <p className="text-sm md:text-base text-[var(--gb-body)] leading-relaxed mb-4 font-sans transition-colors duration-300">
            You can adjust how much Gold you earn and customize level-up gifts!
          </p>
          <div className="flex flex-col gap-2 sm:gap-3">
            <button onClick={() => { onClose(); navigateToSettings('timer', 'setting-time-based'); }} className="text-left w-full p-2 sm:p-3 rounded-lg bg-[var(--gb-gold-bg)] hover:opacity-90 border border-[var(--gb-gold-border)] text-[var(--gb-gold-color)] text-sm md:text-base font-serif font-bold transition-all shadow-sm">
              Go to Settings &gt; Timer<br/><span className="font-normal font-sans text-xs sm:text-sm opacity-80 mt-1 block">Adjust base Gold rates and multipliers.</span>
            </button>
            <button onClick={() => { onClose(); navigateToSettings('level', 'setting-milestones'); }} className="text-left w-full p-2 sm:p-3 rounded-lg bg-[var(--gb-gold-bg)] hover:opacity-90 border border-[var(--gb-gold-border)] text-[var(--gb-gold-color)] text-sm md:text-base font-serif font-bold transition-all shadow-sm">
              Go to Settings &gt; Level Rewards<br/><span className="font-normal font-sans text-xs sm:text-sm opacity-80 mt-1 block">Add or modify Gold gifts upon leveling up.</span>
            </button>
          </div>
        </div>
        <p className="text-center font-serif text-[var(--gb-label)] text-sm mt-auto pt-4 border-t border-[var(--gb-footer-border)] transition-colors duration-300">Page 10</p>
      </div>
    ),

    // Page 10: XP (Left Page)
    (
      <div className="w-full h-full paper-texture p-4 sm:p-8 flex flex-col pb-12 sm:pb-16 relative shadow-[inset_-10px_0_20px_rgba(0,0,0,0.06)] transition-colors duration-300 overflow-y-auto hide-scrollbar">
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-[var(--gb-spine-l)] pointer-events-none" />
        <div className="flex items-center gap-2 sm:gap-3 border-b-2 border-[var(--gb-border)] pb-2 sm:pb-4 mb-4 sm:mb-6 transition-colors duration-300">
          <HandTarget className="text-[var(--gb-xp-color)] w-7 h-7" />
          <h2 className="text-2xl sm:text-3xl font-bold font-serif text-[var(--gb-title)] transition-colors duration-300">XP <span className="font-sans">&</span> Leveling</h2>
        </div>
        <p className="text-[var(--gb-body)] text-xs sm:text-sm md:text-base mb-3 sm:mb-3 sm:mb-6 leading-relaxed font-sans transition-colors duration-300">
          Gain Experience Points (XP) To level up. Leveling up can reward you with items, <button onClick={() => { onClose(); onTabChange('talents'); }} className="font-bold underline text-[var(--gb-xp-color)] decoration-[var(--gb-xp-border)] hover:opacity-80 transition-colors">Talent Scrolls</button>, or Gold.
        </p>
        <div className="bg-[var(--gb-accent-bg)] p-3 sm:p-5 rounded-xl border border-[var(--gb-accent-border)] transition-colors duration-300">
          <h3 className="font-bold text-[var(--gb-title)] mb-2 sm:mb-3 uppercase tracking-wider font-serif text-lg transition-colors duration-300">How to Acquire</h3>
          <ul className="space-y-1 sm:space-y-2 text-[var(--gb-body)] text-sm md:text-base font-sans transition-colors duration-300">
            <li className="flex gap-2 items-start"><span className="text-[var(--gb-xp-color)] mt-[2px] shrink-0">❖</span> <span>Complete focus blocks via the <button onClick={() => { onClose(); onTabChange('explore'); }} className="font-bold underline text-[var(--gb-xp-color)] decoration-[var(--gb-xp-border)] hover:opacity-80">Timer</button></span></li>
            <li className="flex gap-2 items-start"><span className="text-[var(--gb-xp-color)] mt-[2px] shrink-0">❖</span> <span>Slay monsters in <button onClick={() => { onClose(); onTabChange('dungeons'); }} className="font-bold underline text-[var(--gb-xp-color)] decoration-[var(--gb-xp-border)] hover:opacity-80">Dungeons</button></span></li>
            <li className="flex gap-2 items-start">
              <span className="text-[var(--gb-xp-color)] mt-[2px] shrink-0">❖</span>
              <span>Claim <button onClick={() => { onClose(); onTabChange('dungeons', 'quests'); }} className="font-bold underline text-[var(--gb-xp-color)] decoration-[var(--gb-xp-border)] hover:opacity-80">Quests</button> & <button onClick={() => { onClose(); onTabChange('dungeons', 'achievements'); }} className="font-bold underline text-[var(--gb-xp-color)] decoration-[var(--gb-xp-border)] hover:opacity-80">Achievements</button></span>
            </li>
          </ul>
        </div>
        <p className="text-center font-serif text-[var(--gb-label)] text-sm mt-auto pt-4 border-t border-[var(--gb-footer-border)] transition-colors duration-300">Page 11</p>
      </div>
    ),

    // Page 11: XP Pro tips (Right Page)
    (
      <div className="w-full h-full paper-texture p-4 sm:p-8 flex flex-col pb-12 sm:pb-16 relative shadow-[inset_10px_0_20px_rgba(0,0,0,0.06)] transition-colors duration-300 overflow-y-auto hide-scrollbar">
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-[var(--gb-spine-r)] pointer-events-none" />
        <div className="bg-[var(--gb-accent-bg)] p-3 sm:p-5 rounded-xl border border-[var(--gb-accent-border)] shadow-inner mb-auto mt-4 transition-colors duration-300">
          <h3 className="font-bold text-[var(--gb-xp-color)] mb-2 sm:mb-3 uppercase tracking-wider font-serif text-lg border-b border-[var(--gb-border)] pb-2 transition-colors duration-300">Pro Tip: Customization</h3>
          <p className="text-sm md:text-base text-[var(--gb-body)] leading-relaxed mb-4 font-sans transition-colors duration-300">
            Configure your level-up rewards to match your progression style!
          </p>
          <div className="flex flex-col gap-2 sm:gap-3">
            <button onClick={() => { onClose(); navigateToSettings('timer', 'setting-time-based'); }} className="text-left w-full p-2 sm:p-3 rounded-lg bg-[var(--gb-xp-bg)] hover:opacity-90 border border-[var(--gb-xp-border)] text-[var(--gb-xp-color)] text-sm md:text-base font-serif font-bold transition-all shadow-sm">
              Go to Settings &gt; Timer<br/><span className="font-normal font-sans text-xs sm:text-sm opacity-80 mt-1 block">Adjust base XP rates and formula.</span>
            </button>
            <button onClick={() => { onClose(); navigateToSettings('level', 'setting-milestones'); }} className="text-left w-full p-2 sm:p-3 rounded-lg bg-[var(--gb-xp-bg)] hover:opacity-90 border border-[var(--gb-xp-border)] text-[var(--gb-xp-color)] text-sm md:text-base font-serif font-bold transition-all shadow-sm">
              Go to Settings &gt; Level Rewards<br/><span className="font-normal font-sans text-xs sm:text-sm opacity-80 mt-1 block">Add/remove level-up gifts (e.g., loot).</span>
            </button>
          </div>
        </div>
        <p className="text-center font-serif text-[var(--gb-label)] text-sm mt-auto pt-4 border-t border-[var(--gb-footer-border)] transition-colors duration-300">Page 12</p>
      </div>
    ),

    // Page 12: Talents (Left Page)
    (
      <div className="w-full h-full paper-texture p-4 sm:p-8 flex flex-col pb-12 sm:pb-16 relative shadow-[inset_-10px_0_20px_rgba(0,0,0,0.06)] transition-colors duration-300 overflow-y-auto hide-scrollbar">
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-[var(--gb-spine-l)] pointer-events-none" />
        <div className="flex items-center gap-2 sm:gap-3 border-b-2 border-[var(--gb-border)] pb-2 sm:pb-4 mb-4 sm:mb-6 transition-colors duration-300">
          <Network className="text-[var(--gb-talent-color)] w-7 h-7" />
          <h2 className="text-2xl sm:text-3xl font-bold font-serif text-[var(--gb-title)] transition-colors duration-300">Talent System</h2>
        </div>
        <p className="text-[var(--gb-body)] text-xs sm:text-sm md:text-base mb-3 sm:mb-3 sm:mb-6 leading-relaxed font-sans transition-colors duration-300">
          The <button onClick={() => { onClose(); onTabChange('talents'); }} className="font-bold underline text-[var(--gb-talent-color)] decoration-[var(--gb-talent-color)]/30 hover:opacity-80 transition-colors">Talent Tree</button> allows you to unlock passive bonuses. You need <strong className="font-serif">Talent Scrolls</strong> to unlock nodes.
        </p>
        <div className="bg-[var(--gb-accent-bg)] p-3 sm:p-5 rounded-xl border border-[var(--gb-accent-border)] transition-colors duration-300">
          <h3 className="font-bold text-[var(--gb-title)] mb-2 sm:mb-3 uppercase tracking-wider font-serif text-lg transition-colors duration-300">Acquiring Talent Scrolls</h3>
          <ul className="space-y-3 text-[var(--gb-body)] text-sm md:text-base font-sans transition-colors duration-300">
            <li className="flex gap-2 items-start">
              <span className="text-[var(--gb-talent-color)]">❖</span>
              <div>
                <strong className="text-[var(--gb-talent-color)] block mb-1 font-serif transition-colors duration-300">Leveling Up</strong>
                Points are granted at specific level milestones.
              </div>
            </li>
            <li className="flex gap-2 items-start">
              <span className="text-[var(--gb-talent-color)]">❖</span>
              <div>
                <strong className="text-[var(--gb-talent-color)] block mb-1 font-serif transition-colors duration-300">Finding Shards</strong>
                Shards are rare drops in <button onClick={() => { onClose(); onTabChange('dungeons'); }} className="font-bold underline text-[var(--gb-talent-color)] decoration-[var(--gb-talent-color)]/30 hover:opacity-80 transition-colors">Dungeons</button> or won from the <button onClick={() => { onClose(); onTabChange('shop'); }} className="font-bold underline text-[var(--gb-talent-color)] decoration-[var(--gb-talent-color)]/30 hover:opacity-80 transition-colors">Merchant</button>.
              </div>
            </li>
          </ul>
        </div>
        <p className="text-center font-serif text-[var(--gb-label)] text-sm mt-auto pt-4 border-t border-[var(--gb-footer-border)] transition-colors duration-300">Page 13</p>
      </div>
    ),

    // Page 13: Talents Pro tips (Right Page)
    (
      <div className="w-full h-full paper-texture p-4 sm:p-8 flex flex-col pb-12 sm:pb-16 relative shadow-[inset_10px_0_20px_rgba(0,0,0,0.06)] transition-colors duration-300 overflow-y-auto hide-scrollbar">
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-[var(--gb-spine-r)] pointer-events-none" />
        <div className="bg-[var(--gb-accent-bg)] p-3 sm:p-5 rounded-xl border border-[var(--gb-accent-border)] shadow-inner mb-auto mt-4 transition-colors duration-300">
          <h3 className="font-bold text-[var(--gb-title)] mb-2 sm:mb-3 uppercase tracking-wider font-serif text-lg border-b border-[var(--gb-border)] pb-2 transition-colors duration-300">Pro Tip: Customization</h3>
          <p className="text-sm md:text-base text-[var(--gb-body)] leading-relaxed mb-4 font-sans transition-colors duration-300">
            Want more Talent Scrolls? You can set them as rewards for leveling up!
          </p>
          <div className="flex flex-col gap-2 sm:gap-3">
            <button onClick={() => { onClose(); navigateToSettings('level', 'setting-milestones'); }} className="text-left w-full p-2 sm:p-3 rounded-lg bg-[var(--gb-talent-bg)] hover:opacity-80 border border-[var(--gb-talent-color)]/30 text-[var(--gb-talent-color)] text-sm md:text-base font-serif font-bold transition-all shadow-sm">
              Go to Settings &gt; Level Rewards<br/><span className="font-normal font-sans text-xs sm:text-sm opacity-80 mt-1 block">Add Talent Scrolls or Shards as level-up gifts.</span>
            </button>
          </div>
        </div>
        <p className="text-center font-serif text-[var(--gb-label)] text-sm mt-auto pt-4 border-t border-[var(--gb-footer-border)] transition-colors duration-300">Page 14</p>
      </div>
    ),

    // Page 14: Back Cover (Left Page)
    (
      <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-[var(--gb-cover-bg)] relative z-10 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)] border-r flex-1 border-black/30 transition-colors duration-300">
        <div className="absolute inset-3 border-2 border-dashed border-[var(--gb-cover-border)] pointer-events-none" />
        <Compass className="text-[var(--gb-cover-accent)] mb-6 w-16 h-16 drop-shadow-lg" />
        <div className="w-16 h-[2px] bg-gradient-to-r from-transparent via-[var(--gb-cover-accent-fade)] to-transparent my-4 rounded-full" />
        <p className="text-[var(--gb-cover-sub)] text-sm font-serif uppercase tracking-widest font-bold">Scholar's Sanctum</p>
      </div>
    ),

    // Page 15: Transparent Right Page (Outside Back Cover)
    (<div className="w-full h-full bg-transparent" />)
  ];

  const totalPages = pages.length;

  const nextPage = () => {
    if (isFlipping) return;
    const maxIndex = isMobile ? totalPages - 2 : totalPages - 2; // bound both to 12
    if (pageIndex >= maxIndex) {
      onClose();
    } else {
      playSound('pageTurn', soundVolume, soundEnabled);
      setOldPages(isMobile ? [pageIndex] : [pageIndex, pageIndex + 1]);
      setFlipDir(1);
      setPageIndex(p => p + (isMobile ? 1 : 2));
      setIsFlipping(true);
      setTimeout(() => setIsFlipping(false), 500);
    }
  };

  const prevPage = () => {
    if (isFlipping) return;
    if (pageIndex <= (isMobile ? 1 : 0)) {
      onClose();
    } else {
      playSound('pageTurn', soundVolume, soundEnabled);
      setOldPages(isMobile ? [pageIndex] : [pageIndex, pageIndex + 1]);
      setFlipDir(-1);
      setPageIndex(p => p - (isMobile ? 1 : 2));
      setIsFlipping(true);
      setTimeout(() => setIsFlipping(false), 500);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      nextPage();
    }
    if (isRightSwipe) {
      prevPage();
    }
  };

  const renderNavButtons = () => (
    <>
      <button 
        onClick={prevPage}
        className={`absolute bottom-4 left-6 z-50 text-[var(--gb-label)] hover:text-[var(--gb-body)] hover:scale-110 flex items-center gap-1 font-serif text-sm font-bold transition-all px-2 py-1 bg-[var(--gb-accent-bg)] rounded-lg backdrop-blur-sm shadow-sm border border-[var(--gb-border)] ${(!isMobile && pageIndex === 0) ? 'hidden' : ''}`}
      >
        <ChevronLeft size={20} /> <span className="hidden sm:inline">Prev</span>
      </button>
      <button 
        onClick={nextPage}
        className={`absolute bottom-4 right-6 z-50 text-[var(--gb-label)] hover:text-[var(--gb-body)] hover:scale-110 flex items-center gap-1 font-serif text-sm font-bold transition-all px-2 py-1 bg-[var(--gb-accent-bg)] rounded-lg backdrop-blur-sm shadow-sm border border-[var(--gb-border)] ${(!isMobile && pageIndex >= 16) ? 'hidden' : ''}`}
      >
        <span className="hidden sm:inline">Next</span> <ChevronRight size={20} />
      </button>
    </>
  );

  const getCloseButtonClass = () => {
    const base = "absolute w-10 h-10 bg-slate-800 text-slate-300 hover:text-white rounded-full flex items-center justify-center shadow-xl hover:bg-rose-500 transition-colors border-2 border-[#3a2e22] z-[10000]";
    if (isMobile) {
      return `${base} top-3 right-3`;
    }
    if (pageIndex === 0) {
      return `${base} top-5 right-5`;
    }
    if (pageIndex >= 16) {
      return `${base} top-5 right-[calc(50%+1.5rem)]`;
    }
    return `${base} top-5 right-5`;
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center pt-14 pb-4 pl-4 pr-16 sm:p-4">
      {/* Container */}
      <div className={`relative w-full h-[85vh] max-w-[calc(85vh/1.414)] sm:max-w-[calc(85vh*1.414)] mx-auto transition-transform duration-500 ease-in-out ${(!isMobile && pageIndex === 0) ? '-translate-x-1/4' : (!isMobile && pageIndex >= 16) ? 'translate-x-1/4' : 'translate-x-0'}`}>
        
        {/* Close button top right (Anchored to the book pages to move dynamically) */}
        <button 
          onClick={onClose}
          className={getCloseButtonClass()}
        >
          <X className="w-5 h-5" />
        </button>
        
        {/* Book Background base layer (3D Split) */}
        <div className="absolute inset-0 pointer-events-none z-0" style={{ perspective: 1500 }}>
          {/* Left Base */}
          <div 
            className={`absolute top-0 bottom-0 left-0 w-1/2 bg-[var(--gb-cover-bg)] rounded-l-xl border-y-2 sm:border-y-4 border-l-2 sm:border-l-4 border-[var(--gb-cover-border)] transform origin-right transition-all duration-500 ease-in-out ${isMobile ? 'hidden' : ''}`}
            style={{ 
              boxShadow: '-25px 25px 50px -12px rgba(0, 0, 0, 0.7), inset 0 0 20px rgba(0,0,0,0.5)',
              transform: pageIndex === 0 ? 'rotateY(180deg)' : 'rotateY(0deg)',
              backfaceVisibility: 'hidden'
            }} 
          />
          {/* Right Base */}
          <div 
            className={`absolute top-0 bottom-0 right-0 w-1/2 bg-[var(--gb-cover-bg)] rounded-r-xl border-y-2 sm:border-y-4 border-r-2 sm:border-r-4 border-[var(--gb-cover-border)] transform origin-left transition-all duration-500 ease-in-out ${isMobile ? 'hidden' : ''}`}
            style={{ 
              boxShadow: '25px 25px 50px -12px rgba(0, 0, 0, 0.7), inset 0 0 20px rgba(0,0,0,0.5)',
              transform: pageIndex >= 16 ? 'rotateY(-180deg)' : 'rotateY(0deg)',
              backfaceVisibility: 'hidden'
            }} 
          />
          {/* Mobile Base (Unified) */}
          <div 
            className={`absolute top-0 bottom-0 left-0 right-0 bg-[#5c4033] rounded-xl border-2 sm:border-4 border-[#3a2e22] ${!isMobile ? 'hidden' : ''}`}
            style={{ 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), inset 0 0 20px rgba(0,0,0,0.5)',
            }} 
          />
        </div>

        {/* The Pages Container wrapper */}
        <div className="absolute inset-0 p-1 sm:p-2 flex flex-col z-10 pointer-events-none">
            {/* The Pages Container */}
            <div className="relative flex-1 flex rounded overflow-hidden pointer-events-auto" 
                 style={{ perspective: 1500 }}
                 onTouchStart={handleTouchStart}
                 onTouchMove={handleTouchMove}
                 onTouchEnd={handleTouchEnd}
            >
                 
                {/* Center Spine Crease */}
                {!isMobile && (
                  <div className={`transition-opacity duration-300 ${(pageIndex === 0 || pageIndex >= 16) ? 'opacity-0' : 'opacity-100'}`}>
                    <div className="absolute inset-y-0 left-1/2 w-12 -translate-x-1/2 bg-gradient-to-r from-transparent via-black/20 to-transparent z-40 pointer-events-none" />
                    <div className="absolute inset-y-0 left-1/2 w-[1px] bg-black/30 z-40 pointer-events-none" />
                  </div>
                )}
                
                {renderNavButtons()}
                
                {/* Static Background Pages */}
                <div className="w-full h-full flex flex-row absolute inset-0">
                  {isMobile ? (
                    <div className="flex-1 w-full flex flex-col relative overflow-hidden paper-texture">
                      {isFlipping ? pages[flipDir === 1 ? pageIndex : oldPages[0]] : pages[pageIndex]}
                    </div>
                  ) : (
                    <>
                      <div className={`flex-1 w-1/2 flex flex-col relative overflow-hidden transition-colors ${pageIndex === 0 ? 'border-transparent' : 'border-r border-[#d8c5a5]/50'}`}>
                          {isFlipping && flipDir === 1 ? pages[oldPages[0]] : pages[pageIndex]}
                      </div>
                      <div className={`flex-1 w-1/2 flex flex-col relative overflow-hidden transition-colors ${pageIndex >= 16 ? 'border-transparent' : 'border-l border-white/50'}`}>
                          {isFlipping && flipDir === -1 ? pages[oldPages[1]] : (pages[pageIndex + 1] || null)}
                      </div>
                    </>
                  )}
                </div>

                {/* The Flipping Layer */}
                <AnimatePresence>
                  {isFlipping && !isMobile && flipDir === 1 && (
                    <motion.div
                      className="absolute top-0 right-0 w-1/2 h-full z-30 pointer-events-none"
                      style={{ transformStyle: 'preserve-3d', originX: 0 }}
                      initial={{ rotateY: 0 }}
                      animate={{ rotateY: -180 }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                    >
                      {/* Front Face: Old Right Page */}
                      <div className="absolute inset-0 border-l border-white/50 flex flex-col overflow-hidden bg-transparent" style={{ backfaceVisibility: 'hidden' }}>
                          {pages[oldPages[1]] || null}
                      </div>
                      {/* Back Face: New Left Page */}
                      <div className="absolute inset-0 border-r border-[#d8c5a5]/50 flex flex-col overflow-hidden bg-transparent" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                          {pages[pageIndex]}
                      </div>
                    </motion.div>
                  )}
                  {isFlipping && !isMobile && flipDir === -1 && (
                    <motion.div
                      className="absolute top-0 left-0 w-1/2 h-full z-30 pointer-events-none"
                      style={{ transformStyle: 'preserve-3d', originX: 1 }}
                      initial={{ rotateY: 0 }}
                      animate={{ rotateY: 180 }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                    >
                      {/* Front Face: Old Left Page */}
                      <div className="absolute inset-0 border-r border-[#d8c5a5]/50 flex flex-col overflow-hidden bg-transparent" style={{ backfaceVisibility: 'hidden' }}>
                          {pages[oldPages[0]]}
                      </div>
                      {/* Back Face: New Right Page */}
                      <div className="absolute inset-0 border-l border-white/50 flex flex-col overflow-hidden bg-transparent" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                          {pages[pageIndex + 1] || null}
                      </div>
                    </motion.div>
                  )}
                  {/* Mobile Turn Right to Left (Next) */}
                  {isFlipping && isMobile && flipDir === 1 && (
                    <motion.div
                      className="absolute top-0 right-0 w-full h-full z-30 pointer-events-none origin-left"
                      style={{ transformStyle: 'preserve-3d' }}
                      initial={{ rotateY: 0, opacity: 1 }}
                      animate={{ rotateY: -90, opacity: 0 }}
                      transition={{ duration: 0.4, ease: "easeIn" }}
                    >
                       <div className="absolute inset-0 paper-texture overflow-hidden flex flex-col">
                          {pages[oldPages[0]]}
                       </div>
                    </motion.div>
                  )}
                  {/* Mobile Turn Left to Right (Prev) */}
                  {isFlipping && isMobile && flipDir === -1 && (
                    <motion.div
                      className="absolute top-0 left-0 w-full h-full z-30 pointer-events-none origin-right"
                      style={{ transformStyle: 'preserve-3d' }}
                      initial={{ rotateY: 0, opacity: 1 }}
                      animate={{ rotateY: 90, opacity: 0 }}
                      transition={{ duration: 0.4, ease: "easeIn" }}
                    >
                       <div className="absolute inset-0 paper-texture overflow-hidden flex flex-col">
                          {pages[oldPages[0]]}
                       </div>
                    </motion.div>
                  )}
                </AnimatePresence>
            </div>
        </div>

        {/* Bookmarks (Tabs) on the right edge */}
        <div className={`absolute right-0 top-8 z-[5] flex flex-col gap-2 translate-x-full transition-all duration-300 ${(!isMobile && pageIndex >= 16) ? 'opacity-0 pointer-events-none -translate-x-full' : 'opacity-100'}`}>
            {[
              { id: 0, icon: <Compass size={isMobile ? 20 : 16} />, color: 'bg-sky-600', text: 'text-[#f4ecd8]', target: 2 },
              { id: 1, icon: <Package size={isMobile ? 20 : 16} />, color: 'bg-rose-600', text: 'text-[#f4ecd8]', target: 3 },
              { id: 2, icon: <HandCoins size={isMobile ? 20 : 16} />, color: 'bg-[#c9a66b]', text: 'text-[#3a2e22]', target: 5 },
              { id: 3, icon: <HandTarget size={isMobile ? 20 : 16} />, color: 'bg-[#7d8b75]', text: 'text-[#f4ecd8]', target: 6 },
              { id: 4, icon: <Network size={isMobile ? 20 : 16} />, color: 'bg-[#737c95]', text: 'text-[#f4ecd8]', target: 7 },
            ].map((tab, idx) => {
               const targetChapter = tab.target;
               let isActive = false;
               if (targetChapter === 3) {
                 isActive = isMobile ? pageIndex >= 6 && pageIndex <= 9 : Math.floor(pageIndex / 2) === 3 || Math.floor(pageIndex / 2) === 4;
               } else {
                 isActive = isMobile ? pageIndex >= targetChapter * 2 && pageIndex <= (targetChapter * 2) + 1 : Math.floor(pageIndex / 2) === targetChapter;
               }
               
               return (
                 <button 
                   key={tab.id}
                   onClick={() => goToChapter(targetChapter)}
                   className={`
                     p-2.5 sm:p-4 rounded-r-xl border-y-2 border-r-2 border-[#3a2e22] flex items-center justify-center
                     transition-all origin-left
                     ${tab.color} ${tab.text} shadow-lg
                     ${isActive ? 'w-12 sm:w-16 z-20 shadow-xl' : 'w-10 sm:w-12 sm:hover:w-14 z-10 opacity-90'}
                   `}
                   title={`Go to chapter ${idx + 1}`}
                 >
                   {tab.icon}
                 </button>
               )
            })}
        </div>
        
      </div>

    </div>,
    document.body
  );
};
