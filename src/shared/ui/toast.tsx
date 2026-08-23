import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

type ToastTone = "success" | "error" | "info";

type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  showToast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, tone: ToastTone = "success") => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current.slice(-2), { id, message, tone }]);
    window.setTimeout(() => dismissToast(id), 2400);
  }, [dismissToast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-5 top-5 z-[240] flex max-w-[min(90vw,26rem)] flex-col items-end gap-2">
        {toasts.map((toast) => {
          const Icon = toast.tone === "success" ? CheckCircle2 : toast.tone === "error" ? AlertCircle : Info;
          const color = toast.tone === "error" ? "text-destructive" : toast.tone === "info" ? "text-text-primary" : "text-brand-primary";
          return (
            <div key={toast.id} role="status" aria-live="polite" className={`pointer-events-auto flex items-center gap-2 rounded-full border border-surface-border bg-surface-raised px-4 py-2.5 text-[13px] font-black shadow-xl animate-drawer-fade-in ${color}`}>
              <Icon className="size-4 shrink-0" />
              <span>{toast.message}</span>
              <button type="button" aria-label="알림 닫기" onClick={() => dismissToast(toast.id)} className="ml-1 rounded-full p-0.5 text-text-muted hover:bg-surface-muted hover:text-text-primary">
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
