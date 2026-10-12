/**
 * EstateIQ mark + wordmark (§28): a house outline whose roof doubles as a sound wave —
 * "property" + "call". 1.5 stroke to match the icon language. Inherits currentColor so it
 * works on beige (ink) and on dark bands (white).
 */
export function BrandMark({ wordmark = true, className = "" }: { wordmark?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 11.5 12 5l8 6.5" />
        <path d="M6 10v9h12v-9" />
        <path d="M10 15.5c.6-.7.6-1.8 0-2.5M12.5 17c1.4-1.5 1.4-4.5 0-6" />
      </svg>
      {wordmark && (
        <span className="font-display font-semibold text-h3 tracking-tight">
          Estate<span className="text-accent-ink">IQ</span>
        </span>
      )}
    </span>
  );
}
