import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) {
        onCancel();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    const focusTimer = window.setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 30);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [open, loading, onCancel]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog"
        tabIndex={-1}
        onClick={() => {
          if (!loading) {
            onCancel();
          }
        }}
        className="absolute inset-0 cursor-default bg-ink-950/35 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative w-full max-w-md animate-scale-in overflow-hidden rounded-2xl border border-paper-200 bg-white shadow-float"
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-full",
                tone === "danger"
                  ? "bg-danger-50 text-danger-500"
                  : "bg-accent-50 text-accent-600",
              )}
            >
              {tone === "danger" ? (
                <Trash2 aria-hidden="true" className="size-5" />
              ) : (
                <AlertTriangle aria-hidden="true" className="size-5" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <h2
                id={titleId}
                className="font-display text-xl font-semibold tracking-tight text-ink-950"
              >
                {title}
              </h2>
              <p
                id={descriptionId}
                className="mt-1.5 text-sm leading-relaxed text-ink-600"
              >
                {description}
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              aria-label="Close"
              className="-mr-1 -mt-1 rounded-lg p-1.5 text-ink-400 transition hover:bg-paper-100 hover:text-ink-700 disabled:opacity-40"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-paper-200 bg-paper-50/80 px-5 py-3.5 sm:flex-row sm:justify-end sm:px-6">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-paper-300 bg-white px-4 text-sm font-medium text-ink-700 shadow-sm transition hover:border-paper-400 hover:bg-paper-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white shadow-sm transition disabled:opacity-60",
              tone === "danger"
                ? "bg-danger-500 hover:bg-danger-700"
                : "bg-accent-600 hover:bg-accent-700",
            )}
          >
            {loading ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : null}
            {loading ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
