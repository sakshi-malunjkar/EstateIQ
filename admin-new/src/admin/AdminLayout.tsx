import { Outlet, useLocation } from "react-router-dom";
import { Search } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NAV } from "./nav";
import { AdminSidebar } from "./AdminSidebar";
import { TypewriterTitle } from "./components/TypewriterTitle";

/**
 * Company dashboard shell (§11). Desktop-first: full sidebar ≥ lg (collapsible), icon rail on tablet.
 * One role (rev 3): admin sees every item.
 */
export function AdminLayout() {
  const { pathname } = useLocation();
  const current = NAV.find((n) => (n.to === "/" ? pathname === "/" : pathname.startsWith(n.to)));

  return (
    <div className="min-h-screen bg-bg text-ink flex">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-tooltip focus:bg-surface focus:px-3 focus:py-2 focus:rounded-control">
        Skip to content
      </a>

      <AdminSidebar />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-sticky-nav h-16 bg-bg/90 backdrop-blur border-b border-border flex items-center gap-4 px-4 lg:px-8">
          <h1 className="font-display font-semibold text-h2 tracking-tight truncate"><TypewriterTitle text={current?.label ?? "Dashboard"} /></h1>
          <label className="ml-auto hidden md:flex items-center gap-2 h-9 w-72 px-3 rounded-control border border-border bg-surface focus-within:shadow-focus">
            <Search size={16} strokeWidth={1.5} className="text-ink-muted" aria-hidden="true" />
            <span className="sr-only">Search leads by name or phone</span>
            <input type="search" placeholder="Search name or phone" className="flex-1 bg-transparent outline-none text-body placeholder:text-ink-muted" />
          </label>
          <div className="ml-auto md:ml-0 flex items-center gap-3">
            <ThemeToggle />
            <span className="w-9 h-9 rounded-pill bg-surface-hover border border-border grid place-items-center text-small font-semibold" aria-label="Signed in as Admin">
              AD
            </span>
          </div>
        </header>

        <main id="admin-main" className="flex-1 px-4 lg:px-8 py-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
