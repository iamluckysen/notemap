import {
  AlertCircle,
  CheckCircle2,
  Info,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "../../lib/utils";

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastApi {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const variantConfig: Record<
  ToastVariant,
  { icon: LucideIcon; iconClass: string; barClass: string; ringClass: string }
> = {
  success: {
    icon: CheckCircle2,
    iconClass: "text-success-500",
    barClass: "bg-success-500",
    ringClass: "bg-success-50",
  },
  error: {
    icon: AlertCircle,
    iconClass: "text-danger-500",
    barClass: "bg-danger-500",
    ringClass: "bg-danger-50",
  },
  info: {
    icon: Info,
    iconClass: "text-accent-600",
    barClass: "bg-accent-600",
    ringClass: "bg-accent-50",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(1);
  const timersRef = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (variant: ToastVariant, title: string, description?: string) => {
      const id = nextIdRef.current;
      nextIdRef.current += 1;
      const duration = variant === "error" ? 7000 : 4200;

      setToasts((current) => [
        ...current.slice(-3),
        { id, title, description, variant, duration },
      ]);

      const timer = window.setTimeout(() => {
        timersRef.current.delete(id);
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, duration);

      timersRef.current.set(id, timer);
    },
    [],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) {
        window.clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (title, description) => push("success", title, description),
      error: (title, description) => push("error", title, description),
      info: (title, description) => push("info", title, description),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-4 top-4 z-[100] flex flex-col items-end gap-2.5 sm:left-auto sm:right-5 sm:top-5 sm:w-[380px]"
      >
        {toasts.map((toast) => {
          const config = variantConfig[toast.variant];
          const Icon = config.icon;

          return (
            <div
              key={toast.id}
              role={toast.variant === "error" ? "alert" : "status"}
              className="pointer-events-auto relative w-full animate-toast-in overflow-hidden rounded-xl border border-paper-200 bg-white/95 p-3.5 pr-10 shadow-float backdrop-blur-md"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-y-0 left-0 w-1",
                  config.barClass,
                )}
              />
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                    config.ringClass,
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    className={cn("size-4", config.iconClass)}
                  />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-5 text-ink-900">
                    {toast.title}
                  </p>
                  {toast.description ? (
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-600">
                      {toast.description}
                    </p>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="absolute right-2 top-2 rounded-md p-1 text-ink-400 transition hover:bg-paper-100 hover:text-ink-700"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
              <span
                aria-hidden="true"
                className={cn(
                  "absolute bottom-0 left-0 h-0.5 opacity-30",
                  config.barClass,
                )}
                style={{
                  animation: `toast-progress ${toast.duration}ms linear forwards`,
                }}
              />
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside a ToastProvider.");
  }
  return context;
}
