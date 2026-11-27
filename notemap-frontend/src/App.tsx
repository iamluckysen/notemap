import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ApiError, type DiagramType, notesApi } from "./api/notesApi";
import { MobileTopBar } from "./components/layout/MobileTopBar";
import { Sidebar } from "./components/layout/Sidebar";
import { NewNoteView } from "./components/new-note/NewNoteView";
import { ConfirmDialog } from "./components/ui/ConfirmDialog";
import { useToast } from "./components/ui/ToastProvider";
import { WorkspaceSkeleton } from "./components/workspace/WorkspaceSkeleton";
import { recordNoteGenerationExposure } from "./lib/flagsmith";
import { getErrorMessage } from "./lib/utils";
import { getOrCreateUserId } from "./lib/userId";
import type {
  Note,
  NoteHistoryItem,
  UpdateNotePayload,
} from "./types/note";

const NoteWorkspace = lazy(() =>
  import("./components/workspace/NoteWorkspace").then((module) => ({
    default: module.NoteWorkspace,
  })),
);

type AppView = "new" | "note";

export default function App() {
  const toast = useToast();
  const [userId] = useState(() => getOrCreateUserId());

  const [notes, setNotes] = useState<NoteHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [view, setView] = useState<AppView>("new");
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [noteLoading, setNoteLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<NoteHistoryItem | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  const initialHistoryLoadRef = useRef(false);
  const loadNoteTokenRef = useRef(0);

  const loadHistory = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      if (!silent) {
        setHistoryLoading(true);
        setHistoryError(null);
      }

      try {
        const items = await notesApi.getHistory();
        setNotes(items);
        setHistoryError(null);
      } catch (error) {
        const message = getErrorMessage(error);
        if (!silent) {
          setHistoryError(message);
          toast.error("Couldn't load note history", message);
        }
      } finally {
        if (!silent) {
          setHistoryLoading(false);
        }
      }
    },
    [toast],
  );

  useEffect(() => {
    if (initialHistoryLoadRef.current) {
      return;
    }
    initialHistoryLoadRef.current = true;
    void loadHistory();
  }, [loadHistory]);

  const handleNewNote = useCallback(() => {
    loadNoteTokenRef.current += 1;
    setView("new");
    setActiveNote(null);
    setSelectedId(null);
    setNoteLoading(false);
    setSidebarOpen(false);
  }, []);

  const handleSelectNote = useCallback(
    async (note: NoteHistoryItem) => {
      setSidebarOpen(false);

      if (view === "note" && activeNote?.id === note.id) {
        return;
      }

      const token = loadNoteTokenRef.current + 1;
      loadNoteTokenRef.current = token;
      setSelectedId(note.id);
      setNoteLoading(true);

      try {
        const fullNote = await notesApi.getNote(note.id);
        if (token !== loadNoteTokenRef.current) {
          return;
        }
        setActiveNote(fullNote);
        setView("note");
      } catch (error) {
        if (token !== loadNoteTokenRef.current) {
          return;
        }
        toast.error("Couldn't open note", getErrorMessage(error));
        setSelectedId(activeNote?.id ?? null);
        if (error instanceof ApiError && error.status === 404) {
          void loadHistory({ silent: true });
        }
      } finally {
        if (token === loadNoteTokenRef.current) {
          setNoteLoading(false);
        }
      }
    },
    [activeNote?.id, loadHistory, toast, view],
  );

  const handleGenerate = useCallback(
    async (text: string, diagramType: DiagramType = "visual") => {
      setGenerating(true);
      try {
        const note = await notesApi.generateFromText(text, diagramType);
        recordNoteGenerationExposure();
        const historyItem: NoteHistoryItem = {
          id: note.id,
          sourceType: note.sourceType,
          title: note.title,
          createdAt: note.createdAt,
        };

        setNotes((current) => [
          historyItem,
          ...current.filter((item) => item.id !== note.id),
        ]);
        setActiveNote(note);
        setSelectedId(note.id);
        setView("note");
        setNoteLoading(false);
        toast.success(
          diagramType === "flowchart"
            ? "Flowchart note ready"
            : "Visual note ready",
          "Your summary and colorful diagram are ready to edit.",
        );
        void loadHistory({ silent: true });
      } catch (error) {
        toast.error("Couldn't generate note", getErrorMessage(error));
      } finally {
        setGenerating(false);
      }
    },
    [loadHistory, toast],
  );

  const handleSave = useCallback(
    async (payload: UpdateNotePayload): Promise<Note> => {
      if (!activeNote) {
        throw new Error("No note is currently open.");
      }

      const updated = await notesApi.updateNote(activeNote.id, payload);
      setActiveNote(updated);
      setNotes((current) =>
        current.map((item) =>
          item.id === updated.id
            ? {
                ...item,
                title: updated.title,
                sourceType: updated.sourceType,
                createdAt: updated.createdAt,
              }
            : item,
        ),
      );
      return updated;
    },
    [activeNote],
  );

  const handleDeleteRequest = useCallback((note: NoteHistoryItem) => {
    setDeleteTarget(note);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    try {
      await notesApi.deleteNote(deleteTarget.id);
      setNotes((current) =>
        current.filter((item) => item.id !== deleteTarget.id),
      );

      if (activeNote?.id === deleteTarget.id) {
        handleNewNote();
      }

      toast.success("Note deleted", `“${deleteTarget.title}” was removed.`);
      setDeleteTarget(null);
    } catch (error) {
      toast.error("Couldn't delete note", getErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  }, [activeNote?.id, deleteTarget, handleNewNote, toast]);

  return (
    <div className="flex h-dvh overflow-hidden bg-paper-50">
      <Sidebar
        notes={notes}
        activeId={selectedId}
        loading={historyLoading}
        error={historyError}
        open={sidebarOpen}
        userId={userId}
        onClose={() => setSidebarOpen(false)}
        onNewNote={handleNewNote}
        onSelectNote={(note) => void handleSelectNote(note)}
        onDeleteNote={handleDeleteRequest}
        onRetry={() => void loadHistory()}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar
          onOpenSidebar={() => setSidebarOpen(true)}
          onNewNote={handleNewNote}
        />

        <main className="relative min-h-0 flex-1">
          {noteLoading ? <WorkspaceSkeleton /> : null}

          {!noteLoading && view === "note" && activeNote ? (
            <Suspense fallback={<WorkspaceSkeleton />}>
              <NoteWorkspace
                key={activeNote.id}
                note={activeNote}
                onSave={handleSave}
                onOpenSidebar={() => setSidebarOpen(true)}
              />
            </Suspense>
          ) : null}

          {!noteLoading && (view === "new" || !activeNote) ? (
            <NewNoteView
              generating={generating}
              onGenerate={handleGenerate}
            />
          ) : null}
        </main>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this note?"
        description={
          deleteTarget
            ? `“${deleteTarget.title}” and its diagram will be permanently removed. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete note"
        tone="danger"
        loading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => {
          if (!deleting) {
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}