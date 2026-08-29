import type {
  Kpis,
  MonthTotal,
  PaymentSlice,
  RoutePoint,
} from "@/lib/schemas/dashboard"

/**
 * The sentences the dashboard writes around the API's figures.
 *
 * Nothing here counts or adds anything up — every figure on the screen is
 * summed in Postgres against one snapshot of one firm's book, which is the
 * only way the tiles and the charts can be guaranteed to agree. What is left
 * is labelling: turning "2026-08" into "Aug", a first and last L.R. number
 * into a range, and one month against the one before it into a percentage.
 *
 * That is here rather than in the API because it is the reader's, not the
 * book's — month names and digit grouping belong to whoever is looking at the
 * screen.
 */

export type { Kpis, PaymentSlice, RoutePoint }

/** A month of the freight trend, with the two labels the chart draws. */
export interface MonthPoint extends MonthTotal {
  /** Axis tick — "Jul" */
  label: string
  /** Tooltip and table row — "Jul 2026" */
  fullLabel: string
}

export function monthPoints(monthly: MonthTotal[]): MonthPoint[] {
  return monthly.map((point) => {
    const date = new Date(`${point.month}-01T00:00:00`)

    return {
      ...point,
      // Trimmed to three letters — ICU renders September as "Sept", which
      // leaves one ragged tick among eleven three-letter ones.
      label: date.toLocaleDateString("en-IN", { month: "short" }).slice(0, 3),
      fullLabel: date.toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      }),
    }
  })
}

/**
 * Change in the last month of the trend against the one before it.
 *
 * `null` where there is nothing to compare against — a month before the book
 * opened, or a firm's first month. A percentage off zero is either infinity or
 * a made-up number, and neither belongs under a chart.
 *
 * The last month of the trend is the one in progress, so this is a part-month
 * against a whole one and reads low until the month is out. The card says as
 * much rather than the figure being adjusted for it: a guessed run-rate is a
 * number nobody wrote down.
 */
export function monthOverMonth(points: MonthPoint[]): {
  latest: MonthPoint | undefined
  changePct: number | null
} {
  const latest = points[points.length - 1]
  const previous = points[points.length - 2]

  return {
    latest,
    changePct:
      latest && previous && previous.freight > 0
        ? ((latest.freight - previous.freight) / previous.freight) * 100
        : null,
  }
}

/**
 * "LR 3010–3038" — the stretch of the book the window covers.
 *
 * An em-dash range rather than two fields, because that is how a clerk says
 * it. A window with nothing booked in it has no range to give.
 */
export function lrRange(kpis: Kpis): string {
  if (!kpis.lrFrom) return "No LRs booked"
  return kpis.lrFrom === kpis.lrTo
    ? `LR ${kpis.lrFrom}`
    : `LR ${kpis.lrFrom}–${kpis.lrTo}`
}
