import React, { createContext, useContext, useMemo, useState } from 'react';

type ToastVariant = 'success' | 'error' | 'info';

type Toast = {
  id: string;
  message: string;
  variant: ToastVariant;
};

type ToastContextType = {
  toasts: Toast[];
  showToast: (message: string, variant?: ToastVariant) => void;
  removeToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));
  const showToast = (message: string, variant: ToastVariant = 'info') => {
    const id = String(Date.now() + Math.random());
    const toast = { id, message, variant };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => removeToast(id), 3500);
  };

  const value = useMemo(() => ({ toasts, showToast, removeToast }), [toasts]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed z-50 right-4 bottom-4 space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className={`px-4 py-2 rounded-md shadow-md text-white text-sm ${
            t.variant === 'success' ? 'bg-green-600' : t.variant === 'error' ? 'bg-red-600' : 'bg-slate-700'
          }`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

