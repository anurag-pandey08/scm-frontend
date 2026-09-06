import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * A lorry on the road, drawn in `currentColor`.
 *
 * The movement is in globals.css (`truck-loader-*`) rather than here: the
 * wheels have to turn about their own centres, which needs `transform-box`,
 * and the road slides by animating `stroke-dashoffset` — neither of which is a
 * utility class. The drawing is stroked rather than filled so it takes the ink
 * of wherever it is put and reads the same on both themes.
 *
 * The default box is oblong, not square: the lorry is nearly twice as wide as
 * it is tall, and `size-*` would scale it down to fit air it does not occupy.
 */
function TruckLoader({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 100 54"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn("h-14 w-24 text-foreground/80", className)}
      {...props}
    >
      {/* The draft the lorry leaves behind it — the only thing here that says
          which way it is going. */}
      <path className="truck-loader__draft" d="M1 16h7" />
      <path
        className="truck-loader__draft"
        d="M1 27h4"
        style={{ animationDelay: "0.3s" }}
      />

      {/* Wheels and all: the whole lorry rides above the road, rather than the
          body bobbing on its springs while the wheels stay put. */}
      <g className="truck-loader__truck">
        {/* Container */}
        <rect x="10" y="8" width="46" height="28" rx="3" />
        <path d="M33 8v28" opacity={0.35} />
        {/* Cab */}
        <path d="M56 15h13l9 11h6a2 2 0 0 1 2 2v8H56z" />
        {/* Windscreen */}
        <path d="M60 19h7l6 7H60z" opacity={0.35} />

        <g className="truck-loader__wheel">
          <circle cx="24" cy="40" r="6" />
          <path d="M24 36.5v7M20.5 40h7" opacity={0.5} strokeWidth={2} />
        </g>
        <g className="truck-loader__wheel">
          <circle cx="72" cy="40" r="6" />
          <path d="M72 36.5v7M68.5 40h7" opacity={0.5} strokeWidth={2} />
        </g>
      </g>

      <path
        className="truck-loader__road"
        d="M2 50h96"
        strokeDasharray="10 8"
        opacity={0.4}
      />
    </svg>
  )
}

/**
 * The loader as a sheet laid over whatever it is put inside.
 *
 * Translucent rather than opaque: the rows underneath stay legible, so a clerk
 * who has just changed a filter can still see the answer they are refining
 * away from, and the table does not collapse and reflow the page under them.
 * The parent has to be positioned, and must not clip — see below.
 *
 * The lorry is held `sticky` rather than simply centred because a page of
 * twenty-five consignments is taller than the screen: centred, it would sit a
 * thousand pixels below whatever the clerk is actually looking at. Pinned, it
 * stays on screen wherever they are down the register. That is also why this
 * belongs beside the card rather than inside it — `sticky` tracks the nearest
 * scrolling ancestor, and the card's `overflow-hidden` is one.
 */
function TruckLoadingOverlay({
  show,
  label = "Loading…",
  className,
  ...props
}: React.ComponentProps<"div"> & { show: boolean; label?: string }) {
  if (!show) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "absolute inset-0 z-20 animate-in rounded-xl bg-background/70 duration-150 fade-in-0 supports-backdrop-filter:backdrop-blur-[1px]",
        className
      )}
      {...props}
    >
      <div className="sticky top-0 flex h-full max-h-[60vh] flex-col items-center justify-center gap-1.5">
        <TruckLoader />
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

export { TruckLoader, TruckLoadingOverlay }
