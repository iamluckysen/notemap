import {
  BookOpen,
  Eye,
  FileText,
  PanelLeftClose,
  PencilLine,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import Markdown from "react-markdown";
import { cn } from "../../lib/utils";

interface SummaryPaneProps {
  summary: string;
  onChange: (value: string) => void;
  onCollapse: () => void;
}

type SummaryMode = "preview" | "edit";

function countWords(value: string): number {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

export function SummaryPane({
  summary,
  onChange,
  onCollapse,
}: SummaryPaneProps) {
  const [mode, setMode] = useState<SummaryMode>("preview");
  const words = countWords(summary);

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-paper-200 px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-accent-50 text-accent-600 ring-1 ring-accent-100">
            <BookOpen aria-hidden="true" className="size-3.5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-[13px] font-semibold text-ink-900">
                Study summary
              </h2>
              <Sparkles
                aria-hidden="true"
                className="size-3 text-accent-400"
              />
            </div>
            <p className="text-[10px] text-ink-400">
              {words} {words === 1 ? "word" : "words"} · Markdown
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 rounded-lg bg-paper-100 p-0.5">
            <button
              type="button"
              onClick={() => setMode("preview")}
              aria-pressed={mode === "preview"}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition",
                mode === "preview"
                  ? "bg-white text-ink-800 shadow-sm ring-1 ring-paper-200"
                  : "text-ink-500 hover:text-ink-700",
              )}
            >
              <Eye aria-hidden="true" className="size-3" />
              Preview
            </button>
            <button
              type="button"
              onClick={() => setMode("edit")}
              aria-pressed={mode === "edit"}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition",
                mode === "edit"
                  ? "bg-white text-ink-800 shadow-sm ring-1 ring-paper-200"
                  : "text-ink-500 hover:text-ink-700",
              )}
            >
              <PencilLine aria-hidden="true" className="size-3" />
              Edit
            </button>
          </div>
          <button
            type="button"
            onClick={onCollapse}
            title="Collapse summary"
            aria-label="Collapse summary pane"
            className="rounded-md p-1.5 text-ink-400 transition hover:bg-paper-100 hover:text-ink-700"
          >
            <PanelLeftClose aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {mode === "preview" ? (
          <div className="scrollbar-thin h-full overflow-y-auto px-5 py-5">
            {summary.trim() ? (
              <article className="markdown-body animate-fade-in">
                <Markdown
                  components={{
                    a: ({ href, children }) => (
                      <a href={href} target="_blank" rel="noreferrer">
                        {children}
                      </a>
                    ),
                  }}
                >
                  {summary}
                </Markdown>
              </article>
            ) : (
              <div className="flex h-full flex-col items-center justify-center py-10 text-center">
                <span className="flex size-11 items-center justify-center rounded-full bg-paper-100 text-ink-400">
                  <FileText aria-hidden="true" className="size-5" />
                </span>
                <p className="mt-3 text-sm font-semibold text-ink-700">
                  No summary yet
                </p>
                <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-ink-500">
                  Add your own notes or key takeaways in the edit tab.
                </p>
                <button
                  type="button"
                  onClick={() => setMode("edit")}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-paper-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-ink-700 shadow-sm transition hover:bg-paper-50"
                >
                  <PencilLine aria-hidden="true" className="size-3" />
                  Write summary
                </button>
              </div>
            )}
          </div>
        ) : (
          <textarea
            value={summary}
            onChange={(event) => onChange(event.target.value)}
            aria-label="Edit study summary"
            placeholder="Write a concise summary of the material…"
            spellCheck
            className="scrollbar-thin h-full w-full resize-none border-0 bg-white px-5 py-5 font-sans text-sm leading-relaxed text-ink-700 outline-none placeholder:text-ink-400 focus:ring-0"
          />
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-paper-200 bg-paper-50/60 px-4 py-2">
        <span className="text-[10px] text-ink-400">
          {mode === "preview"
            ? "Rendered with Markdown"
            : "Markdown formatting supported"}
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-ink-400">
          <Sparkles aria-hidden="true" className="size-2.5 text-accent-400" />
          Save Changes to keep edits
        </span>
      </div>
    </div>
  );
}
