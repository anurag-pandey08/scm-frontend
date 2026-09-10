import type { DashboardDto, Kpis } from "./schemas/dashboard"
import type { PaymentType } from "./types"

/**
 * The dashboard's figures, dressed for the page.
 *
 * This file used to *compute* the dashboard, out of the seed register held in
 * memory. It no longer does: Postgres counts, sums and buckets, and what
 * arrives is already the answer. What is left here is the half the API
 * deliberately does not do — turning figures into the words a reader sees.
 *
 * That split is the API's own, and it is the right way round. "2026-08" is a
 * fact; "Aug 2026" is a rendering of it, in a locale the server has no
 * business guessing. Same for the L.R. range and the month-over-month change:
 * both are read off figures the API already sent, so sending them again as
 * prose would be a second copy of the same truth.
 */

export interface MonthPoint {
  /** yyyy-mm */
  month: string
  /** Axis tick — "Jul" */
  label: string
  /** Tooltip and table row — "Jul 2026" */
  fullLabel: string
  freight: number
}

export interface PaymentSlice {
  type: PaymentType
  count: number
  freight: number
  share: number
}

export interface RoutePoint {
  route: string
  destination: string
  trips: number
  freight: number
}

/** The tiles' figures, plus the one sentence the screen writes from them. */
export interface DashboardKpis extends Kpis {
  /** "LR 3010–3038", or "—" over a window nothing was booked in. */
  lrRange: string
}

/**
 * A yyyy-mm as the two labels the chart needs.
 *
 * Parsed as UTC midday rather than midnight: a month key turned into a local
 * `Date` west of Greenwich lands on the last day of the month before, and the
 * axis then reads a month behind the figures.
 */
function monthLabels(month: string): { label: string; fullLabel: string } {
  const date = new Date(`${month}-01T12:00:00Z`)

  return {
    // Trimmed to three letters — ICU renders September as "Sept", which
    // leaves one ragged tick among eleven three-letter ones.
    label: date
      .toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" })
      .slice(0, 3),
    fullLabel: date.toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }),
  }
}

export function toMonthPoints(monthly: DashboardDto["monthly"]): MonthPoint[] {
  return monthly.map(({ month, freight }) => ({
    month,
    freight,
    ...monthLabels(month),
  }))
}

/**
 * The tiles, with the L.R. range written out.
 *
 * The API sends the two ends and leaves the dash to the screen, because a
 * range is a sentence and the ends are facts — and because an empty window has
 * no range to print, only a placeholder.
 */
export function toKpis(kpis: Kpis): DashboardKpis {
  return {
    ...kpis,
    lrRange: kpis.lrFrom ? `LR ${kpis.lrFrom}–${kpis.lrTo}` : "—",
  }
}

/**
 * Change in the last month of the trend against the one before it.
 *
 * Null rather than a number where it cannot be stated: a rise from nothing is
 * not a percentage, and a chart that prints "∞%" or "NaN%" over a quiet month
 * is worse than one that prints nothing. The card reads the null and says so.
 */
export function monthOverMonth(points: MonthPoint[]): number | null {
  const latest = points.at(-1)
  const previous = points.at(-2)

  if (!latest || !previous || previous.freight === 0) return null

  return ((latest.freight - previous.freight) / previous.freight) * 100
}
