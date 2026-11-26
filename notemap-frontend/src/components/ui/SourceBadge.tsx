import { FileText, FileUp, Video, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";

interface SourceBadgeProps {
  sourceType: string;
  size?: "xs" | "sm";
  className?: string;
}

const sourceConfig: Record<
  string,
  { label: string; icon: LucideIcon; className: string }
> = {
  TEXT: {
    label: "TEXT",
    icon: FileText,
    className: "bg-accent-50 text-accent-700 ring-accent-200/70",
  },
  PDF: {
    label: "PDF",
    icon: FileUp,
    className: "bg-warning-50 text-warning-700 ring-warning-500/20",
  },
  YOUTUBE: {
    label: "YOUTUBE",
    icon: Video,
    className: "bg-danger-50 text-danger-700 ring-danger-500/20",
  },
};

export function SourceBadge({
  sourceType,
  size = "xs",
  className,
}: SourceBadgeProps) {
  const normalized = sourceType.toUpperCase();
  const config = sourceConfig[normalized] ?? {
    label: normalized || "NOTE",
    icon: FileText,
    className: "bg-paper-100 text-ink-600 ring-paper-300",
  };
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md font-semibold uppercase tracking-[0.08em] ring-1 ring-inset",
        config.className,
        size === "xs" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[10px]",
        className,
      )}
    >
      <Icon aria-hidden="true" className={size === "xs" ? "size-2.5" : "size-3"} />
      {config.label}
    </span>
  );
}
