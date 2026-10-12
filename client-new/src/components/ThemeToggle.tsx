import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

/**
 * Sun / moon toggle. Inherits colour from its context (text-ink), so it works on the light pill
 * and on dark glass. The label names the action, and aria-pressed reports dark mode.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Light theme" : "Dark theme"}
      className={`h-10 w-10 grid place-items-center rounded-pill border border-border text-ink-soft transition hover:text-ink hover:border-ink/30 ${className}`}
    >
      {dark ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
    </button>
  );
}
