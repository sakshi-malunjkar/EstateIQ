import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { AlertTriangle, Phone, PhoneOff, Mic, MicOff, X, Check } from "lucide-react";
import { Button } from "@/components/Button";

const VAPI_PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY as string | undefined;
const VAPI_ASSISTANT_ID = import.meta.env.VITE_VAPI_ASSISTANT_ID as string | undefined;
const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000").replace(/\/$/, "");

/** Minimal view of the Vapi web client (the SDK's own types are loose about event payloads). */
interface VapiClient {
  start(assistantId: string): Promise<unknown>;
  stop(): void;
  setMuted(muted: boolean): void;
  on(event: string, cb: (...args: any[]) => void): unknown; // eslint-disable-line @typescript-eslint/no-explicit-any
  removeAllListeners?(): unknown;
}
type Line = { role: "assistant" | "user"; text: string };

/** Whatever shape Vapi / Daily / the browser hands us, down to one readable sentence. */
function errorText(e: unknown): string {
  const x = e as { error?: { message?: unknown; msg?: unknown } | string; message?: unknown; errorMsg?: unknown } | string | null | undefined;
  const raw =
    typeof x === "string" ? x
    : typeof x?.error === "string" ? x.error
    : x?.error?.message ?? x?.error?.msg ?? x?.message ?? x?.errorMsg;
  const text = typeof raw === "string" ? raw : "";
  if (/permission|notallowed|denied/i.test(text)) return "Microphone access was blocked. Allow the microphone in your browser and try again.";
  return text || "We couldn't connect the call. Please try again.";
}

/** Hand the finished call to the same webhook Vapi posts to, so the backend scores it and saves the lead. */
async function saveLead(lines: Line[], who: { name: string; digits: string }) {
  const res = await fetch(`${API_URL}/webhook/vapi`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "1" },
    body: JSON.stringify({
      message: {
        type: "end-of-call-report",
        artifact: { messages: lines.map((l) => ({ role: l.role, message: l.text })) },
        call: { id: `web-${Date.now()}`, customer: { number: `+91${who.digits}`, name: who.name } },
      },
    }),
  });
  if (!res.ok) throw new Error(`Backend responded ${res.status}`);
}

/**
 * The "Call the agent" widget (§9, §17.4, §22.6). Floating pill -> consent + phone ->
 * connecting -> on call (live Vapi voice call) -> thank-you, or an error with a retry.
 * Phone is the identity key, so it's validated (10 digits, first 6-9). The Vapi SDK is
 * loaded only when a call starts, so it stays off the first-paint path (§17.5).
 */
export function CallWidget({
  open,
  onOpen,
  onClose,
  presetProject,
  askName = false,
  hasBottomNav = true,
  pillHidden = false,
}: {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  presetProject?: string | null;
  /** Public site: we don't know the caller yet, so ask name + mobile (empty). The client app
   *  already knows them, so it keeps the pre-filled number and no name field. */
  askName?: boolean;
  /** The client app has a mobile bottom tab bar; the public site doesn't. */
  hasBottomNav?: boolean;
  /** Landing (§17.6): hide the floating pill while another call button is on screen. */
  pillHidden?: boolean;
}) {
  const [stage, setStage] = useState<"form" | "connecting" | "calling" | "done" | "error">("form");
  const [errorMsg, setErrorMsg] = useState("");
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const vapiRef = useRef<VapiClient | null>(null);
  const callRef = useRef(0); // identifies the current call, so a late event from an old one is ignored
  const linesRef = useRef<Line[]>([]);
  const whoRef = useRef({ name: "", digits: "" });
  const [consent, setConsent] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState(askName ? "" : "98765 43210");
  // §23.1: validate on blur, and everything once they try to start.
  const [touched, setTouched] = useState({ name: false, phone: false });
  const [tried, setTried] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);

  const digits = phone.replace(/\D/g, "");
  const valid = /^[6-9]\d{9}$/.test(digits);
  const nameOk = !askName || name.trim().length > 0;
  const showPhoneErr = !valid && (touched.phone || tried);
  const showNameErr = !nameOk && (touched.name || tried);

  // Strip anything that isn't a digit; display as "98765 43210".
  const onPhone = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 10);
    setPhone(d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5)}` : d);
  };

  const stopCall = () => {
    callRef.current++; // anything the old call still emits is now ignored
    try { vapiRef.current?.stop(); } catch { /* already ended */ }
    vapiRef.current = null;
  };

  const fail = (id: number, e: unknown) => {
    if (id !== callRef.current) return;
    console.error("Vapi call failed:", e);
    stopCall();
    setErrorMsg(errorText(e));
    setStage("error");
  };

  const finish = (id: number) => {
    if (id !== callRef.current) return;
    const lines = linesRef.current;
    vapiRef.current = null;
    callRef.current++;
    setAssistantSpeaking(false);
    setStage("done");
    if (lines.length) {
      saveLead(lines, whoRef.current).catch((e) => { console.error("Could not save the lead:", e); setSaveFailed(true); });
    }
  };

  const begin = async () => {
    if (!VAPI_PUBLIC_KEY || !VAPI_ASSISTANT_ID) {
      setErrorMsg("The call service isn't set up yet (missing VITE_VAPI_PUBLIC_KEY / VITE_VAPI_ASSISTANT_ID).");
      setStage("error");
      return;
    }
    const id = ++callRef.current;
    linesRef.current = [];
    whoRef.current = { name: name.trim(), digits };
    setSaveFailed(false);
    setMuted(false);
    setAssistantSpeaking(false);
    setStage("connecting");
    try {
      // @vapi-ai/web is CommonJS: depending on the bundler the default export is the class or a wrapper around it.
      const mod = (await import("@vapi-ai/web")) as unknown as { default: unknown };
      const Vapi = ((mod.default as { default?: unknown })?.default ?? mod.default) as new (key: string) => VapiClient;
      if (id !== callRef.current) return; // closed while the SDK was loading
      const v = new Vapi(VAPI_PUBLIC_KEY);
      vapiRef.current = v;
      v.on("call-start", () => { if (id === callRef.current) setStage("calling"); });
      v.on("call-end", () => finish(id));
      v.on("speech-start", () => { if (id === callRef.current) setAssistantSpeaking(true); });
      v.on("speech-end", () => { if (id === callRef.current) setAssistantSpeaking(false); });
      v.on("message", (m: { type?: string; transcriptType?: string; role?: string; transcript?: string }) => {
        // final transcripts only, so each utterance is kept once
        if (id === callRef.current && m.type === "transcript" && m.transcriptType === "final" && m.transcript) {
          linesRef.current.push({ role: m.role === "assistant" ? "assistant" : "user", text: m.transcript });
        }
      });
      v.on("error", (e: unknown) => fail(id, e));
      await v.start(VAPI_ASSISTANT_ID);
    } catch (e) {
      fail(id, e);
    }
  };

  const start = () => {
    setTried(true);
    if (!nameOk) { document.getElementById("cw-name")?.focus(); return; }
    if (!valid) { document.getElementById("cw-phone")?.focus(); return; }
    if (consent) void begin();
  };

  // Only the call timer is local now; the call itself is driven by Vapi's events.
  useEffect(() => {
    if (stage === "calling") {
      setSeconds(0);
      const t = setInterval(() => setSeconds((s) => s + 1), 1000);
      return () => clearInterval(t);
    }
  }, [stage]);

  // Leaving the page ends the call.
  useEffect(() => () => { callRef.current++; try { vapiRef.current?.stop(); } catch { /* already ended */ } }, []);

  const toggleMute = () => {
    const next = !muted;
    vapiRef.current?.setMuted(next);
    setMuted(next);
  };

  const close = () => {
    stopCall(); // closing the dialog hangs up
    onClose();
    setTimeout(() => {
      setStage("form"); setConsent(false); setMuted(false); setErrorMsg(""); setSaveFailed(false);
      setTried(false); setTouched({ name: false, phone: false });
    }, 200);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Focus the first field on open; keep Tab inside the dialog.
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) document.getElementById(askName ? "cw-name" : "cw-phone")?.focus();
  }, [open, askName]);
  const trapFocus = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !dialogRef.current) return;
    const els = dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), input, [href], [tabindex]:not([tabindex='-1'])");
    if (!els.length) return;
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const speaking = stage === "calling" && assistantSpeaking;
  const timer = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const announce =
    stage === "connecting" ? "Connecting call" : stage === "calling" ? "Call connected" : stage === "done" ? "Call ended" : stage === "error" ? "Call failed" : "";

  if (!open) {
    // Outer div slides/fades (transform + opacity); inner button keeps its own breathe animation —
    // two elements so the two transforms never fight.
    return (
      <div
        aria-hidden={pillHidden || undefined}
        className={`fixed ${hasBottomNav ? "bottom-20" : "bottom-4"} md:bottom-6 right-4 md:right-6 z-widget transition duration-base ease-out ${
          pillHidden ? "translate-y-6 opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
        }`}
      >
        <button
          onClick={onOpen}
          tabIndex={pillHidden ? -1 : undefined}
          className="inline-flex items-center gap-2 h-12 pl-4 pr-5 rounded-pill bg-ink text-surface shadow-lg eq-breathe"
        >
          <Phone size={18} strokeWidth={1.5} />
          <span className="font-semibold text-body">Call the agent</span>
        </button>
      </div>
    );
  }

  return (
    <>
    <div className="fixed inset-0 z-modal-backdrop bg-scrim/60 backdrop-blur-sm eq-fade eq-pop-backdrop" onClick={close} aria-hidden="true" />
    <div className="fixed inset-0 z-modal grid place-items-center p-4 pointer-events-none">
      <div ref={dialogRef} onKeyDown={trapFocus} role="dialog" aria-modal="true" aria-labelledby="cw-title" className="pointer-events-auto relative w-full max-w-sm bg-surface rounded-card border border-border shadow-md p-6 eq-pop">
        <p className="sr-only" aria-live="polite">{announce}</p>
        <div className="flex items-center justify-between mb-4">
          <h3 id="cw-title" className="font-semibold text-h3">Call the property assistant</h3>
          <button onClick={close} aria-label="Close" className="text-ink-muted hover:text-ink"><X size={20} /></button>
        </div>

        {stage === "form" && (
          <div className="space-y-4">
            {presetProject && <p className="text-body text-ink-soft">About <span className="text-ink font-medium">{presetProject}</span></p>}
            {askName && (
              <div>
                <label htmlFor="cw-name" className="text-body text-ink-soft">Your name <span aria-hidden="true">*</span></label>
                <input
                  id="cw-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                  autoComplete="name"
                  aria-required="true"
                  aria-invalid={showNameErr}
                  aria-describedby={showNameErr ? "cw-name-err" : undefined}
                  className={`mt-1.5 w-full h-10 px-3 rounded-control border bg-surface text-body outline-none focus-visible:shadow-focus ${showNameErr ? "border-negative" : "border-border"}`}
                />
                {showNameErr && <p id="cw-name-err" className="text-small text-negative mt-1">Enter your name.</p>}
              </div>
            )}
            <div>
              <label htmlFor="cw-phone" className="text-body text-ink-soft">Your mobile number <span aria-hidden="true">*</span></label>
              <div className={`flex items-center mt-1.5 rounded-control border overflow-hidden focus-within:shadow-focus ${showPhoneErr ? "border-negative" : "border-border"}`}>
                <span className="px-3 text-body text-ink-soft bg-bg h-10 grid place-items-center border-r border-border" aria-hidden="true">+91</span>
                <input
                  id="cw-phone"
                  value={phone}
                  onChange={(e) => onPhone(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                  inputMode="numeric"
                  autoComplete="tel-national"
                  aria-required="true"
                  aria-invalid={showPhoneErr}
                  aria-describedby={showPhoneErr ? "cw-phone-err" : undefined}
                  className="flex-1 h-10 px-3 text-body bg-surface outline-none tnum"
                  placeholder="98765 43210"
                />
                {valid && <Check size={16} strokeWidth={1.5} className="mr-3 text-positive" aria-label="Valid number" />}
              </div>
              {showPhoneErr && <p id="cw-phone-err" className="text-small text-negative mt-1">Enter a 10-digit mobile number.</p>}
            </div>
            <label className="flex items-start gap-2.5 text-body text-ink-soft cursor-pointer">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-accent" />
              This call is transcribed to help us serve you. We don't store audio.
            </label>
            {/* §23.3: the call stays inert until consent is given. */}
            <Button className="w-full" onClick={start} aria-disabled={!consent} disabled={!consent}>
              <Phone size={16} strokeWidth={1.5} /> Start call
            </Button>
            {!consent && <p className="text-small text-ink-muted text-center">Tick the box above to start the call.</p>}
          </div>
        )}

        {stage === "connecting" && (
          <div className="py-10 flex flex-col items-center text-center">
            <div className="flex gap-1.5 mb-4" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-2.5 h-2.5 rounded-pill bg-accent eq-dot" style={{ "--i": i } as CSSProperties} />
              ))}
            </div>
            <p className="font-semibold">Connecting…</p>
          </div>
        )}

        {stage === "calling" && (
          <div className="py-6 flex flex-col items-center text-center">
            <div className="relative w-20 h-20 grid place-items-center mb-4">
              {!speaking && !muted && (
                <>
                  <span className="absolute inset-0 rounded-pill bg-accent-soft eq-ring" />
                  <span className="absolute inset-0 rounded-pill bg-accent-soft eq-ring" style={{ animationDelay: ".8s" }} />
                </>
              )}
              <span className="relative w-14 h-14 rounded-pill bg-accent text-on-accent grid place-items-center">
                {speaking ? (
                  <span className="flex items-end gap-0.5 h-6" aria-hidden="true">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span key={i} className="w-1 h-full rounded-pill bg-surface eq-eq" style={{ "--i": i } as CSSProperties} />
                    ))}
                  </span>
                ) : muted ? <MicOff size={24} strokeWidth={1.5} /> : <Mic size={24} strokeWidth={1.5} />}
              </span>
            </div>
            <p className="font-semibold">On call…</p>
            <p className="text-small text-ink-soft">{muted ? "Muted" : speaking ? "Assistant is speaking…" : "Listening…"}</p>
            <p className="text-small text-ink-muted tnum mt-0.5" aria-label={`Call time ${timer}`}>{timer}</p>
            <p className="text-body text-ink-soft mt-2">Speak naturally — in Hindi, Marathi or English.</p>
            <div className="flex gap-2 mt-5">
              <Button variant="secondary" className="h-9" aria-pressed={muted} onClick={toggleMute}>
                {muted ? <MicOff size={16} strokeWidth={1.5} /> : <Mic size={16} strokeWidth={1.5} />} {muted ? "Unmute" : "Mute"}
              </Button>
              <Button className="h-9 bg-negative" onClick={() => { try { vapiRef.current?.stop(); } catch { /* already ended */ } }}>
                <PhoneOff size={16} strokeWidth={1.5} /> Hang up
              </Button>
            </div>
          </div>
        )}

        {stage === "done" && (
          <div className="py-6 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-pill bg-positive/15 text-positive grid place-items-center mb-4"><Check size={28} strokeWidth={1.5} /></div>
            <p className="font-semibold">Thanks for calling!</p>
            <p className="text-body text-ink-soft mt-1">We're matching homes to what you asked about. You'll see them in your enquiries shortly.</p>
            {saveFailed && <p role="status" className="text-small text-ink-muted mt-2">We couldn't save the call automatically. Our team may not see this enquiry.</p>}
            <Button variant="secondary" className="h-9 mt-5" onClick={close}>Done</Button>
          </div>
        )}

        {stage === "error" && (
          <div className="py-6 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-pill bg-negative/15 text-negative grid place-items-center mb-4"><AlertTriangle size={28} strokeWidth={1.5} /></div>
            <p className="font-semibold">The call didn't connect</p>
            <p role="alert" className="text-body text-ink-soft mt-1 max-w-xs">{errorMsg}</p>
            <div className="flex gap-2 mt-5">
              <Button variant="secondary" className="h-9" onClick={close}>Close</Button>
              <Button className="h-9" onClick={() => { setStage("form"); setErrorMsg(""); }}>Try again</Button>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
