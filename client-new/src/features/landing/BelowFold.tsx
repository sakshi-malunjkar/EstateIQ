import { useEffect, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/motion";
import { ArrowRight, MessageSquareQuote, Pause, Phone, Play } from "lucide-react";
import { useCatalog } from "@/api/catalog";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/Button";
import { ArrowDoodle } from "./Doodles";
import { ProjectCutoutGrid } from "./ProjectCards";
import { prefersReducedMotion, useInView } from "./useInView";

/** Where the admin dashboard is served (separate app). */
const ADMIN_URL = (import.meta.env.VITE_ADMIN_URL as string | undefined) ?? "http://localhost:5174";

/** Sections below the hero (§9 order 3–9). Lazy-loaded by Landing. */
export default function BelowFold({ onCall }: { onCall: () => void }) {
  return (
    <>
      <ProjectsGrid onCall={onCall} />
      <Pillars />
      <Signals />
      <AtAGlance />
      <FinalCta onCall={onCall} />
      <Footer />
    </>
  );
}

/** Wrapper that fades its children up when scrolled into view. */
function Reveal({ i = 0, className = "", children }: { i?: number; className?: string; children: ReactNode }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={`reveal ${inView ? "is-visible" : ""} ${className}`} style={{ "--i": i } as CSSProperties}>
      {children}
    </div>
  );
}

function SectionHead({ eyebrow, title, sub, dark = false }: { eyebrow: string; title: ReactNode; sub?: string; dark?: boolean }) {
  return (
    <Reveal className="max-w-2xl mx-auto text-center mb-10 md:mb-14">
      <p className={`text-small uppercase tracking-widest ${dark ? "text-ink-muted" : "text-ink-muted"}`}>{eyebrow}</p>
      <h2 className={`mt-3 font-display font-normal text-h1 md:text-display ${dark ? "text-ink" : "text-ink"}`}>{title}</h2>
      {sub && <p className={`mt-4 mx-auto max-w-md text-body ${dark ? "text-ink-soft" : "text-ink-soft"}`}>{sub}</p>}
    </Reveal>
  );
}

/* ---------------- 3. Our projects — CutoutCards + detail dialog ---------------- */

function ProjectsGrid({ onCall }: { onCall: () => void }) {
  return (
    <section id="projects" className="px-4 py-20 md:py-28 scroll-mt-24">
      <SectionHead eyebrow="Our projects" title={<>6 projects, <em>two</em> cities</>} sub="Every enquiry is matched against real homes in Nashik and Pune." />
      <ProjectCutoutGrid onCall={onCall} />
    </section>
  );
}

/* ---------------- 4. Stacked pillar cards (§17.3 #9) ---------------- */

const PILLARS = [
  { key: "calls", title: "Calls", tone: "bg-cold", body: "Visitors tap “Call the agent” and talk to our AI property assistant in Hindi, Marathi or English. We keep the transcript — never the audio." },
  { key: "sentiment", title: "Sentiment", tone: "bg-positive", body: "Each transcript is read for tone, so the team knows who sounded keen and who sounded unsure — before they pick up the phone." },
  { key: "score", title: "Lead scoring", tone: "bg-hot", body: "Every lead gets a 0–100 score, and every score comes with its reason in plain words: “shared a clear budget”, “asked to visit”." },
  { key: "dash", title: "Dashboards", tone: "bg-accent", body: "The sales team sees who to call first. Callers get their own simple page with what they asked about and homes that match." },
];

function Diamond({ tone }: { tone: string }) {
  return <span className={`inline-block w-2.5 h-2.5 rotate-45 rounded-sm ${tone}`} aria-hidden="true" />;
}

function Pillars() {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (active + (e.key === "ArrowRight" ? 1 : PILLARS.length - 1)) % PILLARS.length;
    setActive(next);
    document.getElementById(`pillar-tab-${next}`)?.focus();
  };

  return (
    <section className="px-4 py-20 md:py-28">
      <SectionHead eyebrow="How it works" title={<>From a call to a <em>clear</em> next step</>} />
      <div className="max-w-3xl mx-auto">
        <div role="tablist" aria-label="Platform pillars" onKeyDown={onKey} className="flex flex-wrap justify-center gap-2 mb-8">
          {PILLARS.map((p, i) => (
            <button
              key={p.key}
              id={`pillar-tab-${i}`}
              role="tab"
              aria-selected={active === i}
              aria-controls="pillar-panel"
              tabIndex={active === i ? 0 : -1}
              onClick={() => setActive(i)}
              className={`inline-flex items-center gap-2 h-9 px-4 rounded-pill border text-body transition ${
                active === i ? "bg-surface border-ink text-ink" : "bg-transparent border-border text-ink-soft hover:text-ink"
              }`}
            >
              <Diamond tone={p.tone} /> {p.title}
            </button>
          ))}
        </div>

        {/* the stack: active card in front, others peek out behind it */}
        <div className="relative h-72 sm:h-64" id="pillar-panel" role="tabpanel" aria-labelledby={`pillar-tab-${active}`}>
          {PILLARS.map((p, i) => {
            const depth = (i - active + PILLARS.length) % PILLARS.length; // 0 = front
            return (
              <motion.div
                key={p.key}
                aria-hidden={depth !== 0}
                initial={false}
                animate={{ y: depth * -14, scale: 1 - depth * 0.04, opacity: depth > 2 ? 0 : 1 }}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
                style={{ zIndex: PILLARS.length - depth }}
                className="absolute inset-x-0 bottom-0 h-60 sm:h-56 bg-surface border border-border rounded-card p-6 md:p-8 origin-top"
              >
                <div className="flex items-center gap-2 text-small uppercase tracking-widest text-ink-muted">
                  <Diamond tone={p.tone} /> {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="mt-3 font-display font-normal text-h1">{p.title}</h3>
                <p className="mt-3 text-body text-ink-soft max-w-lg">{p.body}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------- 5. Dark "Never miss a lead" — signals marquee (§17.3 #8) ---------------- */

type Signal = { text: string; tone: string };
// Example enquiries (illustrative, not real people). Square colours per §18: call · positive · visit · status · callback.
const ROWS: Signal[][] = [
  [
    { text: "Rahul asked about 2 BHK in Skyline Heights", tone: "bg-cold" },
    { text: "Positive call from Pune", tone: "bg-positive" },
    { text: "Priya compared Baner and Kharadi", tone: "bg-cold" },
    { text: "Site visit requested for Saturday", tone: "bg-pastel-yellow" },
    { text: "Budget shared: ₹ 65 L", tone: "bg-accent" },
  ],
  [
    { text: "Callback requested — Kharadi Vista", tone: "bg-accent" },
    { text: "Asked about possession date", tone: "bg-cold" },
    { text: "Enquiry moved to “contacted”", tone: "bg-pastel-pink" },
    { text: "3 BHK under ₹ 1.2 Cr in Nashik", tone: "bg-cold" },
    { text: "Positive call about Riverside Park", tone: "bg-positive" },
  ],
  [
    { text: "Wanted covered parking and a gym", tone: "bg-cold" },
    { text: "Second call from the same number", tone: "bg-pastel-pink" },
    { text: "Site visit booked at Baner Greens", tone: "bg-pastel-yellow" },
    { text: "Hindi + English call about Hill Crest", tone: "bg-cold" },
    { text: "Asked for a home-loan callback", tone: "bg-accent" },
  ],
];
const SPEEDS = ["40s", "55s", "70s"];

function Chip({ s }: { s: Signal }) {
  return (
    <span className="inline-flex items-center gap-2 h-10 px-4 rounded-pill bg-ink/5 border border-ink/10 text-body text-ink whitespace-nowrap">
      <span className={`w-2 h-2 rounded-sm ${s.tone}`} />
      {s.text}
    </span>
  );
}

function Signals() {
  const [paused, setPaused] = useState(false);
  useEffect(() => { if (prefersReducedMotion()) setPaused(true); }, []);

  return (
    <section data-nav-theme="dark" data-theme="dark" className="mx-2 md:mx-4 rounded-card bg-bg py-20 md:py-28 overflow-hidden">
      <div className="px-4">
        <SectionHead dark eyebrow="Signals" title={<>Never miss your dream <em className="text-accent-ink">Real Estate</em></>} sub="Every call turns into a signal your team can act on." />
      </div>

      {/* static text alternative for screen readers (§17.5) */}
      <ul className="sr-only">
        {ROWS.flat().map((s) => <li key={s.text}>{s.text}</li>)}
      </ul>

      <div className={`space-y-3 ${paused ? "eq-marquee-paused" : ""}`} aria-hidden="true">
        {ROWS.map((row, r) => (
          <div
            key={r}
            className={`eq-marquee ${r % 2 ? "eq-marquee--reverse" : ""} ${r > 0 ? "hidden md:block" : ""}`}
            style={{ "--speed": SPEEDS[r] } as CSSProperties}
          >
            <div className="eq-marquee__track">
              {[...row, ...row].map((s, i) => <Chip key={i} s={s} />)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <button
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-pill border border-ink/15 text-small text-ink-soft hover:text-ink transition"
        >
          {paused ? <Play size={14} strokeWidth={1.5} /> : <Pause size={14} strokeWidth={1.5} />}
          {paused ? "Play signals" : "Pause signals"}
        </button>
      </div>
    </section>
  );
}

/* ---------------- 6–7. "At a glance" pastel bento (§9 items 6–7, §17.3 #10–11) ----------------
   Honest content only: every number is real (counted from data or literally true), example
   enquiries are labelled "Example", the statement is product voice, and the feedback slots stay
   empty until real, permissioned quotes exist. No invented people, logos, quotes or metrics. */

function CountUp({ to }: { to: number }) {
  const { ref, inView } = useInView<HTMLSpanElement>(0.5);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion() || to === 0) { setN(to); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 1200);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);
  return <span ref={ref} className="tnum">{n}</span>;
}

/** Shared card shell: hairline border, big radius, lifts a little on hover (transform only). */
function BentoCard({ i, className = "", children, tone = "bg-surface" }: { i: number; className?: string; tone?: string; children: ReactNode }) {
  return (
    <Reveal i={i} className={className}>
      <div className={`h-full min-h-44 flex flex-col p-6 rounded-card border border-ink/10 ${tone} transition duration-base hover:-translate-y-1 hover:border-ink/20`}>
        {children}
      </div>
    </Reveal>
  );
}

function FactCard({ i, n, unit, label, tag, tone, className }: { i: number; n?: number; unit?: string; label: string; tag: string; tone: string; className?: string }) {
  return (
    <BentoCard i={i} tone={tone} className={className}>
      {n !== undefined && (
        <div className="font-display text-display md:text-display-lg font-normal text-ink">
          <CountUp to={n} />
          {unit && <span className="text-h2 md:text-h1 ml-2 text-ink/70">{unit}</span>}
        </div>
      )}
      <p className={`${n !== undefined ? "mt-2" : ""} text-h3 font-semibold text-ink max-w-xs`}>{label}</p>
      <span className="mt-auto pt-6 text-small text-ink/60">{tag}</span>
    </BentoCard>
  );
}

function ExampleCard({ i, caller, match, className }: { i: number; caller: string; match: string; className?: string }) {
  return (
    <BentoCard i={i} className={className}>
      <span className="self-start inline-flex h-6 items-center rounded-pill border border-border px-2.5 text-small text-ink-soft">
        Example · illustrative, not a real caller
      </span>
      <p className="mt-4 text-h3 font-normal text-ink">{caller}</p>
      <p className="mt-2 flex items-center gap-2 text-body text-accent-ink font-semibold">
        <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />
        <span>{match}</span>
      </p>
    </BentoCard>
  );
}

function FeedbackSlot({ i, className }: { i: number; className?: string }) {
  // Deliberately empty: a real, permissioned client quote goes here later. Never fill with invented text.
  return (
    <Reveal i={i} className={className}>
      <div className="h-full min-h-44 flex flex-col items-center justify-center gap-2 p-6 rounded-card border border-dashed border-ink/20 text-center">
        <MessageSquareQuote size={20} strokeWidth={1.5} className="text-ink-muted" aria-hidden="true" />
        <p className="text-body font-semibold text-ink-soft">Client feedback</p>
        <p className="text-small text-ink-muted">Coming soon</p>
      </div>
    </Reveal>
  );
}

function AtAGlance() {
  const { projects } = useCatalog();
  const cities = new Set(projects.map((p) => p.city)).size;
  return (
    <section id="about" aria-labelledby="glance-title" className="px-4 py-20 md:py-28 scroll-mt-24">
      <Reveal className="max-w-2xl mx-auto text-center mb-10 md:mb-14">
        <p className="text-small uppercase tracking-widest text-ink-muted">At a glance</p>
        <h2 id="glance-title" className="mt-3 font-display font-normal text-h1 md:text-display text-ink">
          Small, <em>focused</em>, local
        </h2>
      </Reveal>

      {/* 4-col bento on desktop; stacks to one column on phones. Order = reading order. */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <FactCard i={0} n={projects.length} label="Real estate projects across Nashik & Pune" tag="Every one you can ask about" tone="bg-pastel-yellow" className="sm:col-span-2" />
        <FactCard i={1} n={cities} label="Cities — Nashik & Pune" tag="Maharashtra" tone="bg-pastel-green" />
        <FactCard i={2} n={0} label="Audio recordings stored — only transcripts" tag="Privacy" tone="bg-pastel-pink" />

        <ExampleCard i={3} className="sm:col-span-2" caller="Rahul asked about a 2 BHK in Baner" match="Matched to Baner Greens" />

        {/* C) Why EstateIQ — product voice, no attributed person */}
        <Reveal i={4} className="sm:col-span-2 md:row-span-2">
          <div className="h-full flex flex-col p-6 md:p-8 rounded-card border border-ink/10 bg-pastel-lavender">
            <p className="text-small uppercase tracking-widest text-ink/60">Why EstateIQ</p>
            <p className="mt-4 font-display font-normal text-h1 text-ink">
              Every enquiry deserves an answer. Every score deserves a <em className="text-accent-ink">reason</em>.
            </p>
            <p className="mt-auto pt-6 text-body text-ink/75 max-w-md">
              We built EstateIQ so no caller slips through the cracks — and so the team always knows why a lead is
              worth calling first, instead of trusting a number they can't explain.
            </p>
          </div>
        </Reveal>

        <FactCard i={5} n={1} unit="call" label="Just a call — no forms" tag="Name and number, then talk" tone="bg-pastel-yellow" />
        <FactCard i={6} label="Your enquiry, understood and matched to real homes" tag="Budget, BHK, area — from what you said" tone="bg-surface" />

        <ExampleCard i={7} className="sm:col-span-2" caller="A caller compared Baner and Kharadi" match="Got options in both areas on the same call" />
        <FeedbackSlot i={8} />
        <FeedbackSlot i={9} />
      </div>
    </section>
  );
}

/* ---------------- 8. Final CTA ---------------- */

function FinalCta({ onCall }: { onCall: () => void }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.3);
  return (
    <section data-final-cta className="px-4 pb-20 md:pb-28">
      <div ref={ref} className={`relative max-w-4xl mx-auto bg-surface border border-border rounded-card px-6 py-14 md:py-20 text-center ${inView ? "is-visible" : ""}`}>
        <ArrowDoodle className="hidden md:block absolute left-12 top-10 w-20 text-ink/60" />
        <h2 className="font-display font-normal text-h1 md:text-display">Ready to <em>talk</em>?</h2>
        <p className="mt-4 mx-auto max-w-md text-body text-ink-soft">
          Tell our assistant what you're looking for. We'll match homes across Nashik and Pune — no forms.
        </p>
        <div className="mt-8 flex justify-center">
          <Button className="h-12 rounded-pill px-6" onClick={onCall}>
            <Phone size={16} strokeWidth={1.5} /> Call the agent
          </Button>
        </div>
        <p className="mt-3 text-small text-ink-muted">Transcribed to help us serve you • No audio stored</p>
      </div>
    </section>
  );
}

/* ---------------- 9. Dark footer ---------------- */

function Footer() {
  const { projects } = useCatalog();
  const nashik = projects.filter((p) => p.city === "Nashik").length;
  const pune = projects.filter((p) => p.city === "Pune").length;
  const COLUMNS: { head: string; links: string[] }[] = [
    { head: "Projects", links: [`Nashik (${nashik})`, `Pune (${pune})`] },
    { head: "Product", links: ["Call the agent", "Lead scoring", "Dashboards"] },
    { head: "Company", links: ["About", "Contact"] },
    { head: "Legal", links: ["Privacy", "Terms"] },
  ];
  return (
    <footer data-nav-theme="dark" data-theme="dark" className="mx-2 md:mx-4 mb-2 md:mb-4 rounded-card bg-bg text-ink px-6 md:px-10 pt-14 pb-8">
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-[1.5fr_repeat(4,1fr)] gap-8">
        <div className="col-span-2 md:col-span-1">
          <BrandMark />
          <p className="mt-3 text-body text-ink-muted max-w-xs">AI lead intelligence for real estate in Nashik and Pune.</p>
        </div>
        {COLUMNS.map((c) => (
          <nav key={c.head} aria-label={c.head}>
            <h3 className="text-small uppercase tracking-widest text-ink-muted">{c.head}</h3>
            <ul className="mt-3 space-y-2">
              {c.links.map((l) => (
                <li key={l}>
                  <a href={c.head === "Projects" ? "#projects" : c.head === "Company" && l === "About" ? "#about" : "#"} className="text-body text-ink-soft hover:text-ink transition">
                    {l}
                  </a>
                </li>
              ))}
              {c.head === "Legal" && (
                // Admin-only entry (rev 3: clients have no account — they just call). Kept subtle.
                <li className="pt-2">
                  <a href={`${ADMIN_URL}/login`} className="text-small text-ink-muted hover:text-ink underline-offset-4 hover:underline transition rounded-control">
                    Admin login
                  </a>
                </li>
              )}
            </ul>
          </nav>
        ))}
      </div>
      <div className="max-w-5xl mx-auto mt-12 pt-6 border-t border-ink/10 text-small text-ink-muted flex flex-wrap gap-x-6 gap-y-2">
        <span>© {new Date().getFullYear()} EstateIQ</span>
        <span>We store call transcripts only — never audio.</span>
      </div>
    </footer>
  );
}
