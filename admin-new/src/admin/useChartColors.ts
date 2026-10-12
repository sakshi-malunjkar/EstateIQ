import { useEffect, useState } from "react";

const TOKENS = ["ink", "ink-soft", "ink-muted", "border", "surface", "accent", "accent-ink", "cold", "hot", "warm", "positive", "neutral", "negative"] as const;
type Token = (typeof TOKENS)[number];
export type ChartColors = Record<Token, string>;

const read = (): ChartColors => {
  const cs = getComputedStyle(document.documentElement);
  return Object.fromEntries(TOKENS.map((t) => [t, `rgb(${cs.getPropertyValue(`--${t}`).trim()})`])) as ChartColors;
};

/**
 * Recharts writes colours as SVG attributes, where CSS var() doesn't resolve — so read the
 * resolved token values and re-read whenever the theme (data-theme on <html>) flips.
 */
export function useChartColors(): ChartColors {
  const [c, setC] = useState<ChartColors>(read);
  useEffect(() => {
    const mo = new MutationObserver(() => setC(read()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);
  return c;
}
