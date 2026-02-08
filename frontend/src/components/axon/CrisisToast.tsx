import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CrisisToastProps {
  message: string;
  onClose: () => void;
  autoClose?: number;
}

export function CrisisToast({ message, onClose, autoClose = 8000 }: CrisisToastProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - (100 / (autoClose / 100));
        if (newProgress <= 0) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return newProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [autoClose, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-full max-w-md px-4"
    >
      <div className="bg-red-500 text-white rounded-lg shadow-2xl overflow-hidden">
        {/* Progress bar */}
        <div 
          className="h-1 bg-red-700 transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
        
        <div className="p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 animate-pulse">
            <AlertTriangle className="w-5 h-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm mb-1">CRITICAL ALERT</div>
            <div className="text-sm opacity-95">{message}</div>
          </div>

          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

interface ToastManagerProps {
  toasts: Array<{ id: string; message: string }>;
  onRemove: (id: string) => void;
}

export function ToastManager({ toasts, onRemove }: ToastManagerProps) {
  return (
    <AnimatePresence>
      {toasts.map((toast) => (
        <CrisisToast
          key={toast.id}
          message={toast.message}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </AnimatePresence>
  );
}
