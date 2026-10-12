/** EstateIQ — tokens mapped from the design system (src/styles/tokens.css is the source of truth). */
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-hover": "rgb(var(--surface-hover) / <alpha-value>)",
        "surface-dark": "rgb(var(--surface-dark) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        "ink-soft": "rgb(var(--ink-soft) / <alpha-value>)",
        "ink-muted": "rgb(var(--ink-muted) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        hot: "rgb(var(--hot) / <alpha-value>)",
        warm: "rgb(var(--warm) / <alpha-value>)",
        cold: "rgb(var(--cold) / <alpha-value>)",
        positive: "rgb(var(--positive) / <alpha-value>)",
        neutral: "rgb(var(--neutral) / <alpha-value>)",
        negative: "rgb(var(--negative) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-soft": "rgb(var(--accent-soft) / <alpha-value>)",
        "accent-ink": "rgb(var(--accent-ink) / <alpha-value>)", // orange TEXT (contrast-safe per theme)
        "on-accent": "rgb(var(--on-accent) / <alpha-value>)", // text on accent fills
        scrim: "rgb(var(--scrim) / <alpha-value>)", // fixed dark for media overlays
        "on-scrim": "rgb(var(--on-scrim) / <alpha-value>)", // fixed light text on scrims
        "pastel-yellow": "rgb(var(--pastel-yellow) / <alpha-value>)",
        "pastel-green": "rgb(var(--pastel-green) / <alpha-value>)",
        "pastel-pink": "rgb(var(--pastel-pink) / <alpha-value>)",
        "pastel-lavender": "rgb(var(--pastel-lavender) / <alpha-value>)",
        "glow-orange": "rgb(var(--glow-orange) / <alpha-value>)",
        "glow-purple": "rgb(var(--glow-purple) / <alpha-value>)",
      },
      borderRadius: {
        control: "var(--radius-control)",
        card: "var(--radius-card)",
        pill: "var(--radius-pill)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Inter Tight", "Inter", "system-ui", "sans-serif"],
        text: ["Inter", "Noto Sans Devanagari", "sans-serif"],
      },
      aspectRatio: {
        wide: "2 / 1",
      },
      fontSize: {
        display: ["var(--text-display)", { lineHeight: "1.05", letterSpacing: "-0.04em" }],
        "display-lg": ["var(--text-display-lg)", { lineHeight: "1.05", letterSpacing: "-0.04em" }],
        h1: ["var(--text-h1)", { lineHeight: "var(--leading-heading)" }],
        h2: ["var(--text-h2)", { lineHeight: "var(--leading-heading)" }],
        h3: ["var(--text-h3)", { lineHeight: "var(--leading-heading)" }],
        body: ["var(--text-body)", { lineHeight: "var(--leading-body)" }],
        small: ["var(--text-small)", { lineHeight: "var(--leading-body)" }],
        kpi: ["var(--text-kpi)", { lineHeight: "var(--leading-heading)" }],
      },
      zIndex: {
        "sticky-nav": "var(--z-sticky-nav)",
        dropdown: "var(--z-dropdown)",
        widget: "var(--z-widget)",
        "modal-backdrop": "var(--z-modal-backdrop)",
        modal: "var(--z-modal)",
        toast: "var(--z-toast)",
        tooltip: "var(--z-tooltip)",
      },
      transitionTimingFunction: {
        out: "var(--ease-out)",
      },
      transitionDuration: {
        fast: "var(--dur-fast)",
        base: "var(--dur-base)",
        slow: "var(--dur-slow)",
        reveal: "var(--dur-reveal)",
      },
      boxShadow: {
        focus: "var(--focus-ring)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
    },
  },
  plugins: [],
};
