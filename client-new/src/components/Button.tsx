import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const styles: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:brightness-105", // orange is reserved for primary CTAs
  secondary: "bg-surface text-ink border border-border hover:bg-surface-hover",
  ghost: "bg-transparent text-ink-soft hover:text-ink",
};

export function Button({ variant = "primary", className = "", children, ...rest }: Props) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 h-10 px-4 rounded-control text-body font-semibold transition active:scale-[0.98] whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
