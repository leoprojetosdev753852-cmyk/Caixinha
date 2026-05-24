'use client';

import { create } from 'zustand';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useEffect } from 'react';

export type ToastType = 'success' | 'error';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastStore {
  toasts: Toast[];
  push: (type: ToastType, message: string) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (type, message) => {
    const id = Math.random().toString(36).slice(2);
    set((state) => ({ toasts: [...state.toasts, { id, type, message }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  remove: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export function useToast() {
  const push = useToastStore((s) => s.push);
  return {
    success: (message: string) => push('success', message),
    error: (message: string) => push('error', message),
  };
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  return (
    <div className="fixed top-4 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 rounded-lg border p-3 shadow-lg ${
            t.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-destructive/30 bg-destructive/10 text-destructive'
          }`}
        >
          {t.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <span className="flex-1 text-sm">{t.message}</span>
          <button onClick={() => remove(t.id)} className="shrink-0 p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
