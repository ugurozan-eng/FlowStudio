'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

// Toast tipleri
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

// Context tipi
interface ToastContextType {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Toast ikonları
const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={20} />,
  error: <XCircle size={20} />,
  warning: <AlertCircle size={20} />,
  info: <Info size={20} />,
};

// Renk stilleri
const styles: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: {
    bg: 'rgba(0, 255, 170, 0.1)',
    border: 'rgba(0, 255, 170, 0.3)',
    icon: '#00ffaa',
  },
  error: {
    bg: 'rgba(255, 0, 85, 0.1)',
    border: 'rgba(255, 0, 85, 0.3)',
    icon: '#ff0055',
  },
  warning: {
    bg: 'rgba(245, 158, 11, 0.1)',
    border: 'rgba(245, 158, 11, 0.3)',
    icon: '#f59e0b',
  },
  info: {
    bg: 'rgba(0, 194, 255, 0.1)',
    border: 'rgba(0, 194, 255, 0.3)',
    icon: '#00c2ff',
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, type, message, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Kısayol fonksiyonları
  const success = useCallback((message: string, duration?: number) => 
    addToast('success', message, duration), [addToast]);
  
  const error = useCallback((message: string, duration?: number) => 
    addToast('error', message, duration), [addToast]);
  
  const warning = useCallback((message: string, duration?: number) => 
    addToast('warning', message, duration), [addToast]);
  
  const info = useCallback((message: string, duration?: number) => 
    addToast('info', message, duration), [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      
      {/* Toast Container */}
      <div style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        maxWidth: '400px',
      }}>
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              style={{
                background: styles[toast.type].bg,
                border: `1px solid ${styles[toast.type].border}`,
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                backdropFilter: 'blur(12px)',
                boxShadow: `0 4px 20px ${styles[toast.type].bg}`,
              }}
            >
              {/* Icon */}
              <span style={{ color: styles[toast.type].icon, flexShrink: 0 }}>
                {icons[toast.type]}
              </span>
              
              {/* Message */}
              <span style={{ 
                flex: 1, 
                fontSize: '0.9rem', 
                color: 'white',
                fontWeight: 500,
              }}>
                {toast.message}
              </span>
              
              {/* Close button */}
              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.4)',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.2s',
                }}
                onMouseOver={(e) => e.currentTarget.style.color = 'white'}
                onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)'}
              >
                <X size={16} />
              </button>

              {/* Progress bar */}
              {toast.duration && toast.duration > 0 && (
                <motion.div
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: toast.duration / 1000, ease: 'linear' }}
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: styles[toast.type].icon,
                    transformOrigin: 'left',
                    borderRadius: '0 0 12px 12px',
                  }}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// Hook
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}