import { lazy, Suspense, useEffect, useState } from "react";
import { useReducedMotion } from "@/lib/motion";
import type { GlobeArc, GlobeMarker } from "@/components/ui/globe";
// Palette constants only — the globe component + cobe stay in their own lazy chunk.
import { DARK_PALETTE } from "@/components/ui/globe-palettes";
import { useCatalog } from "@/api/catalog";
import { CityPill } from "@/components/CityPill";
import { useInView } from "./useInView";

/**
 * "Serving Nashik & Pune" (DESIGN.md §31) — its own calm section below the hero, not in it.
 * A branding flourish showing WHERE we operate, not a project finder: only two markers, one arc.
 * The projects stay in the grid further down (§31.1).
 *
 * Perf (§31.5): this file is lazy-loaded by Landing; the WebGL globe (+ cobe) is a further lazy
 * chunk that only loads on desktop without reduced motion, and only once the section is near view.
 * Everyone else gets a static CSS disc.
 */
const Globe = lazy(() => import("@/components/ui/globe"));

const MARKERS: GlobeMarker[] = [
  { id: "nashik", location: [20.0, 73.78], label: "Nashik", labelSide: "above" },
  { id: "pune", location: [18.52, 73.86], label: "Pune", labelSide: "below" },
];
const ARCS: GlobeArc[] = [{ id: "nashik-pune", from: [20.0, 73.78], to: [18.52, 73.86] }];
const FOCUS: [number, number] = [19.3, 73.8]; // between the two cities

/** WebGL can be off (old devices, blocked GPU, some VMs) — then the canvas would stay blank. */
function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function useIsMobile() {
  const query = "(max-width: 639px)";
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMobile(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return mobile;
}

/** Static fallback: a soft disc with the two cities. No WebGL, no motion. */
function StaticGlobe() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-xs" aria-hidden="true">
      {/* dark-ground version: warm graphite sphere with a soft amber halo, matching DARK_PALETTE */}
      <div className="absolute inset-0 rounded-pill bg-gradient-to-br from-accent/25 via-ink-soft/40 to-bg border border-ink/10 shadow-lg" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-small font-semibold text-accent-ink">
          <span className="w-2.5 h-2.5 rounded-pill bg-accent" /> Nashik
        </span>
        <span className="h-8 w-px border-l border-dashed border-accent/60" />
        <span className="inline-flex items-center gap-1.5 text-small font-semibold text-accent-ink">
          <span className="w-2.5 h-2.5 rounded-pill bg-accent" /> Pune
        </span>
      </div>
    </div>
  );
}

export default function GlobeSection() {
  const mobile = useIsMobile();
  const reduce = useReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>(0.01); // start loading cobe as it nears view
  const [webgl] = useState(hasWebGL);
  const live = !mobile && !reduce && webgl;

  const { projects } = useCatalog();
  const nashik = projects.filter((p) => p.city === "Nashik").length;
  const pune = projects.filter((p) => p.city === "Pune").length;

  return (
    // Dark band (§5.3 beige → dark rhythm), same shape as the "Never miss a lead" band.
    // data-nav-theme flips the floating navbar to its dark style while it's over this section.
    <section
      aria-labelledby="where-title"
      data-nav-theme="dark" data-theme="dark"
      className="mx-2 md:mx-4 rounded-card bg-bg text-ink px-4 py-20 md:py-28"
    >
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 items-center gap-10 md:gap-16">
        <div className="text-center md:text-left order-2 md:order-1">
          <p className="text-small uppercase tracking-widest text-ink-muted">Where we are</p>
          <h2 id="where-title" className="mt-3 font-display font-normal text-h1 md:text-display text-ink">
            Serving <em className="text-accent-ink">Nashik</em> &amp; Pune
          </h2>
          <p className="mt-4 text-body text-ink-soft max-w-md mx-auto md:mx-0">
            Two cities in Maharashtra, one team. Every call is matched against real homes in our projects here.
          </p>
          {/* text legend — the real information; the globe is decoration */}
          <ul className="mt-6 flex flex-wrap justify-center md:justify-start gap-3">
            <li className="inline-flex items-center gap-2 text-body text-ink"><CityPill city="Nashik" /> {nashik} projects</li>
            <li className="inline-flex items-center gap-2 text-body text-ink"><CityPill city="Pune" /> {pune} projects</li>
          </ul>
          <a href="#projects" className="inline-block mt-6 text-body font-semibold text-ink underline underline-offset-4 decoration-accent hover:text-accent-ink transition-colors">
            Browse all projects
          </a>
        </div>

        <div ref={ref} className="order-1 md:order-2">
          {live && inView ? (
            <Suspense fallback={<StaticGlobe />}>
              <Globe
                markers={MARKERS}
                arcs={ARCS}
                focus={FOCUS}
                size={440}
                palette={DARK_PALETTE}
                labelClassName="border-accent/40 bg-bg/80 text-accent-ink backdrop-blur"
              />
            </Suspense>
          ) : (
            <StaticGlobe />
          )}
        </div>
      </div>
    </section>
  );
}
