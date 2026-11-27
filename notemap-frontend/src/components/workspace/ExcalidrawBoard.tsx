import "@excalidraw/excalidraw/index.css";

import {
  CaptureUpdateAction,
  Excalidraw,
  getSceneVersion,
} from "@excalidraw/excalidraw";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";
import {
  AlertCircle,
  Loader2,
  Maximize2,
  RotateCcw,
  Sparkles,
  Wand2,
} from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { mermaidToScene, parseSavedScene } from "../../lib/excalidrawScene";
import { cn, getErrorMessage } from "../../lib/utils";
import {
  buildExcalidrawVisualNote,
  type VisualDiagramSpec,
} from "../../lib/visualNoteToExcalidraw";
import type { Note } from "../../types/note";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { useToast } from "../ui/ToastProvider";

export interface ExcalidrawBoardHandle {
  getSceneElements: () => readonly ExcalidrawElement[];
  getSceneJson: () => string;
  getExportData: () => {
    elements: readonly ExcalidrawElement[];
    appState: AppState;
    files: BinaryFiles;
  } | null;
  isReady: () => boolean;
  resetDiagram: () => Promise<boolean>;
  fitToContent: () => void;
  markClean: () => void;
}

interface ExcalidrawBoardProps {
  note: Note;
  onDirty: () => void;
}

type BoardStatus = "loading" | "ready" | "error";
type SceneSource = "saved" | "mermaid" | "visual" | null;

function fitScene(api: ExcalidrawImperativeAPI) {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const elements = api.getSceneElements();
      if (elements.length > 0) {
        api.scrollToContent(elements, {
          fitToContent: true,
          animate: false,
        });
      }
    });
  });
}

export const ExcalidrawBoard = forwardRef<
  ExcalidrawBoardHandle,
  ExcalidrawBoardProps
>(function ExcalidrawBoard({ note, onDirty }, ref) {
  const toast = useToast();
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const [status, setStatus] = useState<BoardStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [source, setSource] = useState<SceneSource>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const noteRef = useRef(note);
  noteRef.current = note;

  const onDirtyRef = useRef(onDirty);
  onDirtyRef.current = onDirty;

  const loadingRef = useRef(true);
  const loadTokenRef = useRef(0);
  const lastVersionRef = useRef(0);
  const statusRef = useRef<BoardStatus>("loading");

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const loadScene = useCallback(
    async (mode: "auto" | "fresh"): Promise<boolean> => {
      const currentApi = apiRef.current;
      if (!currentApi) {
        return false;
      }

      const token = loadTokenRef.current + 1;
      loadTokenRef.current = token;
      loadingRef.current = true;
      setStatus("loading");
      setErrorMessage(null);

      const currentNote = noteRef.current;

      try {
        let scene:
          | {
              elements: ExcalidrawElement[];
              files: BinaryFiles | null;
            }
          | null = null;

        // Only use saved Excalidraw JSON if it contains visible elements
        if (mode === "auto") {
          const savedScene = parseSavedScene(currentNote.excalidrawJson);
          if (
            savedScene &&
            savedScene.elements.some((el) => !el.isDeleted)
          ) {
            scene = savedScene;
            setSource("saved");
          }
        }

        // Otherwise build from VisualDiagramSpec JSON or Mermaid fallback
        if (!scene) {
          const trimmedMermaid = currentNote.mermaidCode.trim();

          if (trimmedMermaid.startsWith("{")) {
            try {
              const spec: VisualDiagramSpec = JSON.parse(trimmedMermaid);
              scene = {
                elements: buildExcalidrawVisualNote(spec),
                files: null,
              };
              setSource("visual");
            } catch {
              // Falls through to Mermaid fallback below
            }
          }

          if (!scene) {
            if (!trimmedMermaid) {
              throw new Error(
                "This note does not include diagram source yet. Try saving it again from the source note.",
              );
            }

            scene = await mermaidToScene(currentNote.mermaidCode);
            setSource("mermaid");
          }
        }

        // Wait for Excalidraw's internal mount initialization to complete
        // so it does not overwrite synchronous visual scenes with an empty canvas
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, 120);
        });

        if (token !== loadTokenRef.current) {
          return false;
        }

        if (scene.files) {
          currentApi.addFiles(Object.values(scene.files));
        }

        currentApi.updateScene({
          elements: scene.elements,
          appState: { viewBackgroundColor: "#ffffff" },
          captureUpdate: CaptureUpdateAction.NEVER,
        });

        try {
          currentApi.history.clear();
        } catch {
          // Clearing history is a convenience; never let it block the scene.
        }

        lastVersionRef.current = getSceneVersion(scene.elements);

        window.setTimeout(() => {
          if (token !== loadTokenRef.current) {
            return;
          }
          fitScene(currentApi);
          loadingRef.current = false;
          setStatus("ready");
        }, 90);

        return true;
      } catch (error) {
        if (token !== loadTokenRef.current) {
          return false;
        }
        loadingRef.current = false;
        setStatus("error");
        setErrorMessage(getErrorMessage(error));
        return false;
      }
    },
    [],
  );

  useEffect(() => {
    if (!api) {
      return;
    }

    void loadScene("auto");

    return () => {
      loadTokenRef.current += 1;
    };
  }, [api, loadScene, note.id]);

  const handleApi = useCallback((nextApi: ExcalidrawImperativeAPI) => {
    apiRef.current = nextApi;
    setApi(nextApi);
  }, []);

  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[]) => {
      if (loadingRef.current) {
        return;
      }

      const version = getSceneVersion(elements);
      if (version !== lastVersionRef.current) {
        lastVersionRef.current = version;
        onDirtyRef.current();
      }
    },
    [],
  );

  const fitToContent = useCallback(() => {
    const currentApi = apiRef.current;
    if (currentApi) {
      fitScene(currentApi);
    }
  }, []);

  const markClean = useCallback(() => {
    const currentApi = apiRef.current;
    if (currentApi) {
      lastVersionRef.current = getSceneVersion(currentApi.getSceneElements());
    }
  }, []);

  const performReset = useCallback(async (): Promise<boolean> => {
    const success = await loadScene("fresh");
    if (success) {
      onDirtyRef.current();
      toast.info(
        "Diagram reset",
        "The original AI layout has been restored. Save changes to keep it.",
      );
    }
    return success;
  }, [loadScene, toast]);

  useImperativeHandle(
    ref,
    () => ({
      getSceneElements: () => apiRef.current?.getSceneElements() ?? [],
      getSceneJson: () =>
        JSON.stringify({
          elements: apiRef.current?.getSceneElements() ?? [],
        }),
      getExportData: () => {
        const currentApi = apiRef.current;
        if (!currentApi) {
          return null;
        }
        return {
          elements: currentApi.getSceneElements(),
          appState: currentApi.getAppState(),
          files: currentApi.getFiles(),
        };
      },
      isReady: () =>
        statusRef.current === "ready" && apiRef.current !== null,
      resetDiagram: performReset,
      fitToContent,
      markClean,
    }),
    [fitToContent, markClean, performReset],
  );

  const sourceLabel =
    source === "saved" ? "Saved edits" : source === "mermaid" ? "AI diagram" : "Diagram";

  return (
    <div className="excalidraw-board relative h-full w-full overflow-hidden bg-white">
      <Excalidraw
        excalidrawAPI={handleApi}
        initialData={{
          appState: {
            viewBackgroundColor: "#ffffff",
            currentItemStrokeColor: "#1e1e1e",
          },
        }}
        theme="light"
        langCode="en"
        name={`NoteMap note ${note.id}`}
        autoFocus={false}
        handleKeyboardGlobally={false}
        onChange={handleChange}
        UIOptions={{
          canvasActions: {
            changeViewBackgroundColor: false,
            clearCanvas: true,
            export: false,
            loadScene: false,
            saveAsImage: true,
            saveToActiveFile: false,
            toggleTheme: false,
          },
        }}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-3">
        <div className="pointer-events-auto flex max-w-full items-center gap-1 rounded-full border border-paper-200 bg-white/95 p-1 shadow-float backdrop-blur-md">
          <span className="hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold text-ink-500 sm:inline-flex">
            <Sparkles
              aria-hidden="true"
              className={cn(
                "size-3",
                source === "saved" ? "text-success-500" : "text-accent-500",
              )}
            />
            {sourceLabel}
          </span>
          <span
            aria-hidden="true"
            className="mx-0.5 hidden h-4 w-px bg-paper-200 sm:block"
          />
          <button
            type="button"
            onClick={() => setResetDialogOpen(true)}
            disabled={status === "loading"}
            title="Rebuild the original AI diagram"
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-ink-600 transition hover:bg-paper-100 hover:text-ink-900 disabled:opacity-40"
          >
            <RotateCcw aria-hidden="true" className="size-3.5" />
            <span className="hidden sm:inline">Reset diagram</span>
            <span className="sm:hidden">Reset</span>
          </button>
          <span aria-hidden="true" className="h-4 w-px bg-paper-200" />
          <button
            type="button"
            onClick={fitToContent}
            disabled={status !== "ready"}
            title="Fit diagram to view"
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-ink-600 transition hover:bg-paper-100 hover:text-ink-900 disabled:opacity-40"
          >
            <Maximize2 aria-hidden="true" className="size-3.5" />
            <span className="hidden sm:inline">Fit</span>
          </button>
        </div>
      </div>

      {status === "loading" ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/78 p-6 backdrop-blur-[3px]">
          <div className="flex flex-col items-center text-center">
            <span className="relative flex size-14 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 ring-1 ring-accent-100">
              <Wand2 aria-hidden="true" className="size-6" />
              <span className="absolute -inset-1 animate-ping rounded-2xl border border-accent-200/60" />
            </span>
            <p className="mt-4 font-display text-xl font-semibold tracking-tight text-ink-950">
              Building your canvas
            </p>
            <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-ink-500">
              Restoring saved edits or turning the Mermaid outline into
              editable Excalidraw shapes.
            </p>
            <Loader2
              aria-hidden="true"
              className="mt-4 size-4 animate-spin text-accent-500"
            />
          </div>
        </div>
      ) : null}

      {status === "error" ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/88 p-6 backdrop-blur-[3px]">
          <div className="max-w-sm text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-danger-50 text-danger-500 ring-1 ring-danger-500/15">
              <AlertCircle aria-hidden="true" className="size-5" />
            </span>
            <p className="mt-3.5 font-display text-xl font-semibold tracking-tight text-ink-950">
              Couldn&apos;t build the diagram
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-600">
              {errorMessage ??
                "The diagram source could not be converted. Try again or reset the diagram."}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => void loadScene("auto")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-accent-700"
              >
                <RotateCcw aria-hidden="true" className="size-3.5" />
                Try again
              </button>
              <button
                type="button"
                onClick={() => void performReset()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-paper-300 bg-white px-3.5 py-2 text-xs font-semibold text-ink-700 transition hover:bg-paper-50"
              >
                <Wand2 aria-hidden="true" className="size-3.5" />
                Rebuild from Mermaid
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={resetDialogOpen}
        title="Reset the diagram?"
        description="This replaces the current canvas with a fresh copy of the original AI diagram. Any manual edits — moved nodes, colors, and annotations — will be lost."
        confirmLabel="Reset diagram"
        tone="danger"
        onConfirm={() => {
          setResetDialogOpen(false);
          void performReset();
        }}
        onCancel={() => setResetDialogOpen(false)}
      />
    </div>
  );
});