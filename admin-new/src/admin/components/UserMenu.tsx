import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { logout, useAdminSession } from "../auth";

const initials = (name: string, email: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const src = parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] ?? email).slice(0, 2);
  return src.toUpperCase();
};

/** Profile avatar → menu with the signed-in email, Change password and Log out. */
export function UserMenu() {
  const session = useAdminSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  // Close on a click outside or Esc (focus goes back to the avatar).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  // Opening puts focus on the first item, so the menu is usable from the keyboard.
  useEffect(() => {
    if (open) wrap.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open]);

  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    const i = items.indexOf(document.activeElement as HTMLElement);
    items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
  };

  if (!session) return null;

  const changePassword = () => { setOpen(false); navigate("/settings#change-password"); };
  const signOut = async () => {
    setBusy(true);
    await logout();
    setOpen(false);
    navigate("/login", { replace: true });
  };

  const item = "w-full flex items-center gap-2 h-9 px-3 rounded-control text-body text-ink text-left outline-none hover:bg-surface-hover focus-visible:bg-surface-hover disabled:opacity-50";

  return (
    <div ref={wrap} className="relative">
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Account menu, signed in as ${session.email}`}
        className={cn(
          "w-9 h-9 rounded-pill bg-surface-hover border grid place-items-center text-small font-semibold cursor-pointer outline-none focus-visible:shadow-focus",
          open ? "border-accent" : "border-border",
        )}
      >
        {initials(session.name, session.email)}
      </button>

      {open && (
        <div id={menuId} role="menu" aria-label="Account" onKeyDown={onMenuKey}
          className="absolute right-0 top-full mt-2 w-64 p-1 rounded-control border border-border bg-surface text-ink shadow-md z-dropdown eq-fade">
          <div className="px-3 py-2 border-b border-border mb-1">
            <p className="text-small text-ink-muted">Signed in as</p>
            <p className="text-body font-medium truncate" title={session.email}>{session.email}</p>
          </div>
          <button type="button" role="menuitem" className={item} onClick={changePassword}>
            <KeyRound size={16} strokeWidth={1.5} aria-hidden="true" /> Change password
          </button>
          <button type="button" role="menuitem" className={item} onClick={signOut} disabled={busy}>
            <LogOut size={16} strokeWidth={1.5} aria-hidden="true" /> {busy ? "Logging out…" : "Log out"}
          </button>
        </div>
      )}
    </div>
  );
}
