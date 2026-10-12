import { AppMotion } from "@/lib/AppMotion";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, type Transition } from "motion/react";
import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { cn } from "@/lib/utils";
import { NAV } from "./nav";
import { logout } from "./auth";
import { Button } from "@/components/Button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

/** Rail widths (layout constants, not spacing tokens). */
const WIDE = 240;
const RAIL = 72;
const SPRING: Transition = { type: "spring", bounce: 0.2, duration: 0.5 };
const KEY = "eq-admin-sidebar-collapsed";

const readCollapsed = () => {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
};

/** True at ≥ 1024px (lg). Below that the sidebar is always the icon rail (tablet). */
function useLg() {
  const q = "(min-width: 1024px)";
  const [lg, setLg] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setLg(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return lg;
}

/**
 * Admin sidebar (§11). A shared highlight (layoutId) glides to the active row on a spring; the
 * rail collapses 240 → 72px with labels fading out and tooltips taking over.
 * MotionConfig reducedMotion="user" turns the springs into instant changes under reduced motion.
 */
export function AdminSidebar() {
  const lg = useLg();
  const [pref, setPref] = useState(readCollapsed);
  const collapsed = !lg || pref;
  const navRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const [confirmOut, setConfirmOut] = useState(false);
  const doLogout = async () => { await logout(); setConfirmOut(false); navigate("/login", { replace: true }); };

  const toggle = () => {
    setPref((p) => {
      try { localStorage.setItem(KEY, p ? "0" : "1"); } catch { /* storage blocked — keep in memory */ }
      return !p;
    });
  };

  // Arrow keys move between nav items (Tab still walks them in order).
  const onKeyDown = (e: KeyboardEvent) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const links = [...(navRef.current?.querySelectorAll<HTMLAnchorElement>("a") ?? [])];
    const i = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (i < 0) return;
    e.preventDefault();
    const next = e.key === "Home" ? 0 : e.key === "End" ? links.length - 1 : (i + (e.key === "ArrowDown" ? 1 : -1) + links.length) % links.length;
    links[next].focus();
  };

  return (
    <AppMotion>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? RAIL : WIDE }}
        transition={SPRING}
        className="sticky top-0 h-screen shrink-0 bg-surface border-r border-border flex flex-col z-dropdown"
      >
        <div className={cn("pt-5 pb-4 flex flex-col gap-2", collapsed ? "items-center px-2" : "items-start px-5")}>
          <BrandMark wordmark={!collapsed} />
          <span className="text-small font-medium px-2 h-6 inline-flex items-center rounded-pill border border-accent text-accent-ink bg-accent-soft">
            Admin
          </span>
        </div>

        <nav
          ref={navRef}
          aria-label="Dashboard"
          onKeyDown={onKeyDown}
          className={cn("flex-1 px-3 space-y-1", collapsed ? "overflow-visible" : "overflow-y-auto")}
        >
          {NAV.map(({ to, label, icon: Icon, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              aria-label={collapsed ? (badge ? `${label}, ${badge} new` : label) : undefined}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3 h-10 rounded-control text-body outline-none",
                  "focus-visible:shadow-focus transition-colors duration-fast",
                  collapsed ? "justify-center px-0" : "px-3",
                  isActive ? "text-accent-ink font-medium" : "text-ink-soft hover:text-ink hover:bg-surface-hover",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="admin-nav-pill"
                      transition={SPRING}
                      className="absolute inset-0 rounded-control bg-accent-soft"
                      aria-hidden="true"
                    >
                      <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-pill bg-accent" />
                    </motion.span>
                  )}
                  <Icon
                    size={20}
                    strokeWidth={1.5}
                    aria-hidden="true"
                    className="relative shrink-0 transition-transform duration-fast group-hover:translate-x-0.5"
                  />
                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.span
                        key="label"
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -4 }}
                        transition={{ duration: 0.15 }}
                        className="relative flex-1 whitespace-nowrap"
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {badge ? (
                    <span
                      className={cn(
                        "relative rounded-pill bg-accent-soft text-accent-ink text-small font-medium tnum grid place-items-center",
                        collapsed ? "absolute top-0.5 right-1 min-w-4 h-4 px-1" : "min-w-5 h-5 px-1.5",
                        isActive && "bg-surface",
                      )}
                      aria-hidden={collapsed || undefined}
                    >
                      {badge}
                      {!collapsed && <span className="sr-only"> new</span>}
                    </span>
                  ) : null}
                  {collapsed && (
                    // Tooltip: visible on hover or keyboard focus while collapsed.
                    <span
                      role="tooltip"
                      className="pointer-events-none absolute left-full ml-3 px-2 h-7 inline-flex items-center rounded-control bg-ink text-surface text-small whitespace-nowrap shadow-sm z-tooltip opacity-0 -translate-x-1 transition duration-fast group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0"
                    >
                      {label}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className={cn("p-3 border-t border-border space-y-1", collapsed && "flex flex-col items-center")}>
          {lg && (
            <button
              type="button"
              onClick={toggle}
              aria-pressed={pref}
              aria-label={pref ? "Expand sidebar" : "Collapse sidebar"}
              className={cn(
                "group flex items-center gap-3 h-10 rounded-control text-body text-ink-soft hover:text-ink hover:bg-surface-hover transition-colors duration-fast",
                collapsed ? "w-10 justify-center" : "w-full px-3",
              )}
            >
              {pref ? <PanelLeftOpen size={20} strokeWidth={1.5} aria-hidden="true" /> : <PanelLeftClose size={20} strokeWidth={1.5} aria-hidden="true" />}
              {!collapsed && <span className="whitespace-nowrap">Collapse</span>}
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirmOut(true)}
            aria-label={collapsed ? "Log out" : undefined}
            title={collapsed ? "Log out" : undefined}
            className={cn(
              "group flex items-center gap-3 h-10 rounded-control text-body text-ink-soft hover:text-ink hover:bg-surface-hover transition-colors duration-fast",
              collapsed ? "w-10 justify-center" : "w-full px-3",
            )}
          >
            <LogOut size={20} strokeWidth={1.5} aria-hidden="true" />
            {!collapsed && <span className="whitespace-nowrap">Log out</span>}
          </button>
        </div>

        <Dialog open={confirmOut} onOpenChange={setConfirmOut}>
          {confirmOut && (
            <DialogContent className="max-w-sm">
              <DialogTitle>Log out?</DialogTitle>
              <DialogDescription>You'll need to sign in again to open the dashboard.</DialogDescription>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setConfirmOut(false)}>Cancel</Button>
                <Button onClick={doLogout}><LogOut size={16} strokeWidth={1.5} /> Log out</Button>
              </div>
            </DialogContent>
          )}
        </Dialog>
      </motion.aside>
    </AppMotion>
  );
}
