import { useState, useEffect } from 'react';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
}

// Removed unused interface ToastContextType

// Simple toast state management
const toastState = {
  toasts: [] as Toast[],
  listeners: [] as Array<(toasts: Toast[]) => void>,
  
  addToast(toast: Omit<Toast, 'id'>) {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };
    this.toasts.push(newToast);
    this.notifyListeners();
    
    // Auto dismiss
    const duration = toast.duration || 5000;
    setTimeout(() => {
      this.removeToast(id);
    }, duration);
  },
  
  removeToast(id: string) {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.notifyListeners();
  },
  
  subscribe(listener: (toasts: Toast[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  },
  
  notifyListeners() {
    this.listeners.forEach(listener => listener([...this.toasts]));
  }
};

// Hook to use toast
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(toastState.toasts);
  
  useEffect(() => {
    return toastState.subscribe(setToasts);
  }, []);
  
  return {
    toasts,
    toast: (toast: Omit<Toast, 'id'>) => toastState.addToast(toast),
    dismiss: (id: string) => toastState.removeToast(id)
  };
}

// Toast component
function ToastComponent({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const variantStyles = {
    default: 'bg-slate-800 border-slate-700 text-slate-100',
    destructive: 'bg-red-900/20 border-red-500/50 text-red-400',
    success: 'bg-green-900/20 border-green-500/50 text-green-400'
  };

  return (
    <div className={`
      border rounded-lg p-4 shadow-lg backdrop-blur-sm max-w-sm w-full
      animate-in slide-in-from-right-full duration-300
      ${variantStyles[toast.variant || 'default']}
    `}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="font-medium text-sm">
            {toast.title}
          </div>
          {toast.description && (
            <div className="text-xs mt-1 opacity-90">
              {toast.description}
            </div>
          )}
        </div>
        
        <button
          onClick={() => onDismiss(toast.id)}
          className="ml-3 opacity-70 hover:opacity-100 transition-opacity"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Toaster container
export function Toaster() {
  const { toasts, dismiss } = useToast();
  
  if (toasts.length === 0) {
    return null;
  }
  
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col space-y-2">
      {toasts.map((toast) => (
        <ToastComponent
          key={toast.id}
          toast={toast}
          onDismiss={dismiss}
        />
      ))}
    </div>
  );
}

// Export toast function for global use
export const toast = (toast: Omit<Toast, 'id'>) => toastState.addToast(toast);