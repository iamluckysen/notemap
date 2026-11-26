import { Menu, Plus } from "lucide-react";
import { BrandMark } from "../BrandMark";

interface MobileTopBarProps {
  onOpenSidebar: () => void;
  onNewNote: () => void;
}

export function MobileTopBar({
  onOpenSidebar,
  onNewNote,
}: MobileTopBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-paper-200 bg-paper-50/90 px-3 backdrop-blur-md lg:hidden">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open note library"
          className="rounded-lg p-2 text-ink-600 transition hover:bg-paper-100 hover:text-ink-900"
        >
          <Menu aria-hidden="true" className="size-5" />
        </button>
        <div className="flex items-center gap-2">
          <BrandMark className="size-7 rounded-lg" />
          <span className="font-display text-lg font-semibold tracking-tight text-ink-950">
            NoteMap
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onNewNote}
        aria-label="New note"
        className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-accent-700"
      >
        <Plus aria-hidden="true" className="size-3.5" />
        New
      </button>
    </header>
  );
}
