import {
  Fingerprint,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { NoteHistoryItem } from "../../types/note";
import { formatNoteDate, cn } from "../../lib/utils";
import { shortenUserId } from "../../lib/userId";
import { BrandMark } from "../BrandMark";
import { SourceBadge } from "../ui/SourceBadge";

interface SidebarProps {
  notes: NoteHistoryItem[];
  activeId: number | null;
  loading: boolean;
  error: string | null;
  open: boolean;
  userId: string;
  onClose: () => void;
  onNewNote: () => void;
  onSelectNote: (note: NoteHistoryItem) => void;
  onDeleteNote: (note: NoteHistoryItem) => void;
  onRetry: () => void;
}

function HistorySkeleton() {
  return (
    <div className="space-y-2 px-2" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="rounded-xl border border-paper-200/70 bg-white/60 p-3"
        >
          <div className="animate-shimmer h-3.5 w-4/5 rounded bg-paper-200" />
          <div className="mt-2.5 flex items-center gap-2">
            <div className="animate-shimmer h-3.5 w-10 rounded bg-paper-200" />
            <div className="animate-shimmer h-3 w-16 rounded bg-paper-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface EmptyHistoryProps {
  onCreate: () => void;
}

function EmptyHistory({ onCreate }: EmptyHistoryProps) {
  return (
    <div className="mx-2 mt-2 rounded-xl border border-dashed border-paper-300 bg-white/50 px-4 py-7 text-center">
      <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-accent-50 text-accent-500">
        <Sparkles aria-hidden="true" className="size-4.5" />
      </span>
      <p className="mt-3 text-sm font-semibold text-ink-800">No notes yet</p>
      <p className="mt-1 text-xs leading-relaxed text-ink-500">
        Paste a lecture or article and NoteMap will map it out.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-accent-700 transition hover:text-accent-800"
      >
        <Plus aria-hidden="true" className="size-3.5" />
        Create your first note
      </button>
    </div>
  );
}

function ErrorHistory({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="mx-2 mt-2 rounded-xl border border-danger-500/20 bg-danger-50/60 p-3.5">
      <p className="text-xs font-semibold text-danger-700">
        Couldn&apos;t load your notes
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-600">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-danger-700 transition hover:text-danger-500"
      >
        <RefreshCw aria-hidden="true" className="size-3" />
        Try again
      </button>
    </div>
  );
}

function NoteRow({
  note,
  active,
  onSelect,
  onDelete,
}: {
  note: NoteHistoryItem;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "true" : undefined}
        className={cn(
          "relative w-full rounded-xl border p-3 pr-9 text-left transition-all duration-150",
          active
            ? "border-accent-200 bg-white shadow-[0_6px_20px_-14px_rgba(76,48,201,0.65)]"
            : "border-transparent hover:border-paper-200 hover:bg-white/70",
        )}
      >
        {active ? (
          <span
            aria-hidden="true"
            className="absolute inset-y-2.5 left-0 w-[3px] rounded-r-full bg-accent-600"
          />
        ) : null}
        <p
          className={cn(
            "line-clamp-2 text-[13px] font-semibold leading-snug",
            active ? "text-ink-950" : "text-ink-800",
          )}
        >
          {note.title || "Untitled note"}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <SourceBadge sourceType={note.sourceType} />
          <span className="text-[10px] font-medium text-ink-400">
            {formatNoteDate(note.createdAt)}
          </span>
        </div>
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        aria-label={`Delete ${note.title || "note"}`}
        title="Delete note"
        className="absolute right-1.5 top-1.5 rounded-md p-1.5 text-ink-300 opacity-100 transition hover:bg-danger-50 hover:text-danger-500 focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
      >
        <Trash2 aria-hidden="true" className="size-3.5" />
      </button>
    </div>
  );
}

export function Sidebar({
  notes,
  activeId,
  loading,
  error,
  open,
  userId,
  onClose,
  onNewNote,
  onSelectNote,
  onDeleteNote,
  onRetry,
}: SidebarProps) {
  const showSkeleton = loading && notes.length === 0;

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-ink-950/30 backdrop-blur-[2px] transition-opacity duration-200 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        aria-label="Note library"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[286px] shrink-0 flex-col border-r border-paper-200 bg-paper-50/95 shadow-float backdrop-blur-xl transition-transform duration-200 ease-out lg:static lg:z-auto lg:translate-x-0 lg:bg-paper-50/80 lg:shadow-none lg:backdrop-blur-none",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-start justify-between px-5 pb-4 pt-5">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div>
              <p className="font-display text-[22px] font-semibold leading-none tracking-[-0.02em] text-ink-950">
                NoteMap
              </p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-400">
                Visual study notes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close note library"
            className="-mr-1 rounded-lg p-1.5 text-ink-400 transition hover:bg-paper-100 hover:text-ink-700 lg:hidden"
          >
            <X aria-hidden="true" className="size-4.5" />
          </button>
        </div>

        <div className="px-4">
          <button
            type="button"
            onClick={onNewNote}
            className="group flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent-600 px-4 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(91,62,230,0.9)] transition hover:bg-accent-700 active:scale-[0.99]"
          >
            <span className="flex size-5 items-center justify-center rounded-full bg-white/15 transition group-hover:bg-white/20">
              <Plus aria-hidden="true" className="size-3.5" />
            </span>
            New Note
          </button>
        </div>

        <div className="mt-6 flex items-center justify-between px-5">
          <div className="flex items-center gap-2">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
              Your notes
            </h2>
            {notes.length > 0 ? (
              <span className="rounded-full bg-paper-200/80 px-1.5 py-0.5 text-[9px] font-semibold text-ink-500">
                {notes.length}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onRetry}
            aria-label="Refresh note history"
            title="Refresh history"
            className="rounded-md p-1 text-ink-400 transition hover:bg-paper-100 hover:text-ink-700"
          >
            <RefreshCw
              aria-hidden="true"
              className={cn("size-3.5", loading ? "animate-spin" : "")}
            />
          </button>
        </div>

        <div className="scrollbar-thin mt-2 min-h-0 flex-1 overflow-y-auto pb-4">
          {showSkeleton ? <HistorySkeleton /> : null}

          {!showSkeleton && error && notes.length === 0 ? (
            <ErrorHistory message={error} onRetry={onRetry} />
          ) : null}

          {!showSkeleton && !error && notes.length === 0 ? (
            <EmptyHistory onCreate={onNewNote} />
          ) : null}

          {notes.length > 0 ? (
            <div className="space-y-1 px-2">
              {notes.map((note) => (
                <NoteRow
                  key={note.id}
                  note={note}
                  active={note.id === activeId}
                  onSelect={() => onSelectNote(note)}
                  onDelete={() => onDeleteNote(note)}
                />
              ))}
            </div>
          ) : null}

          {error && notes.length > 0 ? (
            <p className="mx-3 mt-3 rounded-lg bg-danger-50/70 px-3 py-2 text-[10px] leading-relaxed text-danger-700">
              {error}
            </p>
          ) : null}
        </div>

        <div className="border-t border-paper-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-full bg-white text-ink-400 ring-1 ring-paper-200">
              <Fingerprint aria-hidden="true" className="size-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-ink-700">
                Anonymous workspace
              </p>
              <p
                className="truncate font-mono text-[9px] text-ink-400"
                title={userId}
              >
                {shortenUserId(userId)}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[9px] leading-relaxed text-ink-400">
            Notes are linked to this browser. No account needed.
          </p>
        </div>
      </aside>
    </>
  );
}
