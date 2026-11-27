import {
  ArrowRight,
  Atom,
  Code2,
  Download,
  FileUp,
  GitFork,
  LayoutGrid,
  Leaf,
  Loader2,
  LockKeyhole,
  Network,
  Sparkles,
  Type,
  Video,
  type LucideIcon,
} from "lucide-react";
import {
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import type { DiagramType } from "../../api/notesApi";
import { cn, formatCount } from "../../lib/utils";

const MAX_CHARS = 12_000;

type InputTab = "text" | "pdf" | "youtube";

interface TabConfig {
  id: InputTab;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  soon: boolean;
}

const TABS: TabConfig[] = [
  { id: "text", label: "Paste Text", shortLabel: "Text", icon: Type, soon: false },
  {
    id: "pdf",
    label: "PDF Upload",
    shortLabel: "PDF",
    icon: FileUp,
    soon: true,
  },
  {
    id: "youtube",
    label: "YouTube URL",
    shortLabel: "YouTube",
    icon: Video,
    soon: true,
  },
];

interface SampleTopic {
  label: string;
  icon: LucideIcon;
  text: string;
}

const SAMPLE_TOPICS: SampleTopic[] = [
  {
    label: "TCP 3-Way Handshake",
    icon: Network,
    text: `The TCP three-way handshake establishes a reliable connection between a client and a server before any application data is exchanged.

1. SYN — The client chooses an initial sequence number (ISN) and sends a SYN packet to the server, signalling that it wants to open a connection.
2. SYN-ACK — The server replies with its own SYN packet and acknowledges the client's ISN. The server also chooses its own ISN.
3. ACK — The client acknowledges the server's ISN. Both sides now have synchronised sequence numbers, and the connection is established.

The handshake prevents stale or duplicate connection requests from being mistaken for new ones and confirms that both endpoints are ready to communicate. After the handshake, TCP uses sequence numbers, cumulative acknowledgements, retransmission timers, and flow control to provide reliable, ordered delivery. Connections are closed with a separate four-way FIN/ACK exchange.`,
  },
  {
    label: "Photosynthesis",
    icon: Leaf,
    text: `Photosynthesis is the process by which plants, algae, and some bacteria convert light energy into chemical energy stored in glucose.

The light-dependent reactions take place in the thylakoid membranes of chloroplasts. Light excites electrons in chlorophyll, water is split through photolysis, oxygen is released, and ATP and NADPH are produced.

The Calvin cycle takes place in the stroma and does not require light directly. It uses ATP and NADPH to fix carbon dioxide into a three-carbon sugar, which is then used to build glucose and other carbohydrates.

Several factors affect the rate of photosynthesis: light intensity, carbon dioxide concentration, temperature, and the availability of water and chlorophyll. The overall equation is 6CO2 + 6H2O + light energy → C6H12O6 + 6O2.`,
  },
  {
    label: "React Rendering",
    icon: Code2,
    text: `React's rendering pipeline turns component code into pixels on the screen. A render is triggered when state changes, a parent re-renders, or a context value changes.

During the render phase, React calls component functions and builds a new tree of React elements. This phase must be pure: it should not mutate external state or cause side effects.

During the commit phase, React compares the new tree with the previous one (reconciliation), applies the minimal set of DOM mutations, and runs layout effects and passive effects. Keys help React match children between renders so it can preserve component state and avoid unnecessary DOM work.

Performance tools include memoising components with React.memo, stabilising callbacks with useCallback, memoising expensive values with useMemo, splitting code with lazy and Suspense, and keeping state local to the components that need it.`,
  },
];

interface NewNoteViewProps {
  generating: boolean;
  onGenerate: (text: string, diagramType: DiagramType) => Promise<void>;
}

function FeaturePill({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-paper-200 bg-white/70 px-2.5 py-1 text-[11px] font-medium text-ink-600 shadow-sm">
      <Icon aria-hidden="true" className="size-3 text-accent-500" />
      {children}
    </span>
  );
}

export function NewNoteView({ generating, onGenerate }: NewNoteViewProps) {
  const [activeTab, setActiveTab] = useState<InputTab>("text");
  const [diagramType, setDiagramType] = useState<DiagramType>("visual");
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const count = text.length;
  const nearLimit = count > MAX_CHARS * 0.9;
  const canSubmit = text.trim().length > 0 && !generating && count <= MAX_CHARS;

  const handleSample = (sample: SampleTopic) => {
    setActiveTab("text");
    setText(sample.text);
    window.setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(
        sample.text.length,
        sample.text.length,
      );
    }, 30);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    void onGenerate(text.trim(), diagramType);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      if (canSubmit) {
        void onGenerate(text.trim(), diagramType);
      }
    }
  };

  const activeTabConfig = TABS.find((tab) => tab.id === activeTab) ?? TABS[0];

  return (
    <div className="relative h-full overflow-y-auto">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-accent-100/50 blur-3xl" />
        <div className="absolute -bottom-24 right-0 size-72 rounded-full bg-[#d9f5e5]/40 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-3xl px-4 pb-12 pt-10 sm:px-6 sm:pt-14 lg:pt-16">
        <div className="animate-rise-in">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent-200/70 bg-accent-50/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-700">
            <Sparkles aria-hidden="true" className="size-3" />
            AI study workspace
          </div>

          <h1 className="mt-5 max-w-2xl font-display text-[2.45rem] font-semibold leading-[1.08] tracking-[-0.03em] text-ink-950 sm:text-5xl">
            Turn raw notes into a{" "}
            <span className="relative whitespace-nowrap text-accent-600">
              visual map
              <svg
                aria-hidden="true"
                viewBox="0 0 200 12"
                className="absolute -bottom-1 left-0 h-2.5 w-full text-accent-300"
                preserveAspectRatio="none"
              >
                <path
                  d="M2 8.5C46 3.5 104 2.5 198 7.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            .
          </h1>

          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-600">
            Paste a lecture transcript, article, or textbook passage. NoteMap
            distils the key ideas into a clean summary and a colorful diagram
            you can rearrange, recolor, and export.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <FeaturePill icon={Sparkles}>AI summary</FeaturePill>
            <FeaturePill icon={Network}>Editable diagram</FeaturePill>
            <FeaturePill icon={Download}>PDF export</FeaturePill>
          </div>
        </div>

        <div className="mt-8 animate-rise-in [animation-delay:80ms]">
          <div className="overflow-hidden rounded-2xl border border-paper-200 bg-white shadow-panel">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper-200 bg-paper-50/70 px-3 py-2.5 sm:px-4">
              <div
                role="tablist"
                aria-label="Study material input"
                className="flex flex-wrap items-center gap-1 rounded-xl bg-paper-200/50 p-1"
              >
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const active = tab.id === activeTab;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition sm:px-3",
                        active
                          ? "bg-white text-ink-900 shadow-sm ring-1 ring-paper-200"
                          : "text-ink-500 hover:bg-white/60 hover:text-ink-700",
                      )}
                    >
                      <Icon
                        aria-hidden="true"
                        className={cn(
                          "size-3.5",
                          active ? "text-accent-600" : "text-ink-400",
                        )}
                      />
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">{tab.shortLabel}</span>
                      {tab.soon ? (
                        <span className="ml-0.5 rounded bg-paper-100 px-1 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-ink-400 ring-1 ring-inset ring-paper-300/70">
                          Soon
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <span className="hidden items-center gap-1.5 pr-1 text-[10px] font-medium text-ink-400 sm:inline-flex">
                <LockKeyhole aria-hidden="true" className="size-3" />
                Private to this browser
              </span>
            </div>

            {activeTab === "text" ? (
              <form onSubmit={handleSubmit}>
                <div className="p-3 sm:p-4">
                  <label htmlFor="study-material" className="sr-only">
                    Study material
                  </label>
                  <div className="relative rounded-xl border border-paper-200 bg-paper-50/50 transition focus-within:border-accent-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-accent-100/60">
                    <textarea
                      ref={textareaRef}
                      id="study-material"
                      value={text}
                      onChange={(event) => setText(event.target.value)}
                      onKeyDown={handleKeyDown}
                      maxLength={MAX_CHARS}
                      placeholder={`Paste your study material here…\n\nFor example: lecture notes, a textbook section, an article, or a transcript. The more specific the material, the better the summary and diagram.`}
                      className="scrollbar-thin block h-[248px] w-full resize-y bg-transparent px-4 py-3.5 text-[13.5px] leading-relaxed text-ink-800 outline-none placeholder:text-ink-400 sm:h-[272px] sm:text-sm"
                      disabled={generating}
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 rounded-b-xl bg-gradient-to-t from-paper-50/80 to-transparent" />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                        Try a sample
                      </span>
                      {SAMPLE_TOPICS.map((sample) => {
                        const Icon = sample.icon;
                        return (
                          <button
                            key={sample.label}
                            type="button"
                            onClick={() => handleSample(sample)}
                            disabled={generating}
                            className="inline-flex items-center gap-1.5 rounded-full border border-paper-200 bg-white px-2.5 py-1 text-[11px] font-medium text-ink-600 shadow-sm transition hover:border-accent-200 hover:bg-accent-50/60 hover:text-accent-700 disabled:opacity-50"
                          >
                            <Icon
                              aria-hidden="true"
                              className="size-3 text-accent-500"
                            />
                            {sample.label}
                          </button>
                        );
                      })}
                    </div>

                    <div
                      role="group"
                      aria-label="Diagram style"
                      className="inline-flex items-center gap-1 rounded-xl border border-paper-200 bg-paper-50 p-1"
                    >
                      <button
                        type="button"
                        onClick={() => setDiagramType("visual")}
                        disabled={generating}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition disabled:opacity-50",
                          diagramType === "visual"
                            ? "bg-white text-accent-700 shadow-sm ring-1 ring-paper-200"
                            : "text-ink-500 hover:text-ink-800",
                        )}
                      >
                        <LayoutGrid
                          aria-hidden="true"
                          className="size-3.5"
                        />
                        Visual Board
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiagramType("flowchart")}
                        disabled={generating}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition disabled:opacity-50",
                          diagramType === "flowchart"
                            ? "bg-white text-accent-700 shadow-sm ring-1 ring-paper-200"
                            : "text-ink-500 hover:text-ink-800",
                        )}
                      >
                        <GitFork aria-hidden="true" className="size-3.5" />
                        Flowchart
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-paper-200 bg-paper-50/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "font-mono text-[10px] tabular-nums",
                        nearLimit ? "text-warning-700" : "text-ink-400",
                      )}
                    >
                      {formatCount(count)} / 12,000
                    </span>
                    <span className="hidden text-[10px] text-ink-400 sm:inline">
                      {count === 0
                        ? "Paste text to begin"
                        : count >= MAX_CHARS
                          ? "Character limit reached"
                          : "Ready to map"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="hidden text-[10px] text-ink-400 md:inline">
                      <kbd className="rounded border border-paper-300 bg-white px-1 py-0.5 font-sans text-[9px] font-semibold text-ink-500">
                        Ctrl
                      </kbd>
                      <span className="mx-0.5">+</span>
                      <kbd className="rounded border border-paper-300 bg-white px-1 py-0.5 font-sans text-[9px] font-semibold text-ink-500">
                        Enter
                      </kbd>
                    </span>
                    <button
                      type="submit"
                      disabled={!canSubmit}
                      aria-busy={generating}
                      className="group inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-accent-600 px-4 text-[13px] font-semibold text-white shadow-[0_10px_22px_-12px_rgba(91,62,230,0.95)] transition hover:bg-accent-700 active:scale-[0.99] disabled:bg-ink-300 disabled:shadow-none sm:w-auto"
                    >
                      {generating ? (
                        <>
                          <Loader2
                            aria-hidden="true"
                            className="size-4 animate-spin"
                          />
                          Generating…
                        </>
                      ) : (
                        <>
                          <Sparkles aria-hidden="true" className="size-4" />
                          {diagramType === "flowchart"
                            ? "Generate Flowchart"
                            : "Generate Visual Note"}
                          <ArrowRight
                            aria-hidden="true"
                            className="size-3.5 transition-transform group-hover:translate-x-0.5"
                          />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="animate-fade-in p-8 text-center sm:p-12">
                <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 ring-1 ring-accent-100">
                  <activeTabConfig.icon
                    aria-hidden="true"
                    className="size-6"
                  />
                </span>
                <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink-950">
                  {activeTabConfig.label} is coming soon
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-600">
                  This input mode is already wired into the workspace and will
                  connect to the NoteMap API as soon as the endpoint is ready.
                  For now, paste the text from your source to get the same
                  summary and diagram.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("text")}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-700"
                >
                  <Type aria-hidden="true" className="size-4" />
                  Paste text instead
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex items-start gap-2 rounded-xl border border-paper-200/80 bg-white/50 px-3.5 py-3 text-[11px] leading-relaxed text-ink-500">
          <Atom
            aria-hidden="true"
            className="mt-0.5 size-3.5 shrink-0 text-accent-500"
          />
          <p>
            NoteMap generates a visual board or Mermaid diagram from your
            material, then converts it into an editable Excalidraw canvas.
            Nothing is shared publicly — your notes stay tied to this anonymous
            browser identity.
          </p>
        </div>
      </div>
    </div>
  );
}