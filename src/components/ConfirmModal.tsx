import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { createPortal } from 'react-dom';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  isAlert?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  isAlert = false
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 isolate">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm shadow-2xl"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2rem] shadow-2xl overflow-hidden z-10"
          >
            {/* Header Decor */}
            <div className={cn(
              "h-2 w-full",
              type === 'danger' ? "bg-rose-500" : type === 'warning' ? "bg-amber-500" : "bg-indigo-500"
            )} />
            
            <div className="p-8">
              <div className="flex items-start gap-4">
                <div className={cn(
                  "p-3 rounded-2xl shrink-0",
                  type === 'danger' ? "bg-rose-500/10 text-rose-500" : 
                  type === 'warning' ? "bg-amber-500/10 text-amber-500" : 
                  "bg-indigo-500/10 text-indigo-500"
                )}>
                  {type === 'danger' || type === 'warning' ? <AlertTriangle size={24} /> : <Info size={24} />}
                </div>
                
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{message}</p>
                </div>

                <button 
                  onClick={onClose}
                  className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex items-center justify-end gap-3 mt-8">
                {!isAlert && (
                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    {cancelText}
                  </button>
                )}
                <button
                  onClick={() => {
                    onConfirm?.();
                    onClose();
                  }}
                  className={cn(
                    "px-8 py-2.5 text-sm font-bold rounded-xl shadow-lg transition-all active:scale-95",
                    type === 'danger' 
                      ? "bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20" 
                      : type === 'warning'
                      ? "bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-amber-500/20"
                      : "bg-indigo-500 hover:bg-indigo-400 text-white shadow-indigo-500/20"
                  )}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};
