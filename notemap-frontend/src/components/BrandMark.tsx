import { cn } from "../lib/utils";

interface BrandMarkProps {
  className?: string;
}

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[11px] bg-accent-600 shadow-[0_6px_16px_-6px_rgba(91,62,230,0.8)] ring-1 ring-inset ring-white/20",
        className,
      )}
    >
      <span className="absolute -right-2 -top-3 size-6 rounded-full bg-white/20 blur-[2px]" />
      <svg
        viewBox="0 0 64 64"
        fill="none"
        className="relative size-6"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M20 22.5 32 15l12 7.5v15L32 45l-12-7.5v-15Z"
          stroke="white"
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        <circle cx="32" cy="15" r="4" fill="#FBF9F7" />
        <circle cx="20" cy="37.5" r="4" fill="#C9BEFF" />
        <circle cx="44" cy="37.5" r="4" fill="#C9BEFF" />
        <circle cx="32" cy="45" r="4" fill="#FBF9F7" />
        <path
          d="M32 19v22M24 35l8 6 8-6"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.7"
        />
      </svg>
    </span>
  );
}
