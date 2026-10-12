import type { City } from "@/api/types";

export function CityPill({ city }: { city: City | string }) {
  return (
    <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-pill bg-surface border border-border text-small text-ink-soft">
      <span className="w-1.5 h-1.5 rounded-pill bg-cold" />
      {city}
    </span>
  );
}
