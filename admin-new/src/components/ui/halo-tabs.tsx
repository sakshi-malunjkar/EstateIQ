/**
 * HaloTabs — ported from cult-ui (registry "halo-tabs", built on @base-ui/react Tabs).
 * Rethemed to EstateIQ tokens (DESIGN.md §5.4): the magenta/violet/cyan gradients and shadcn
 * colour names are replaced by --accent / --accent-soft / --surface / --border; Tailwind v4
 * syntax converted to v3. Base UI supplies roles, aria-selected, roving focus + arrow keys,
 * and positions the indicator through --active-tab-* CSS variables.
 */
import type { ComponentProps } from "react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cn } from "@/lib/utils";

export type HaloTabsVariant = "underline" | "pill";

export function HaloTabs({ className, ...props }: ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      {...props}
      className={cn(
        "group/halo-tabs grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-3",
        "data-[orientation=vertical]:flex data-[orientation=vertical]:flex-row data-[orientation=vertical]:gap-4",
        className,
      )}
      data-slot="halo-tabs"
    />
  );
}

export function HaloTabsList({
  className,
  variant = "underline",
  ...props
}: ComponentProps<typeof TabsPrimitive.List> & { variant?: HaloTabsVariant }) {
  return (
    <TabsPrimitive.List
      {...props}
      className={cn(
        "group/halo-tabs-list relative flex w-fit min-w-0 flex-wrap items-center gap-1",
        variant === "underline" &&
          "w-full gap-6 border-b border-border pb-px data-[orientation=vertical]:flex-col data-[orientation=vertical]:gap-2 data-[orientation=vertical]:border-b-0 data-[orientation=vertical]:border-l data-[orientation=vertical]:pb-0 data-[orientation=vertical]:pl-px",
        variant === "pill" && "gap-0 rounded-pill border border-border bg-surface p-1",
        className,
      )}
      data-slot="halo-tabs-list"
      data-variant={variant}
    />
  );
}

export function HaloTabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Tab>) {
  return (
    <TabsPrimitive.Tab
      {...props}
      className={cn(
        "relative z-[1] inline-flex min-h-8 items-center justify-center whitespace-nowrap rounded-control px-3 py-1.5",
        "font-medium text-body text-ink-soft tracking-tight antialiased",
        "outline-none transition-colors duration-base ease-out hover:text-ink",
        "focus-visible:shadow-focus",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-[active]:text-accent-ink",
        "group-data-[variant=pill]/halo-tabs-list:rounded-pill group-data-[variant=pill]/halo-tabs-list:px-4",
        className,
      )}
      data-slot="halo-tabs-trigger"
    />
  );
}

export function HaloTabsIndicator({
  className,
  variant = "underline",
  ...props
}: ComponentProps<typeof TabsPrimitive.Indicator> & { variant?: HaloTabsVariant }) {
  return (
    <TabsPrimitive.Indicator
      {...props}
      className={cn(
        "pointer-events-none absolute z-0 motion-reduce:transition-none",
        // Slight overshoot on the glide — the spring feel, without a JS animation loop.
        "[transition-timing-function:cubic-bezier(.34,1.3,.64,1)]",
        variant === "underline" &&
          "-bottom-px left-[var(--active-tab-left)] h-0.5 w-[var(--active-tab-width)] bg-accent transition-[left,width] duration-slow",
        variant === "pill" &&
          "top-[var(--active-tab-top)] left-[var(--active-tab-left)] h-[var(--active-tab-height)] w-[var(--active-tab-width)] rounded-pill bg-accent-soft ring-1 ring-accent/40 transition-[left,width,top,height] duration-slow",
        className,
      )}
      data-slot="halo-tabs-indicator"
    />
  );
}

export function HaloTabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Panel>) {
  return (
    <TabsPrimitive.Panel
      {...props}
      className={cn("w-full min-w-0 text-body text-ink outline-none", className)}
      data-slot="halo-tabs-content"
    />
  );
}

export type HaloTabsProps = ComponentProps<typeof TabsPrimitive.Root>;
