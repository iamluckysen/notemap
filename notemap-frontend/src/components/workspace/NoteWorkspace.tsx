import {
  Check,
  Download,
  Loader2,
  Menu,
  PanelLeftOpen,
  Save,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { exportNoteToPdf } from "../../lib/pdf";
import {
  cn,
  formatLongDate,
  formatNoteDate,
  getErrorMessage,
} from "../../lib/utils";
import type { Note, UpdateNotePayload } from "../../types/note";
import { SourceBadge } from "../ui/SourceBadge";
import { useToast } from "../ui/ToastProvider";
import {
  ExcalidrawBoard,
  type ExcalidrawBoardHandle,
} from "./ExcalidrawBoard";
import { SummaryPane } from "./SummaryPane";

interface NoteWorkspaceProps {
  note: Note;
  onSave: (payload: UpdateNotePayload) => Promise<Note>;
  onOpenSidebar: () => void;
}

const MIN_SUMMARY_WIDTH = 22;
const MAX_SUMMARY_WIDTH = 55;
const DEFAULT_SUMMARY_WIDTH = 35;

function clampWidth(value: number): number {
  return Math.min(MAX_SUMMARY_WIDTH, Math.max(MIN_SUMMARY_WIDTH, value));
}

function CollapsedSummaryRail({
  isDesktop,
  onExpand,
}: {
  isDesktop: boolean;
  onExpand: () => void;
}) {
  if (!isDesktop) {
    return (
      <div className="flex h-10 shrink-0 items-center justify-between rounded-xl border border-paper-200 bg-white px-3 shadow-sm">
        <span className="text-[11px] font-semibold text-ink-500">
          Study summary hidden
        </span>
        <button
          type="button"
          onClick={onExpand}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold text-accent-700 transition hover:bg-accent-50"
        >
          <PanelLeftOpen aria-hidden="true" className="size-3.5" />
          Show summary
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-11 shrink-0 flex-col items-center gap-3 rounded-2xl border border-paper-200 bg-white py-2 shadow-panel">
      <button
        type="button"
        onClick={onExpand}
        title="Show summary"
        aria-label="Show summary pane"
        className="rounded-lg p-1.5 text-ink-400 transition hover:bg-paper-100 hover:text-accent-700"
      >
        <PanelLeftOpen aria-hidden="true" className="size-4" />
      </button>
      <span
        className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400"
        style={{ writingMode: "vertical-rl" }}
      >
        Study summary
      </span>
      <Sparkles
        aria-hidden="true"
        className="mt-auto mb-1 size-3 text-accent-300"
      />
    </div>
  );
}

export function NoteWorkspace({
  note,
  onSave,
  onOpenSidebar,
}: NoteWorkspaceProps) {
  const toast = useToast();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const boardRef = useRef<ExcalidrawBoardHandle>(null);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState(note.title);
  const [summary, setSummary] = useState(note.summary);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sceneDirty, setSceneDirty] = useState(false);
  const [summaryCollapsed, setSummaryCollapsed] = useState(false);
  const [summaryWidth, setSummaryWidth] = useState(DEFAULT_SUMMARY_WIDTH);
  const [isDragging, setIsDragging] = useState(false);

  const isDirty =
    title !== note.title || summary !== note.summary || sceneDirty;

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const previousCursor = document.body.style.cursor;
    const previousSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelect;
    };
  }, [isDragging]);

  const handleSave = useCallback(async () => {
    if (saving) {
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error(
        "A title is required",
        "Give your note a short title before saving.",
      );
      return;
    }

    setSaving(true);
    try {
      const board = boardRef.current;
      const excalidrawJson =
        board && board.isReady()
          ? board.getSceneJson()
          : note.excalidrawJson;

      const updated = await onSave({
        title: trimmedTitle,
        summary,
        mermaidCode: note.mermaidCode,
        excalidrawJson,
      });

      setTitle(updated.title);
      setSummary(updated.summary);
      setSceneDirty(false);
      boardRef.current?.markClean();
      toast.success(
        "Note saved",
        "Your summary and diagram are up to date.",
      );
    } catch (error) {
      toast.error("Couldn't save note", getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }, [note.excalidrawJson, note.mermaidCode, onSave, saving, summary, title, toast]);

  const handleExport = useCallback(async () => {
    if (exporting) {
      return;
    }

    const board = boardRef.current;
    const exportData = board?.getExportData();

    if (!exportData) {
      toast.error(
        "Diagram not ready",
        "Wait for the canvas to finish loading, then try again.",
      );
      return;
    }

    setExporting(true);
    try {
      const filename = await exportNoteToPdf({
        title: title.trim() || note.title,
        summary,
        createdAt: note.createdAt,
        elements: exportData.elements,
        appState: exportData.appState,
        files: exportData.files,
      });

      toast.success("PDF exported", `Saved ${filename} to your downloads.`);
    } catch (error) {
      toast.error("Couldn't export PDF", getErrorMessage(error));
    } finally {
      setExporting(false);
    }
  }, [exporting, note.createdAt, note.title, summary, title, toast]);

  useEffect(() => {
    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "s"
      ) {
        event.preventDefault();
        void handleSave();
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [handleSave]);

  const handleSplitterPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (!isDesktop) {
      return;
    }

    const container = splitContainerRef.current;
    if (!container) {
      return;
    }

    event.preventDefault();
    const rect = container.getBoundingClientRect();
    setIsDragging(true);

    const handleMove = (moveEvent: PointerEvent) => {
      const percentage = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      setSummaryWidth(clampWidth(percentage));
    };

    const handleUp = () => {
      setIsDragging(false);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const handleSplitterKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>,
  ) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setSummaryWidth((current) => clampWidth(current - 2));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setSummaryWidth((current) => clampWidth(current + 2));
    } else if (event.key === "Home") {
      event.preventDefault();
      setSummaryWidth(MIN_SUMMARY_WIDTH);
    } else if (event.key === "End") {
      event.preventDefault();
      setSummaryWidth(MAX_SUMMARY_WIDTH);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-paper-50">
      <header className="flex shrink-0 flex-col gap-2 border-b border-paper-200 bg-white/90 px-3 py-2.5 backdrop-blur-md sm:px-4 lg:flex-row lg:items-center lg:justify-between lg:gap-5 lg:px-5 lg:py-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onOpenSidebar}
            aria-label="Open note library"
            className="-ml-1 rounded-lg p-2 text-ink-500 transition hover:bg-paper-100 hover:text-ink-800 lg:hidden"
          >
            <Menu aria-hidden="true" className="size-5" />
          </button>

          <div className="min-w-0 flex-1">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              aria-label="Note title"
              title="Edit note title"
              placeholder="Untitled note"
              className="-mx-1 w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 font-display text-lg font-semibold tracking-[-0.02em] text-ink-950 outline-none transition placeholder:text-ink-400 hover:border-paper-200 focus:border-accent-300 focus:bg-white focus:ring-2 focus:ring-accent-100 sm:text-[22px]"
            />
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 pl-0.5">
              <SourceBadge sourceType={note.sourceType} size="sm" />
              <span className="hidden text-[10px] font-medium text-ink-400 sm:inline">
                {formatNoteDate(note.createdAt)}
              </span>
              <span
                className="hidden h-3 w-px bg-paper-300 sm:block"
                aria-hidden="true"
              />
              {isDirty ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-warning-700">
                  <span className="size-1.5 rounded-full bg-warning-500" />
                  Unsaved changes
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-ink-400">
                  <Check aria-hidden="true" className="size-3 text-success-500" />
                  All changes saved
                </span>
              )}
              <span className="hidden text-[10px] text-ink-300 md:inline">
                · {formatLongDate(note.createdAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            title="Save changes (Ctrl+S)"
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent-600 px-3 text-xs font-semibold text-white shadow-[0_8px_18px_-12px_rgba(91,62,230,0.95)] transition hover:bg-accent-700 active:scale-[0.99] disabled:opacity-60 sm:flex-none"
          >
            {saving ? (
              <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
            ) : (
              <Save aria-hidden="true" className="size-3.5" />
            )}
            <span className="hidden sm:inline">
              {saving ? "Saving…" : "Save Changes"}
            </span>
            <span className="sm:hidden">{saving ? "Saving…" : "Save"}</span>
          </button>
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={exporting}
            title="Export summary and diagram as PDF"
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-paper-300 bg-white px-3 text-xs font-semibold text-ink-700 shadow-sm transition hover:border-paper-400 hover:bg-paper-50 active:scale-[0.99] disabled:opacity-60 sm:flex-none"
          >
            {exporting ? (
              <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
            ) : (
              <Download aria-hidden="true" className="size-3.5" />
            )}
            <span className="hidden sm:inline">
              {exporting ? "Exporting…" : "Export PDF"}
            </span>
            <span className="sm:hidden">
              {exporting ? "PDF…" : "PDF"}
            </span>
          </button>
        </div>
      </header>

      <div
        ref={splitContainerRef}
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-2 p-2 sm:gap-2.5 sm:p-3 lg:flex-row lg:gap-0",
          isDragging ? "cursor-col-resize" : "",
        )}
      >
        {!summaryCollapsed ? (
          <div
            className={cn(
              "min-h-0 overflow-hidden rounded-2xl border border-paper-200 bg-white shadow-panel",
              isDesktop ? "shrink-0" : "h-[38vh] shrink-0",
            )}
            style={isDesktop ? { width: `${summaryWidth}%` } : undefined}
          >
            <SummaryPane
              summary={summary}
              onChange={setSummary}
              onCollapse={() => setSummaryCollapsed(true)}
            />
          </div>
        ) : (
          <CollapsedSummaryRail
            isDesktop={isDesktop}
            onExpand={() => setSummaryCollapsed(false)}
          />
        )}

        {!summaryCollapsed && isDesktop ? (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize summary pane"
            aria-valuenow={Math.round(summaryWidth)}
            aria-valuemin={MIN_SUMMARY_WIDTH}
            aria-valuemax={MAX_SUMMARY_WIDTH}
            tabIndex={0}
            onPointerDown={handleSplitterPointerDown}
            onKeyDown={handleSplitterKeyDown}
            className={cn(
              "group relative mx-1 flex w-2.5 shrink-0 cursor-col-resize touch-none items-center justify-center rounded-full transition",
              isDragging ? "bg-accent-100" : "hover:bg-accent-50",
            )}
          >
            <span
              aria-hidden="true"
              className="h-10 w-1 rounded-full bg-paper-300 transition group-hover:bg-accent-300"
            />
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-paper-200 bg-white shadow-panel">
          <ExcalidrawBoard
            key={note.id}
            ref={boardRef}
            note={note}
            onDirty={() => setSceneDirty(true)}
          />
        </div>
      </div>

      <div className="hidden shrink-0 items-center justify-between border-t border-paper-200 bg-white/70 px-4 py-1.5 text-[9px] text-ink-400 lg:flex">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles aria-hidden="true" className="size-2.5 text-accent-400" />
          Editable AI diagram — move nodes, change colors, add notes
        </span>
        <span className="inline-flex items-center gap-1.5">
          <TriangleAlert aria-hidden="true" className="size-2.5" />
          Save Changes keeps your canvas edits
        </span>
      </div>
    </div>
  );
}
