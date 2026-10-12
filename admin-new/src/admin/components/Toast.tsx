import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

/**
 * Small success toast (§22): bottom-right, polite live region, auto-dismiss after 3s,
 * closable. One at a time — a new message replaces the old one.
 */
export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number>();
  const show = useCallback((m: string) => {
    setMsg(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 3000);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const node = (
    <div aria-live="polite" role="status" className="fixed bottom-4 right-4 z-toast">
      {msg && (
        <div className="eq-risein flex items-center gap-2.5 pl-3 pr-1.5 h-11 rounded-control border border-border bg-surface text-ink shadow-md">
          <CheckCircle2 size={18} strokeWidth={1.5} className="text-positive" aria-hidden="true" />
          <span className="text-body">{msg}</span>
          <button type="button" onClick={() => setMsg(null)} aria-label="Dismiss" className="h-8 w-8 grid place-items-center rounded-control text-ink-soft hover:text-ink">
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
      )}
    </div>
  );
  return { show, node };
}
