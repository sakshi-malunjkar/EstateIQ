import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge our token font sizes (tailwind.config fontSize), otherwise it reads
// `text-body` as a colour and drops it when merged with `text-ink`.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["display", "display-lg", "h1", "h2", "h3", "body", "small", "kpi"] }],
    },
  },
});

/** shadcn's class helper: conditional classes + Tailwind conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
