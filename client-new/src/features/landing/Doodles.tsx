/**
 * Hand-drawn-style doodle. Decorative only (aria-hidden).
 * `pathLength=1` lets .eq-draw animate the stroke from 0 -> full.
 */
/** Hand-drawn arrow that draws itself when its parent gets .is-visible (#5). */
export function ArrowDoodle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 90 60" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" className={className} aria-hidden="true">
      <path pathLength={1} className="eq-draw" d="M6 8c18 2 46 6 62 36" />
      <path pathLength={1} className="eq-draw" d="m58 40 10 6 4-12" />
    </svg>
  );
}
