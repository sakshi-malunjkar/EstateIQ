import { AlertTriangle, Loader2 } from "lucide-react";

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-16 text-body text-ink-soft">
      <Loader2 size={18} strokeWidth={1.5} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
      {label}
    </div>
  );
}

export function LoadError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-card border border-negative bg-negative/10 p-4 flex flex-wrap items-center gap-3">
      <AlertTriangle size={18} strokeWidth={1.5} className="text-negative shrink-0" aria-hidden="true" />
      <p className="text-body text-ink flex-1 min-w-0">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="h-8 px-3 rounded-control border border-border bg-surface text-small font-medium hover:bg-surface-hover">
          Try again
        </button>
      )}
    </div>
  );
}
