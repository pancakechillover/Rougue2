import React from 'react';
import { motion } from 'motion/react';
import { Shop } from './Shop';
import { AppState } from '../types';

interface ShopViewProps {
  state: AppState;
  handlePurchase: (item: any) => void;
  handleDraw: (poolId: string, amount: number) => void;
  resetIchibanPool: (poolId: string) => void;
  setDrawResult: (result: any) => void;
  openGuideBook: (chapter: number) => void;
  onSetActivePool?: (type: 'gacha' | 'ichiban', poolId: string) => void;
  onOpenSettings?: () => void;
}

export const ShopView: React.FC<ShopViewProps> = ({ 
  state, 
  handlePurchase, 
  handleDraw, 
  resetIchibanPool, 
  setDrawResult,
  openGuideBook,
  onSetActivePool,
  onOpenSettings
}) => {
  return (
    <motion.div
      key="shop"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full p-4 sm:p-6 lg:p-8"
    >
      <Shop 
        coins={state.coins} 
        shopItems={state.shopItems || []}
        gachaPools={state.gachaPools || []}
        activeGachaPoolId={state.activeGachaPoolId}
        activeIchibanPoolId={state.activeIchibanPoolId}
        onPurchase={handlePurchase}
        onDrawGacha={handleDraw}
        onResetIchiban={(id) => {
          resetIchibanPool(id);
          setTimeout(() => setDrawResult(null), 50);
        }}
        onShowCoinGuide={() => openGuideBook(5)}
        onSetActivePool={onSetActivePool}
        onOpenSettings={onOpenSettings}
      />
    </motion.div>
  );
};

