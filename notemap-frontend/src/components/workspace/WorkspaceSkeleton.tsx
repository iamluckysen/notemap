export function WorkspaceSkeleton() {
  return (
    <div
      className="flex h-full min-h-0 flex-col bg-paper-50"
      aria-busy="true"
      aria-label="Loading note"
    >
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-paper-200 bg-white px-4 py-3 sm:px-6">
        <div className="min-w-0 flex-1">
          <div className="h-5 w-2/5 animate-pulse rounded bg-paper-200" />
          <div className="mt-2.5 flex gap-2">
            <div className="h-3.5 w-12 animate-pulse rounded bg-paper-200" />
            <div className="h-3.5 w-24 animate-pulse rounded bg-paper-200" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 animate-pulse rounded-lg bg-paper-200" />
          <div className="hidden h-9 w-24 animate-pulse rounded-lg bg-paper-200 sm:block" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 lg:flex-row">
        <div className="h-56 shrink-0 animate-pulse rounded-2xl border border-paper-200 bg-white lg:h-auto lg:w-[35%]" />
        <div className="min-h-0 flex-1 animate-pulse rounded-2xl border border-paper-200 bg-white" />
      </div>
    </div>
  );
}
