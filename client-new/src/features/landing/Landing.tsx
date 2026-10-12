import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { Link } from "react-router-dom";
import { motion, useInView, type Transition } from "motion/react";
import { useReducedMotion } from "@/lib/motion";
import { ArrowRight, Phone, Menu, ScanText, ShieldCheck, X } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CallWidget } from "@/features/client/CallWidget";
import { projectImage, useCatalog } from "@/api/catalog";
import { BrushUnderline } from "./HeroDoodles";

/** --ease-out as a motion bezier. */
const EASE = [0.22, 1, 0.36, 1] as const;

// Hero carousel (§9 item 2). One slide per project photo in public/images/<slug>.jpg — the files
// there are placeholders; drop real photos in with the SAME file names and nothing else changes.
// Caption = project name · locality · city, read from the project data so it can't drift.
const HERO_SLIDES = ["skyline-heights", "baner-greens", "riverside-park", "kharadi-vista", "lake-vista", "hill-crest"];
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const slideOrder = (name: string) => { const i = HERO_SLIDES.indexOf(slug(name)); return i === -1 ? HERO_SLIDES.length : i; };

/** Full-bleed project ticker. The list is rendered twice so translateX(-50%) loops seamlessly;
 *  the copy is aria-hidden and dropped under reduced motion (row becomes a static scroller). */
function ProjectMarquee() {
  const [paused, setPaused] = useState(false);
  const { projects } = useCatalog();
  const HERO_TIPS = [...projects].sort((a, b) => slideOrder(a.name) - slideOrder(b.name)).map((p) => ({
    text: `${p.name} · ${p.locality} · ${p.city}`,
    image: projectImage(p),
    alt: `${p.name}, a residential project in ${p.locality}, ${p.city}`,
  }));
  if (!HERO_TIPS.length) return null; // still loading, or the API is unreachable (the projects grid says so)
  const card = (t: (typeof HERO_TIPS)[number], copy: boolean) => (
    <figure key={`${copy ? "b" : "a"}-${t.image}`} aria-hidden={copy || undefined} className={`shrink-0 w-80 md:w-96 ${copy ? "eq-marquee__copy" : ""}`}>
      <img src={t.image} alt={copy ? "" : t.alt} loading="lazy" className="w-full aspect-wide object-cover rounded-card bg-surface" />
      <figcaption className="mt-2 text-small text-ink-soft">{t.text}</figcaption>
    </figure>
  );
  return (
    <section aria-label="Our projects in pictures" className="pt-24 md:pt-32">
      <div onClick={() => setPaused((p) => !p)} className={`eq-marquee eq-marquee--click cursor-pointer ${paused ? "eq-marquee-paused" : ""}`} style={{ "--speed": "50s" } as CSSProperties}>
        <div className="eq-marquee__track">
          {HERO_TIPS.map((t) => card(t, false))}
          {HERO_TIPS.map((t) => card(t, true))}
        </div>
      </div>
      <div className="flex justify-center mt-4 eq-marquee__control">
        <button type="button" onClick={() => setPaused((p) => !p)} aria-pressed={paused} className="h-8 px-3 rounded-pill border border-border text-small text-ink-soft hover:text-ink">
          {paused ? "Play" : "Pause"} scrolling
        </button>
      </div>
    </section>
  );
}

// Everything below the hero is code-split so first paint (and the call button) stays light (§17.5).
const BelowFold = lazy(() => import("./BelowFold"));
// The globe (WebGL) is its own chunk too — never on the first-paint path (§31.5).
const GlobeSection = lazy(() => import("./GlobeSection"));

/* ---------------- 1. Floating pill navbar (§17.3 #1) ---------------- */

/** True while the nav sits over a section marked data-nav-theme="dark" data-theme="dark". */
function useNavOverDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      const y = 40; // roughly the nav's vertical centre
      const over = [...document.querySelectorAll<HTMLElement>("[data-nav-theme='dark']")].some((s) => {
        const r = s.getBoundingClientRect();
        return r.top <= y && r.bottom >= y;
      });
      setDark(over);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(check); };
    window.addEventListener("scroll", onScroll, { passive: true });
    check();
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);
  return dark;
}

function Navbar({ onCall }: { onCall: () => void }) {
  const dark = useNavOverDark();
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  // §17.6: shrink slightly after 24px of scroll (transform only — no height change, no reflow).
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const on = () => setCompact(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const link = `h-9 px-3 grid place-items-center rounded-pill text-body transition ${dark ? "text-ink/85 hover:text-ink" : "text-ink-soft hover:text-ink"}`;

  return (
    <header className="fixed top-3 inset-x-0 z-sticky-nav px-4">
      <motion.nav
        initial={reduce ? false : { opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: compact ? -4 : 0, scale: compact ? 0.97 : 1 }}
        transition={reduce ? { duration: 0 } : { duration: 0.4, ease: EASE }}
        aria-label="Main"
        // Over a dark band the nav takes a LOCAL dark scope: every token inside resolves to its dark value.
        data-theme={dark ? "dark" : undefined}
        // Over the video hero (and other dark bands): translucent glass + white text.
        // Past them: the normal light pill with dark text.
        className={`relative mx-auto max-w-5xl flex items-center gap-2 h-14 pl-4 pr-2 rounded-pill border backdrop-blur-md transition-colors duration-base ${
          dark ? "bg-bg/40 border-ink/20 text-ink" : "bg-surface/80 border-border text-ink"
        }`}
      >
        <Link to="/" aria-label="EstateIQ home"><BrandMark /></Link>
        {/* centre links */}
        <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          <a href="#about" className={link}>About</a>
          <a href="#projects" className={link}>Projects</a>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={onCall}
            className={`group inline-flex items-center gap-2 h-10 px-4 rounded-pill text-body font-semibold transition active:scale-[0.98] ${
              "bg-accent text-on-accent hover:brightness-105" /* primary CTA = orange in every context */
            }`}
          >
            <Phone size={16} strokeWidth={1.5} />
            <span>Call the agent</span>
          </button>
          <button className="md:hidden h-10 w-10 grid place-items-center rounded-pill" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </motion.nav>
      {open && (
        <div className="md:hidden mx-auto max-w-5xl mt-2 p-2 rounded-card bg-surface border border-border shadow-md flex flex-col eq-risein">
          {[["#projects", "Projects"], ["#about", "About"]].map(([href, label]) => (
            <a key={href} href={href} onClick={() => setOpen(false)} className="h-11 px-3 flex items-center rounded-control text-body hover:bg-surface-hover">{label}</a>
          ))}
        </div>
      )}
    </header>
  );
}

/* ---------------- 2. Hero (§9, §17.3 #2–#7, #15) ---------------- */

/**
 * Two lines. `accent` = italic + var(--accent); `underline` adds the brush stroke; `after` is
 * trailing ink text that rides with the word (the full stop stays ink, outside the accent span).
 */
type HeadWord = { w: string; accent?: boolean; underline?: boolean; after?: string };
const HEADLINE_LINES: HeadWord[][] = [
  [{ w: "Find" }, { w: "your" }, { w: "Real Estate", accent: true }, { w: "with" }],
  [{ w: "One Call", accent: true, underline: true, after: "." }],
];
const HEADLINE = HEADLINE_LINES.flat();

/**
 * §17.6 Hero choreography — intro timeline (seconds from mount). ~1.3s total, then idle loops.
 * Every value here is a delay; durations live next to each element.
 */
const T = { pill: 0.1, glow: 0.15, words: 0.25, wordGap: 0.06, accentPause: 0.12, sub: 0.65, cta: 0.75, brush: 0.85, key: 0.85, house: 0.9, trust: 1.1, idle: 1.3 };
// The 120ms beat comes right before the underlined phrase ("One Call").
const ACCENT_INDEX = HEADLINE.findIndex((h) => h.underline);
const wordDelay = (i: number) => T.words + i * T.wordGap + (i >= ACCENT_INDEX ? T.accentPause : 0);

/** True when the viewport is at least `px` wide (kept in sync on resize). */
function useMinWidth(px: number) {
  const query = `(min-width: ${px}px)`;
  const [ok, setOk] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setOk(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return ok;
}

// Hero media. CURRENTLY: stock aerial footage (Pixabay clip 64381) of a city skyline at sunset —
// NOT Nashik/Pune and NOT our projects. Swap for a real Nashik/Pune flythrough when available
// (same file names; see public/videos/README.txt). Keep the alt text truthful to whatever is shown.
const HERO_VIDEO = "/videos/hero.mp4";
const HERO_POSTER = "/images/hero-poster.jpg";
const HERO_MEDIA_ALT = "Aerial view of a city skyline and riverside towers at sunset (stock footage)";

const HERO_SUBTEXT = "Talk to our property assistant about real estate projects across Nashik and Pune. No forms, just a call.";

/**
 * Hand-rolled typewriter (hero subtext): types character by character, holds ~1.5s, deletes,
 * pauses, and loops. No layout jump: the FULL sentence is rendered invisibly in the same grid
 * cell, so the line box is reserved at every width; the typed text + caret sit on top of it.
 * Screen readers get the full sentence once (sr-only); the animated copy is aria-hidden.
 * `animate=false` (reduced motion, or hero off-screen) shows the whole sentence with no caret.
 */
const TYPE_MS = 35;
const DELETE_MS = 15;
const HOLD_MS = 1500;
const GAP_MS = 400;

function Typewriter({ text, animate }: { text: string; animate: boolean }) {
  const [count, setCount] = useState(text.length);

  useEffect(() => {
    if (!animate) { setCount(text.length); return; }
    let n = 0;
    let timer = 0;
    setCount(0);
    const type = () => {
      n += 1;
      setCount(n);
      timer = window.setTimeout(n < text.length ? type : () => { timer = window.setTimeout(erase, HOLD_MS); }, TYPE_MS);
    };
    const erase = () => {
      n -= 1;
      setCount(n);
      timer = window.setTimeout(n > 0 ? erase : () => { timer = window.setTimeout(type, GAP_MS); }, DELETE_MS);
    };
    timer = window.setTimeout(type, GAP_MS);
    return () => window.clearTimeout(timer);
  }, [animate, text]);

  return (
    <span className="grid">
      <span className="sr-only">{text}</span>
      {/* invisible full sentence reserves the height */}
      <span aria-hidden="true" className="invisible [grid-area:1/1]">{text}</span>
      <span aria-hidden="true" className="[grid-area:1/1]">
        {text.slice(0, count)}
        {animate && <span className="eq-caret">|</span>}
      </span>
    </span>
  );
}

/** Real product pillars only — no metrics. */
const HERO_FEATURES = [
  { icon: Phone, title: "Just a call", line: "No forms. Talk to our AI agent and get matched." },
  { icon: ScanText, title: "Understood instantly", line: "Your BHK, budget and area, captured from the conversation." },
  { icon: ShieldCheck, title: "No audio stored", line: "We keep only a text transcript of your call." },
];

/**
 * Full-viewport cinematic hero with a looping background video (DESIGN.md §9; vinode.io-style).
 * - Poster <img> paints instantly; the <video> is only MOUNTED once the hero is in view, only on
 *   ≥640px, and never under prefers-reduced-motion (those get the poster alone).
 * - Video pauses whenever the hero scrolls off-screen. A missing/broken file falls back to the poster.
 * - Ink overlay keeps the white text ≥4.5:1 regardless of what the footage looks like.
 * - data-nav-theme="dark" data-theme="dark" turns the floating navbar into its glass/white style while over the hero.
 */
function Hero({ onStart, ctaRef }: { onStart: () => void; ctaRef: RefObject<HTMLDivElement> }) {
  const reduce = !!useReducedMotion();
  const wide = useMinWidth(640);
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inView = useInView(sectionRef, { margin: "200px" });
  const [videoOk, setVideoOk] = useState(true);
  const [mountVideo, setMountVideo] = useState(false);
  const allowVideo = wide && !reduce && videoOk;

  // Lazy-mount: only once the hero is (nearly) on screen, and only where video is allowed.
  useEffect(() => { if (inView && allowVideo) setMountVideo(true); }, [inView, allowVideo]);
  // Play while visible, pause when scrolled away.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (inView) v.play().catch(() => { /* autoplay blocked — poster stays */ });
    else v.pause();
  }, [inView, mountVideo]);

  // `initial={false}` under reduced motion = render the final state immediately.
  const intro = <V extends object>(from: V, delay: number, extra: Transition = {}) =>
    reduce
      ? { initial: false as const }
      : { initial: from, animate: { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }, transition: { delay, duration: 0.6, ease: EASE, ...extra } };

  return (
    <section
      ref={sectionRef}
      data-nav-theme="dark" data-theme="dark"
      aria-labelledby="hero-title"
      className="relative isolate min-h-svh flex flex-col overflow-hidden bg-bg text-ink"
    >
      {/* poster: instant first paint, and the only media on phones / reduced motion */}
      <img
        src={HERO_POSTER}
        alt={HERO_MEDIA_ALT}
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 -z-20 h-full w-full object-cover"
      />
      {mountVideo && allowVideo && (
        <video
          ref={videoRef}
          src={HERO_VIDEO}
          poster={HERO_POSTER}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          tabIndex={-1}
          onError={() => setVideoOk(false)}
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
      )}
      {/* ink overlay: 55% at top → lighter at the bottom; the feature chips carry their own glass */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-scrim/60 via-scrim/55 to-scrim/20" />

      {/* centered content */}
      <div className="flex-1 flex items-center justify-center px-4 pt-32 pb-16">
        <div className="max-w-4xl text-center">
          <motion.h1
            id="hero-title"
            className="font-display font-normal text-display md:text-display-lg text-ink"
            aria-label={HEADLINE.map((h) => h.w + (h.after ?? "")).join(" ")}
          >
            {HEADLINE_LINES.map((line, li) => (
              <span key={li} className="block" aria-hidden="true">
                {line.map(({ w, accent, underline, after }) => {
                  const i = HEADLINE.findIndex((h) => h.w === w);
                  return (
                    <span key={w}>
                      <motion.span className="inline-block" {...intro({ opacity: 0, y: "0.35em" }, wordDelay(i))}>
                        {accent ? (
                          <motion.span
                            // "Real Estate" = orange accent; "One Call" = white (text-ink in the dark hero) with the orange underline.
                            className={`italic relative ${w === "Real Estate" ? "inline-block text-accent-ink" : "text-ink"}`}
                            // "Real Estate" only: scale + quick wobble on hover, then settle. Off under reduced motion.
                            {...(w === "Real Estate" && !reduce
                              ? { whileHover: { scale: 1.08, rotate: [0, -3, 3, -2, 2, 0] }, transition: { duration: 0.45, ease: "easeOut" } }
                              : {})}
                          >
                            {w}
                            {underline && <BrushUnderline at={T.brush} />}
                          </motion.span>
                        ) : (
                          w
                        )}
                        {after}
                      </motion.span>{" "}
                    </span>
                  );
                })}
              </span>
            ))}
          </motion.h1>

          <motion.p className="mt-12 mx-auto max-w-xl text-h3 font-normal text-ink" {...intro({ opacity: 0, y: 16 }, T.sub)}>
            <Typewriter text={HERO_SUBTEXT} animate={!reduce && inView} />
          </motion.p>

          {/* Buttons are opaque + clickable from first paint (only a small slide on load). Stack on phones. */}
          <motion.div
            className="mt-12 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3"
            {...(reduce ? { initial: false } : { initial: { y: 12 }, animate: { y: 0 }, transition: { delay: T.cta, duration: 0.5, ease: EASE } })}
          >
            <motion.div ref={ctaRef} whileHover={reduce ? undefined : "hover"} variants={{ hover: { y: -2 } }}>
              {/* Ghost button like "View projects", but with a glowing orange edge (.eq-glow-edge in index.css). */}
              <button
                type="button"
                onClick={onStart}
                className="eq-glow-edge w-full sm:w-auto inline-flex items-center justify-center gap-2 h-12 px-6 rounded-pill border border-accent bg-transparent text-body font-semibold text-ink active:scale-[0.98]"
              >
                <motion.span className="inline-flex" variants={{ hover: { rotate: [0, -14, 10, -6, 0], transition: { duration: 0.5 } } }}>
                  <Phone size={16} strokeWidth={1.5} />
                </motion.span>
                Start call
              </button>
            </motion.div>
            <a
              href="#projects"
              className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-pill border border-ink/40 text-body font-semibold text-ink backdrop-blur-sm transition hover:bg-ink/10 active:scale-[0.98]"
            >
              View projects <ArrowRight size={16} strokeWidth={1.5} />
            </a>
          </motion.div>
        </div>
      </div>

      {/* bottom feature strip — translucent glass chips, wraps on small screens */}
      <motion.ul
        className="relative mx-auto w-full max-w-5xl grid grid-cols-1 sm:grid-cols-3 gap-3 px-4 pb-6 md:pb-10"
        {...intro({ opacity: 0, y: 16 }, T.trust)}
      >
        {HERO_FEATURES.map(({ icon: Icon, title, line }) => (
          // Bracket frame: four L-shaped corner marks instead of a full border; squared, faint scrim for legibility.
          <li key={title} className="eq-brackets relative flex items-start gap-3 rounded-none bg-scrim/50 p-4 text-left">
            <span aria-hidden="true" className="eq-bracket eq-bracket--tl" />
            <span aria-hidden="true" className="eq-bracket eq-bracket--tr" />
            <span aria-hidden="true" className="eq-bracket eq-bracket--bl" />
            <span aria-hidden="true" className="eq-bracket eq-bracket--br" />
            <span className="shrink-0 grid size-9 place-items-center rounded-control bg-accent/25 text-ink" aria-hidden="true">
              <Icon size={18} strokeWidth={1.5} />
            </span>
            <span>
              <span className="block text-body font-semibold text-ink">{title}</span>
              <span className="block mt-0.5 text-small text-ink-soft">{line}</span>
            </span>
          </li>
        ))}
      </motion.ul>
    </section>
  );
}

/* ---------------- Page ---------------- */

/**
 * §17.6: the floating "Call the agent" pill stays hidden while the hero Start call is on screen,
 * slides in once it leaves, and hides again at the final call to action. Starts HIDDEN so it
 * never flashes on first paint.
 */
function useFloatingPillHidden(ctaRef: RefObject<HTMLElement>) {
  const [ctaVisible, setCtaVisible] = useState(true);
  const [finalVisible, setFinalVisible] = useState(false);

  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setCtaVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [ctaRef]);

  // The final CTA lives in the lazy BelowFold chunk — wait for it to mount, then observe it.
  useEffect(() => {
    let io: IntersectionObserver | null = null;
    const attach = () => {
      const el = document.querySelector("[data-final-cta]");
      if (!el || io) return !!el;
      io = new IntersectionObserver(([e]) => setFinalVisible(e.isIntersecting));
      io.observe(el);
      return true;
    };
    if (attach()) return () => io?.disconnect();
    const mo = new MutationObserver(() => { if (attach()) mo.disconnect(); });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { mo.disconnect(); io?.disconnect(); };
  }, []);

  return ctaVisible || finalVisible;
}

export function Landing() {
  const [widget, setWidget] = useState(false);
  const openCall = () => setWidget(true);
  const ctaRef = useRef<HTMLDivElement>(null);
  const pillHidden = useFloatingPillHidden(ctaRef);

  return (
    <div className="min-h-screen bg-bg text-ink overflow-x-clip">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-tooltip focus:bg-surface focus:px-3 focus:py-2 focus:rounded-control">
        Skip to content
      </a>
      <Navbar onCall={() => openCall()} />
      <main id="main">
        <Hero onStart={openCall} ctaRef={ctaRef} />
        <ProjectMarquee />
        <Suspense fallback={<div className="h-screen" aria-busy="true" />}>
          <GlobeSection />
          <BelowFold onCall={() => openCall()} />
        </Suspense>
      </main>
      <CallWidget open={widget} onOpen={() => openCall()} onClose={() => setWidget(false)} askName hasBottomNav={false} pillHidden={pillHidden} />
    </div>
  );
}
