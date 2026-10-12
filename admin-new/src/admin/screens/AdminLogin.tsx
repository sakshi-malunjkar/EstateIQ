import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, Eye, EyeOff, MapPin, PhoneCall, Sparkles } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { login, useAdminSession, useAuthReady } from "../auth";
import { useAdminPrefs } from "../prefs";

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const EASE = [0.22, 1, 0.36, 1] as const;

/** Stat cards on the brand panel. Values come from the app itself, not invented metrics. */
const STATS = [
  { icon: PhoneCall, value: "AI", label: "Every call scored" },
  { icon: Sparkles, value: "SHAP", label: "Why every score" },
  { icon: MapPin, value: "2", label: "Cities" },
] as const;

/** Admin sign-in (the only login, rev 3). Supabase email + password. */
export function AdminLogin() {
  const session = useAdminSession();
  const ready = useAuthReady();
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  // Every sign-in starts on the chosen start page (Settings; default Dashboard), not the page that bounced them here.
  const home = useAdminPrefs().startPage;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (ready && session) return <Navigate to={home} replace />;

  const emailErr = !email ? "Enter your email." : !emailOk(email) ? "Enter a valid email address." : null;
  const pwErr = !password ? "Enter your password." : null;
  const showEmail = (touched.email || tried) && emailErr;
  const showPw = (touched.password || tried) && pwErr;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    setError(null);
    if (emailErr) { document.getElementById("al-email")?.focus(); return; }
    if (pwErr) { document.getElementById("al-password")?.focus(); return; }
    setBusy(true);
    const err = await login(email, password);
    setBusy(false);
    if (err) { setError(err); return; }
    navigate(home, { replace: true });
  };

  const field = (bad: unknown) =>
    cn(
      "w-full h-11 px-3 rounded-control border bg-surface text-body text-ink outline-none placeholder:text-ink-muted focus-visible:shadow-focus transition-colors",
      bad ? "border-negative" : "border-border focus-visible:border-accent",
    );

  // Entrance helper: skipped entirely under reduced motion (initial={false} renders the final state).
  const enter = (delay: number, y = 16) =>
    reduce
      ? { initial: false as const }
      : { initial: { opacity: 0, y }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay, ease: EASE } };

  return (
    <div className="min-h-screen bg-bg text-ink grid lg:grid-cols-[55fr_45fr]">
      {/* ---------- Brand panel: always dark (tokens resolve dark via data-theme) ---------- */}
      <section
        data-theme="dark"
        aria-label="EstateIQ"
        className="relative isolate overflow-hidden bg-bg text-ink flex flex-col justify-between gap-10 px-6 py-8 sm:px-10 lg:px-16 lg:py-14"
      >
        {/* soft orange glow behind the stats */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -bottom-40 left-1/2 h-[28rem] w-[44rem] max-w-none -translate-x-1/2 rounded-full bg-accent/25 blur-[110px]" />
          <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-accent/10 blur-[90px]" />
        </div>

        <motion.div {...enter(0, -8)} className="flex items-center gap-3">
          <BrandMark className="origin-left scale-125" />
          <span className="text-small font-medium px-2 h-6 inline-flex items-center rounded-pill border border-accent/60 text-accent-ink bg-accent/10 ml-2">Admin</span>
        </motion.div>

        <div className="max-w-xl">
          <motion.h1 {...enter(0.1)} className="font-display font-semibold tracking-tight text-h1 sm:text-display lg:text-display-lg lg:leading-[1.02]">
            Turn Every Call Into a <span className="italic text-accent-ink">Qualified Lead</span>
          </motion.h1>
          <motion.p {...enter(0.2)} className="mt-4 text-body sm:text-h3 text-ink-soft max-w-md">
            AI-powered lead intelligence for your sales team
          </motion.p>
        </div>

        <ul className="hidden md:grid grid-cols-3 gap-3 lg:gap-4" aria-label="Highlights">
          {STATS.map(({ icon: Icon, value, label }, i) => (
            <motion.li key={label} {...enter(0.35 + i * 0.12, 24)}>
              <motion.div
                animate={reduce ? undefined : { y: [0, -6, 0] }}
                transition={reduce ? undefined : { duration: 5 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.6 }}
                className="h-full rounded-card border border-border bg-surface/60 backdrop-blur-md p-4 shadow-md"
              >
                <Icon size={18} strokeWidth={1.5} className="text-accent-ink" aria-hidden="true" />
                <p className="mt-3 font-display font-semibold text-kpi tracking-tight tnum">{value}</p>
                <p className="text-body font-medium">{label}</p>
              </motion.div>
            </motion.li>
          ))}
        </ul>
      </section>

      {/* ---------- Form panel ---------- */}
      <main className="relative bg-surface grid place-items-center px-6 py-12 sm:px-10">
        <div className="absolute top-4 right-4"><ThemeToggle /></div>

        <motion.form
          {...enter(0.15)}
          onSubmit={submit}
          noValidate
          aria-labelledby="al-title"
          className="w-full max-w-sm space-y-5"
        >
          <div>
            <h2 id="al-title" className="font-display font-semibold text-h1 tracking-tight">Welcome back</h2>
            <p className="text-body text-ink-soft mt-1">EstateIQ Admin Portal</p>
          </div>

          {error && <p role="alert" className="rounded-control border border-negative bg-negative/10 px-3 py-2 text-small text-ink">{error}</p>}

          <div>
            <label htmlFor="al-email" className="block text-body font-medium mb-1.5">Email <span className="text-negative" aria-hidden="true">*</span></label>
            <input
              id="al-email" type="email" autoComplete="username" value={email}
              onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              aria-required="true" aria-invalid={!!showEmail} aria-describedby={showEmail ? "al-email-err" : undefined}
              className={field(showEmail)}
            />
            {showEmail && <p id="al-email-err" className="text-small text-negative mt-1">{emailErr}</p>}
          </div>

          <div>
            <label htmlFor="al-password" className="block text-body font-medium mb-1.5">Password <span className="text-negative" aria-hidden="true">*</span></label>
            <div className={cn("flex items-center rounded-control border bg-surface focus-within:shadow-focus transition-colors", showPw ? "border-negative" : "border-border focus-within:border-accent")}>
              <input
                id="al-password" type={show ? "text" : "password"} autoComplete="current-password" value={password}
                onChange={(e) => setPassword(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                aria-required="true" aria-invalid={!!showPw} aria-describedby={showPw ? "al-pw-err" : undefined}
                className="flex-1 min-w-0 h-11 px-3 bg-transparent border-0 outline-none shadow-none focus-visible:shadow-none text-body"
              />
              <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}
                className="h-11 w-11 grid place-items-center text-ink-soft hover:text-ink rounded-control">
                {show ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
              </button>
            </div>
            {showPw && <p id="al-pw-err" className="text-small text-negative mt-1">{pwErr}</p>}
          </div>

          <motion.button
            type="submit"
            disabled={busy}
            whileHover={reduce ? undefined : { scale: 1.02, y: -1 }}
            whileTap={reduce ? undefined : { scale: 0.98 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            className="group w-full h-12 inline-flex items-center justify-center gap-2 rounded-control font-medium text-body text-on-accent
                       bg-gradient-to-r from-accent to-glow-purple shadow-md hover:shadow-lg hover:brightness-105 transition-[box-shadow,filter]"
          >
            {busy ? "Signing in…" : "Sign in"}
            <ArrowRight size={18} strokeWidth={1.75} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </motion.button>
        </motion.form>
      </main>
    </div>
  );
}
