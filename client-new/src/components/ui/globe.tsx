/**
 * Interactive cobe globe — ported from cult-ui's globe (DESIGN.md §31), self-contained:
 * - NO showcase data file, no world cities: markers/arcs come in as props.
 * - next-themes / useTheme / the isDark branch removed; light palette hardcoded (§31.3).
 * - cobe 2 typings used directly (no `as never` casts).
 * - Instead of spinning the whole planet, it drifts gently around a focus point
 *   (India / Maharashtra), so our markers stay in view. Drag to rotate is a bonus, never required.
 * - The canvas is decorative (aria-hidden); the section around it carries the real text.
 *
 * Callers should lazy-load this file and show a static fallback on mobile / reduced motion (§31.5).
 */
import { useCallback, useEffect, useMemo, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import createGlobe from "cobe";
import { useInView } from "motion/react";
import { useReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type LatLng = [number, number];
export interface GlobeMarker { id: string; location: LatLng; label: string; labelSide?: "above" | "below" }
export interface GlobeArc { id: string; from: LatLng; to: LatLng }

// Palettes live in their own module so sections can choose one without loading cobe.
import { LIGHT_PALETTE, type GlobePalette } from "./globe-palettes";
export { LIGHT_PALETTE, DARK_PALETTE, type GlobePalette } from "./globe-palettes";

/** cobe convention: angles that put [lat, lng] in front of the camera. */
export function locationToAngles([lat, lng]: LatLng): [number, number] {
  return [Math.PI - ((lng * Math.PI) / 180 - Math.PI / 2), (lat * Math.PI) / 180];
}

// Labels ride on cobe's per-marker CSS anchors; only Chromium supports anchor positioning,
// so elsewhere we skip on-globe labels (the section shows a text legend instead).
const supportsAnchors = typeof CSS !== "undefined" && CSS.supports?.("anchor-name: --a");

function labelStyle(m: GlobeMarker): CSSProperties {
  const above = m.labelSide !== "below";
  return {
    position: "absolute",
    positionAnchor: `--cobe-${m.id}`,
    left: "anchor(center)",
    ...(above ? { bottom: "anchor(top)" } : { top: "anchor(bottom)" }),
    transform: `translate(-50%, calc(${above ? -1 : 1} * var(--space-2)))`,
    opacity: `var(--cobe-visible-${m.id}, 0)`,
    transition: "opacity var(--dur-base) var(--ease-out)",
  } as CSSProperties;
}

export function Globe({
  markers,
  arcs = [],
  focus,
  size = 480,
  className,
  palette = LIGHT_PALETTE,
  labelClassName = "border-border bg-surface text-accent-ink",
}: {
  /** cobe colours; LIGHT_PALETTE for beige grounds, DARK_PALETTE inside dark bands. */
  palette?: GlobePalette;
  /** Colour classes for the Nashik / Pune labels (border, background, text). */
  labelClassName?: string;
  markers: GlobeMarker[];
  arcs?: GlobeArc[];
  /** Point to face the camera; defaults to the first marker. */
  focus?: LatLng;
  /** CSS size in px (the canvas buffer is 2x for crispness). */
  size?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { margin: "120px" }); // RAF only runs while on screen
  const reduceMotion = useReducedMotion();

  const [basePhi, baseTheta] = useMemo(() => locationToAngles(focus ?? markers[0].location), [focus, markers]);
  const cobeMarkers = useMemo(() => markers.map((m) => ({ id: m.id, location: m.location, size: 0.05 })), [markers]);
  const cobeArcs = useMemo(() => arcs.map((a) => ({ id: a.id, from: a.from, to: a.to })), [arcs]);

  // drag state (refs: read inside the RAF loop without re-creating the globe)
  const drag = useRef<{ x: number; y: number } | null>(null);
  const dragDelta = useRef({ phi: 0, theta: 0 });
  const offset = useRef({ phi: 0, theta: 0 });

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLCanvasElement>) => {
    drag.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.style.cursor = "grabbing";
  }, []);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!drag.current) return;
      dragDelta.current = { phi: (e.clientX - drag.current.x) / 300, theta: (e.clientY - drag.current.y) / 1000 };
    };
    const up = () => {
      if (!drag.current) return;
      offset.current.phi += dragDelta.current.phi;
      offset.current.theta = Math.max(-0.4, Math.min(0.4, offset.current.theta + dragDelta.current.theta));
      dragDelta.current = { phi: 0, theta: 0 };
      drag.current = null;
      if (canvasRef.current) canvasRef.current.style.cursor = "grab";
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !inView) return;

    const buffer = size * 2;
    const globe = createGlobe(canvas, {
      devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      width: buffer,
      height: buffer,
      phi: basePhi,
      theta: baseTheta,
      diffuse: 1.5,
      mapSamples: 16000,
      markers: cobeMarkers,
      arcs: cobeArcs,
      arcWidth: 0.6,
      arcHeight: 0.08,
      markerElevation: 0.01,
      scale: 1,
      offset: [0, 0],
      ...palette,
    });

    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      // Gentle sway around the focus point instead of a full spin; frozen under reduced motion.
      const sway = reduceMotion ? 0 : Math.sin((t - start) / 6000) * 0.35;
      globe.update({
        phi: basePhi + sway + offset.current.phi + dragDelta.current.phi,
        theta: baseTheta + offset.current.theta + dragDelta.current.theta,
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => { cancelAnimationFrame(raf); globe.destroy(); };
  }, [inView, size, basePhi, baseTheta, cobeMarkers, cobeArcs, reduceMotion, palette]);

  return (
    <div ref={rootRef} className={cn("relative mx-auto aspect-square w-full", className)} style={{ maxWidth: size }}>
      <canvas
        ref={canvasRef}
        width={size * 2}
        height={size * 2}
        onPointerDown={onPointerDown}
        aria-hidden="true"
        className="block size-full cursor-grab touch-none"
        style={{ contain: "layout paint size" }}
      />
      {supportsAnchors &&
        markers.map((m) => (
          <span
            key={m.id}
            aria-hidden="true"
            style={labelStyle(m)}
            className={cn("pointer-events-none whitespace-nowrap rounded-control border px-2 py-0.5 text-small font-semibold shadow-sm", labelClassName)}
          >
            {m.label}
          </span>
        ))}
    </div>
  );
}

export default Globe;
