import type { KeyboardEvent, ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = "", onClick }: Props) {
  const interactive = onClick ? "cursor-pointer hover:bg-surface-hover transition" : "";
  // Clickable cards must be keyboard-operable too (§15).
  const a11y = onClick
    ? {
        role: "button",
        tabIndex: 0,
        onKeyDown: (e: KeyboardEvent) => {
          if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onClick();
          }
        },
      }
    : {};
  return (
    <div onClick={onClick} {...a11y} className={`bg-surface border border-border rounded-card ${interactive} ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between mb-3">
      <h2 className="font-semibold text-h2">{children}</h2>
      {action}
    </div>
  );
}
