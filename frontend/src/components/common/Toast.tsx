import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      setToasts((prev) => [...prev, { id, type, message }]);

      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  const success = useCallback((msg: string) => addToast(msg, 'success'), [addToast]);
  const error = useCallback((msg: string) => addToast(msg, 'error'), [addToast]);
  const info = useCallback((msg: string) => addToast(msg, 'info'), [addToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, info }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 p-4 rounded-[12px] bg-white border-2 border-ink shadow-[5px_5px_0_0_#1B1410] text-sm font-sans transition-all duration-150 animate-fade-in"
          >
            <span className="shrink-0 mt-0.5">
              {t.type === 'success' && (
                <div className="w-6 h-6 rounded-md bg-lime border border-ink flex items-center justify-center text-ink shadow-[1px_1px_0_0_#000]">
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                </div>
              )}
              {t.type === 'error' && (
                <div className="w-6 h-6 rounded-md bg-coral border border-ink flex items-center justify-center text-ink shadow-[1px_1px_0_0_#000]">
                  <AlertCircle className="w-4 h-4 stroke-[2.5]" />
                </div>
              )}
              {t.type === 'info' && (
                <div className="w-6 h-6 rounded-md bg-sky-tint border border-ink flex items-center justify-center text-ink shadow-[1px_1px_0_0_#000]">
                  <Info className="w-4 h-4 stroke-[2.5]" />
                </div>
              )}
            </span>
            <p className="flex-1 text-xs sm:text-sm font-bold text-ink leading-snug">{t.message}</p>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="shrink-0 text-ink/70 hover:text-ink p-1 rounded-md border border-transparent hover:border-ink hover:bg-paper-dark transition-colors"
              aria-label="Dismiss toast"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
