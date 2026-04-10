import { useEffect } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error';

export interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4 shadow-lg animate-in slide-in-from-bottom-5">
      {type === 'success' ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
      ) : (
        <XCircle className="h-5 w-5 text-red-500" />
      )}
      <p className="text-sm font-medium text-zinc-100">{message}</p>
      <button
        onClick={onClose}
        className="ml-2 rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
