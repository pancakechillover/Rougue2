import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Coins } from 'lucide-react';

interface CoinRainProps {
  active: boolean;
  onComplete: () => void;
}

interface CoinData {
  id: number;
  left: string;
  delay: number;
  duration: number;
  size: number;
  rotation: number;
}

export const CoinRain: React.FC<CoinRainProps> = ({ active, onComplete }) => {
  const [coins, setCoins] = useState<CoinData[]>([]);

  useEffect(() => {
    if (active) {
      // Create a lighter rain of 60 coins for better performance
      const newCoins: CoinData[] = Array.from({ length: 60 }).map((_, i) => ({
        id: Date.now() + i, // Unique ID for each trigger
        left: `${Math.random() * 100}%`,
        delay: Math.random() * 2, // Spread start times over 2 seconds
        duration: 1.5 + Math.random() * 1.5, // Faster fall speed
        size: 20 + Math.random() * 20,
        rotation: Math.random() * 360,
      }));
      
      setCoins(newCoins);

      const timer = setTimeout(() => {
        setCoins([]);
        onComplete();
      }, 4000); // Shorter total duration

      return () => clearTimeout(timer);
    }
  }, [active]); // Removed onComplete from dependencies to prevent re-triggering

  return (
    <AnimatePresence>
      {active && (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
          {coins.map((coin) => (
            <motion.div
              key={coin.id}
              initial={{ 
                y: -100, 
                rotate: coin.rotation,
                opacity: 0,
                scale: 0.5
              }}
              animate={{ 
                y: '110vh', 
                rotate: coin.rotation + 720 * (Math.random() > 0.5 ? 1 : -1),
                opacity: [0, 1, 1, 0],
                scale: [0.5, 1, 1, 0.8],
              }}
              transition={{ 
                duration: coin.duration,
                ease: "linear",
                delay: coin.delay,
                times: [0, 0.1, 0.9, 1]
              }}
              className="absolute text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
              style={{ 
                left: coin.left,
              }}
            >
              <Coins size={coin.size} />
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
};
