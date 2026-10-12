import { useId, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogOut, ShieldCheck } from "lucide-react";
import { useTheme, type ThemeMode } from "@/lib/theme";
import { setForcedReducedMotion, useForcedReducedMotion } from "@/lib/motion";
import { Button } from "@/components/Button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { changePassword, logout, updateProfile, useAdminSession } from "../auth";
import { START_PAGES, saveAdminPrefs, useAdminPrefs, type DefaultRange } from "../prefs";
import { useToast } from "../components/Toast";
import { FilterTabs } from "./Overview";

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/** Settings (§11.9, trimmed to rev 3): Account · Appearance & preferences · Log out. Mock state. */
export function Settings() {
  const toast = useToast();
  return (
    <div className="max-w-3xl space-y-6">
      <AccountSection onSaved={toast.show} />
      <AppearanceSection onSaved={toast.show} />
      <LogoutSection />
      {toast.node}
    </div>
  );
}

/* ---------------- shared bits (§23 form patterns) ---------------- */

function Card({ title, sub, children, tone }: { title: string; sub?: string; children: ReactNode; tone?: "danger" }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={cn("rounded-card border bg-surface", tone === "danger" ? "border-negative/40" : "border-border")}>
      <div className="px-5 py-4 border-b border-border">
        <h2 id={id} className="font-semibold text-h3">{title}</h2>
        {sub && <p className="text-small text-ink-muted mt-0.5">{sub}</p>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Field({ id, label, required, error, hint, children }: { id: string; label: string; required?: boolean; error?: string | false | null; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-body font-medium text-ink mb-1.5">
        {label} {required && <span className="text-negative" aria-hidden="true">*</span>}
      </label>
      {children}
      {error ? <p id={`${id}-err`} className="text-small text-negative mt-1">{error}</p> : hint ? <p id={`${id}-hint`} className="text-small text-ink-muted mt-1">{hint}</p> : null}
    </div>
  );
}

const input = (bad: unknown) =>
  cn(
    "w-full h-10 px-3 rounded-control border bg-surface text-body text-ink outline-none placeholder:text-ink-muted focus-visible:shadow-focus",
    bad ? "border-negative" : "border-border focus-visible:border-accent",
  );

/* ---------------- 1. Account ---------------- */

function AccountSection({ onSaved }: { onSaved: (m: string) => void }) {
  const session = useAdminSession();
  const [name, setName] = useState(session?.name ?? "");
  const [email, setEmail] = useState(session?.email ?? "");
  const [triedProfile, setTriedProfile] = useState(false);
  const nameErr = !name.trim() ? "Enter your name." : null;
  const emailErr = !email.trim() ? "Enter your email." : !emailOk(email) ? "Enter a valid email address." : null;

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setTriedProfile(true);
    if (nameErr) { document.getElementById("st-name")?.focus(); return; }
    if (emailErr) { document.getElementById("st-email")?.focus(); return; }
    const perr = await updateProfile(name, email);
    onSaved(perr ?? (email.trim().toLowerCase() !== session?.email.toLowerCase() ? "Profile saved. Confirm the new email from the link we sent." : "Profile saved."));
  };

  // Change password
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [triedPw, setTriedPw] = useState(false);
  const [pwServerErr, setPwServerErr] = useState<string | null>(null);
  const curErr = !cur ? "Enter your current password." : pwServerErr;
  const nextErr = !next ? "Enter a new password." : next.length < 8 ? "Use at least 8 characters." : !/\d/.test(next) || !/[a-z]/i.test(next) ? "Include at least one letter and one number." : next === cur ? "Choose a password different from your current one." : null;
  const confirmErr = !confirm ? "Re-enter the new password." : confirm !== next ? "Passwords don't match." : null;

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    setTriedPw(true);
    setPwServerErr(null);
    if (!cur) { document.getElementById("st-cur")?.focus(); return; }
    if (nextErr) { document.getElementById("st-new")?.focus(); return; }
    if (confirmErr) { document.getElementById("st-confirm")?.focus(); return; }
    const err = await changePassword(cur, next);
    if (err) { setPwServerErr(err); document.getElementById("st-cur")?.focus(); return; }
    setCur(""); setNext(""); setConfirm(""); setTriedPw(false);
    onSaved("Password updated.");
  };

  const pwType = show ? "text" : "password";
  return (
    <Card title="Account" sub="Your admin profile and password.">
      <p className="inline-flex items-center gap-2 text-small text-ink-soft mb-5">
        <ShieldCheck size={16} strokeWidth={1.5} className="text-positive" aria-hidden="true" />
        Signed in as <span className="font-medium text-ink">Admin</span> · {session?.email}
      </p>

      <form onSubmit={saveProfile} noValidate className="space-y-4" aria-label="Profile">
        <h3 className="font-medium text-body">Profile</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field id="st-name" label="Name" required error={triedProfile && nameErr}>
            <input id="st-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name"
              aria-required="true" aria-invalid={!!(triedProfile && nameErr)} aria-describedby={triedProfile && nameErr ? "st-name-err" : undefined} className={input(triedProfile && nameErr)} />
          </Field>
          <Field id="st-email" label="Email" required error={triedProfile && emailErr} hint="You sign in with this.">
            <input id="st-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email"
              aria-required="true" aria-invalid={!!(triedProfile && emailErr)} aria-describedby={triedProfile && emailErr ? "st-email-err" : "st-email-hint"} className={input(triedProfile && emailErr)} />
          </Field>
        </div>
        <div className="flex justify-end"><Button type="submit">Save profile</Button></div>
      </form>

      <div className="border-t border-border my-6" />

      <form onSubmit={savePassword} noValidate className="space-y-4" aria-label="Change password">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-medium text-body">Change password</h3>
          <span className="text-small text-ink-muted">Mock — not sent to a server yet.</span>
        </div>
        <Field id="st-cur" label="Current password" required error={triedPw && curErr}>
          <input id="st-cur" type={pwType} value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password"
            aria-required="true" aria-invalid={!!(triedPw && curErr)} aria-describedby={triedPw && curErr ? "st-cur-err" : undefined} className={input(triedPw && curErr)} />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field id="st-new" label="New password" required error={triedPw && nextErr} hint="At least 8 characters, with a letter and a number.">
            <input id="st-new" type={pwType} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password"
              aria-required="true" aria-invalid={!!(triedPw && nextErr)} aria-describedby={triedPw && nextErr ? "st-new-err" : "st-new-hint"} className={input(triedPw && nextErr)} />
          </Field>
          <Field id="st-confirm" label="Confirm new password" required error={triedPw && confirmErr}>
            <input id="st-confirm" type={pwType} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password"
              aria-required="true" aria-invalid={!!(triedPw && confirmErr)} aria-describedby={triedPw && confirmErr ? "st-confirm-err" : undefined} className={input(triedPw && confirmErr)} />
          </Field>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show} className="inline-flex items-center gap-1.5 text-small text-ink-soft hover:text-ink rounded-control">
            {show ? <EyeOff size={14} strokeWidth={1.5} aria-hidden="true" /> : <Eye size={14} strokeWidth={1.5} aria-hidden="true" />}
            {show ? "Hide passwords" : "Show passwords"}
          </button>
          <Button type="submit">Update password</Button>
        </div>
      </form>
    </Card>
  );
}

/* ---------------- 2. Appearance & preferences ---------------- */

function AppearanceSection({ onSaved }: { onSaved: (m: string) => void }) {
  const { mode, setTheme } = useTheme();
  const reduce = useForcedReducedMotion();
  const prefs = useAdminPrefs();
  const [range, setRange] = useState<DefaultRange>(prefs.defaultRange);
  const [start, setStart] = useState(prefs.startPage);

  return (
    <Card title="Appearance & preferences" sub="Theme and motion apply right away; dashboard defaults apply when you save.">
      <div className="space-y-6">
        <Row label="Theme" hint="System follows your device's light / dark setting.">
          <FilterTabs<ThemeMode>
            label="Theme"
            value={mode}
            onChange={(m) => { setTheme(m); onSaved(`Theme: ${m === "system" ? "System" : m === "dark" ? "Dark" : "Light"}.`); }}
            options={[{ id: "light", label: "Light" }, { id: "dark", label: "Dark" }, { id: "system", label: "System" }]}
          />
        </Row>

        <Row label="Reduce motion" hint="Turns off the typewriter titles, chart draw-ins and other animations everywhere — same as your device's reduced-motion setting.">
          <Switch
            id="st-motion"
            label="Reduce motion"
            checked={reduce}
            onChange={(on) => { setForcedReducedMotion(on); onSaved(on ? "Reduced motion on." : "Reduced motion off."); }}
          />
        </Row>

        <form
          onSubmit={(e) => { e.preventDefault(); saveAdminPrefs({ defaultRange: range, startPage: start }); onSaved("Preferences saved."); }}
          className="space-y-6 border-t border-border pt-6"
          aria-label="Dashboard defaults"
        >
          <Row label="Default dashboard date range" hint="What the Dashboard shows when it opens.">
            <FilterTabs<DefaultRange>
              label="Default dashboard date range"
              value={range}
              onChange={setRange}
              options={[{ id: "today", label: "Today" }, { id: "7d", label: "7d" }, { id: "30d", label: "30d" }]}
            />
          </Row>
          <Row label="Start page after sign-in">
            <label htmlFor="st-start" className="sr-only">Start page after sign-in</label>
            <select id="st-start" value={start} onChange={(e) => setStart(e.target.value)} className={cn(input(false), "w-auto min-w-48 cursor-pointer")}>
              {START_PAGES.map((p) => <option key={p.to} value={p.to}>{p.label}</option>)}
            </select>
          </Row>
          <div className="flex justify-end"><Button type="submit">Save preferences</Button></div>
        </form>
      </div>
    </Card>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
      <div className="min-w-0 max-w-sm">
        <p className="text-body font-medium text-ink">{label}</p>
        {hint && <p className="text-small text-ink-muted mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

/** Accessible switch (role="switch"). */
function Switch({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-pill border transition-colors duration-fast focus-visible:shadow-focus",
        checked ? "bg-accent border-accent" : "bg-surface-hover border-border",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block h-5 w-5 rounded-pill shadow-sm transition-transform duration-fast",
          checked ? "translate-x-6 bg-on-accent" : "translate-x-1 bg-ink-soft",
        )}
      />
      <span className="sr-only">{checked ? "On" : "Off"}</span>
    </button>
  );
}

/* ---------------- 3. Log out ---------------- */

function LogoutSection() {
  const [confirm, setConfirm] = useState(false);
  const navigate = useNavigate();
  const doLogout = async () => { await logout(); setConfirm(false); navigate("/login", { replace: true }); };
  return (
    <Card title="Log out" sub="Sign out of the admin dashboard on this browser." tone="danger">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body text-ink-soft">This clears your saved session. You'll need to sign in again.</p>
        <Button variant="secondary" className="border-negative bg-negative/10 text-ink hover:bg-negative/20" onClick={() => setConfirm(true)}>
          <LogOut size={16} strokeWidth={1.5} /> Log out
        </Button>
      </div>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        {confirm && (
          <DialogContent className="max-w-sm">
            <DialogTitle>Log out?</DialogTitle>
            <DialogDescription>You'll need to sign in again to open the dashboard.</DialogDescription>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setConfirm(false)}>Cancel</Button>
              <Button onClick={doLogout}><LogOut size={16} strokeWidth={1.5} /> Log out</Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </Card>
  );
}
