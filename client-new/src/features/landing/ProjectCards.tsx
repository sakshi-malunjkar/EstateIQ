import { useState, type CSSProperties } from "react";
import { ArrowRight, Building2, Check, IndianRupee, MapPin, Phone } from "lucide-react";
import type { Project } from "@/api/types";
import { projectImage, projectView, useCatalog } from "@/api/catalog";
import { PropertyCard } from "@/components/PropertyCard";
import { Button } from "@/components/Button";
import { CityPill } from "@/components/CityPill";
import {
  CutoutCard,
  CutoutCardContent,
  CutoutCardFooter,
  CutoutCardImage,
  CutoutCardInsetLabel,
  CutoutCardMedia,
  CutoutCardOverlay,
  CutoutCardPin,
  CutoutCorner,
  cutoutCardSurfaceClassName,
} from "@/components/ui/cutout-card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useInView } from "./useInView";

/**
 * "Our projects" (DESIGN.md §9 item 3, §8 Project card, §10.5): a grid of CutoutCards, one per
 * project, each opening a detail dialog. Data comes from the API (GET /projects, GET /properties), so the
 * grid always agrees with the hero, stats, globe and footer.
 * Images: public/images/<slug>.jpg placeholders — replace with real photos, same file names.
 */

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
/** Admin-set cover image (shared catalog), else the placeholder by name. */
const imageFor = (p: Project) => projectImage(p) || `/images/${slug(p.name)}.jpg`;
const altFor = (p: Project) => `${p.name}, a residential project in ${p.locality}, ${p.city}`;

/** Short pin text for the card corner. */
const PIN: Record<Project["status"], string> = {
  "New launch": "New",
  "Ready to move": "Ready to move",
  "Under construction": "Under construction",
};

/** "2–4 BHK" -> ["2 BHK", "3 BHK", "4 BHK"]; "2 BHK" -> ["2 BHK"]. */
function bhkList(unitTypes: string): string[] {
  const m = unitTypes.match(/(\d+)\s*[–-]\s*(\d+)/);
  if (!m) return [unitTypes];
  const out: string[] = [];
  for (let n = Number(m[1]); n <= Number(m[2]); n++) out.push(`${n} BHK`);
  return out;
}

/** "₹ 65 L – 1.4 Cr" -> "₹ 65 L – ₹ 1.4 Cr" (§7: ₹ on both ends). */
const priceRange = (s: string) => s.replace(/–\s*(?!₹)/, "– ₹ ");

/* ---------------- card ---------------- */

function ProjectCutoutCard({ project: p, onOpen, index }: { project: Project; onOpen: (p: Project) => void; index: number }) {
  const { ref, inView } = useInView<HTMLLIElement>();
  return (
    // Stagger in on scroll via the CSS .reveal (no-op under prefers-reduced-motion).
    <li ref={ref} className={`reveal ${inView ? "is-visible" : ""}`} style={{ "--i": index } as CSSProperties}>
      <CutoutCard className={`${cutoutCardSurfaceClassName} h-full flex flex-col`}>
        <CutoutCardMedia className="aspect-video">
          <CutoutCardImage src={imageFor(p)} alt={altFor(p)} />
          <CutoutCardOverlay />

          {/* pin = status, top-right; corners use the surface colour to carve the curve */}
          <CutoutCardPin className="right-0 top-0 rounded-bl-card bg-surface px-3 py-2 text-small font-semibold text-accent-ink">
            <CutoutCorner size={16} className="absolute right-full top-0 -scale-y-100 text-surface" />
            <CutoutCorner size={16} className="absolute right-0 top-full -scale-y-100 text-surface" />
            {PIN[p.status]}
          </CutoutCardPin>

          {/* inset label = city, bottom-left */}
          <CutoutCardInsetLabel className="bottom-0 left-0 rounded-tr-card bg-surface pl-4 pr-3 pt-3">
            <CutoutCorner size={16} className="absolute bottom-full left-0 -scale-x-100 text-surface" />
            <CutoutCorner size={16} className="absolute bottom-0 left-full -scale-x-100 text-surface" />
            <CityPill city={p.city} />
          </CutoutCardInsetLabel>
        </CutoutCardMedia>

        <CutoutCardContent className="flex flex-1 flex-col gap-4 px-5 pb-5 pt-3">
          <div>
            <h3 className="text-h3 font-semibold text-ink">{p.name}</h3>
            <p className="mt-1 inline-flex items-center gap-1.5 text-body text-ink-soft">
              <MapPin size={14} strokeWidth={1.5} aria-hidden="true" /> {p.locality}
            </p>
          </div>
          <CutoutCardFooter className="mt-auto">
            <span className="text-small text-ink-muted">{p.unitTypes}</span>
            <Button
              variant="secondary"
              className="h-9 group/btn"
              onClick={() => onOpen(p)}
              aria-haspopup="dialog"
              aria-label={`Read more about ${p.name}`}
            >
              Read more <ArrowRight size={14} strokeWidth={1.5} className="transition-transform duration-fast group-hover/btn:translate-x-1" />
            </Button>
          </CutoutCardFooter>
        </CutoutCardContent>
      </CutoutCard>
    </li>
  );
}

/* ---------------- detail dialog ---------------- */

function ProjectDetail({ project: p, onCall }: { project: Project; onCall: () => void }) {
  const { properties } = useCatalog();
  const homes = properties.filter((x) => x.projectId === p.id && x.status !== "sold");
  const facts: [string, string][] = [
    ["City", p.city],
    ["Locality", p.locality],
    ["Status", p.status],
    ["Units", p.totalUnits != null ? `${p.availableUnits ?? "—"} available of ${p.totalUnits}` : "Not listed"],
  ];

  return (
    <>
      <div className="relative -mx-6 -mt-6 aspect-video overflow-hidden rounded-t-card bg-bg">
        <img src={imageFor(p)} alt={altFor(p)} className="absolute inset-0 h-full w-full object-cover" />
      </div>

      <DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CityPill city={p.city} />
          <span className="inline-flex h-6 items-center rounded-pill bg-accent-soft px-2.5 text-small font-semibold text-accent-ink">{p.status}</span>
        </div>
        <DialogTitle>{p.name}</DialogTitle>
        <DialogDescription>
          {p.locality}, {p.city} · sample project data for this demo
        </DialogDescription>
      </DialogHeader>

      {p.description && <p className="text-body text-ink-soft">{p.description}</p>}

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt className="text-small text-ink-muted">{k}</dt>
            <dd className="text-body text-ink">{v}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="pd-price">
        <h3 id="pd-price" className="flex items-center gap-1.5 text-small text-ink-muted"><IndianRupee size={14} strokeWidth={1.5} aria-hidden="true" /> Price range</h3>
        <p className="mt-1 text-h3 font-semibold tnum">{priceRange(p.priceRange)}</p>
      </section>

      <section aria-labelledby="pd-bhk">
        <h3 id="pd-bhk" className="flex items-center gap-1.5 text-small text-ink-muted"><Building2 size={14} strokeWidth={1.5} aria-hidden="true" /> Homes offered</h3>
        <ul className="mt-2 flex flex-wrap gap-2">
          {bhkList(p.unitTypes).map((b) => (
            <li key={b} className="h-8 inline-flex items-center rounded-pill border border-border px-3 text-body">{b}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="pd-amen">
        <h3 id="pd-amen" className="text-small text-ink-muted">Amenities</h3>
        <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
          {p.features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-body text-ink">
              <Check size={14} strokeWidth={1.5} className="text-positive" aria-hidden="true" /> {f}
            </li>
          ))}
        </ul>
      </section>

      {homes.length > 0 && (
        <section aria-labelledby="pd-homes">
          <h3 id="pd-homes" className="text-small text-ink-muted">Available homes</h3>
          <ul className="mt-2 grid gap-3">
            {homes.map((h) => <li key={h.id}><PropertyCard property={h} /></li>)}
          </ul>
        </section>
      )}

      <DialogFooter className="pt-2">
        <DialogClose asChild>
          <Button variant="secondary">Close</Button>
        </DialogClose>
        <Button onClick={onCall}>
          <Phone size={16} strokeWidth={1.5} /> Ask about {p.name}
        </Button>
      </DialogFooter>
    </>
  );
}

/* ---------------- grid ---------------- */

export function ProjectCutoutGrid({ onCall }: { onCall: () => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const { projects, properties, loading, error, reload } = useCatalog();
  const list = projects.map((p) => projectView(p, properties));
  const open = list.find((p) => p.id === openId) ?? null;
  const setOpen = (p: Project | null) => setOpenId(p?.id ?? null);

  if (loading) {
    return <p role="status" className="max-w-5xl mx-auto py-16 text-center text-body text-ink-soft">Loading projects…</p>;
  }
  if (error && !list.length) {
    return (
      <div role="alert" className="max-w-5xl mx-auto py-12 text-center">
        <p className="text-body text-ink-soft">We couldn't load our projects right now.</p>
        <Button variant="secondary" className="mt-4 h-9" onClick={() => void reload()}>Try again</Button>
      </div>
    );
  }
  if (!list.length) {
    return <p className="max-w-5xl mx-auto py-12 text-center text-body text-ink-soft">No projects to show yet.</p>;
  }

  return (
    <>
      <ul className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {list.map((p, i) => (
          <ProjectCutoutCard key={p.id} project={p} index={i} onOpen={setOpen} />
        ))}
      </ul>

      {/* Radix Dialog: focus trap, Esc to close, scroll lock, focus returns to the Read more button. */}
      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-xl">
          {open && (
            <ProjectDetail
              project={open}
              onCall={() => { setOpen(null); onCall(); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
