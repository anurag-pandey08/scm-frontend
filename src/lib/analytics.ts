import type { CompanySlug } from "./companies"
import {
  getMonthlyFreight as monthlyFreightFor,
  getSeedBilties,
  TODAY,
} from "./data"
import { grossTotal, balanceDue, type Bilty, type PaymentType } from "./types"

/**
 * Every figure on the dashboard is scoped to one firm. Nothing here reaches for
 * a register directly — the company is always named by the caller, so the two
 * firms' books can never be added together by accident.
 */

/** Inclusive window of the `days` days ending on the anchor date. */
function windowStart(days: number): string {
  const end = new Date(`${TODAY}T00:00:00`)
  end.setDate(end.getDate() - (days - 1))
  return end.toISOString().slice(0, 10)
}

export const WINDOW_DAYS = 30
export const WINDOW_START = windowStart(WINDOW_DAYS)

const inWindow = (b: Bilty) => b.lrDate >= WINDOW_START && b.lrDate <= TODAY
const isLive = (b: Bilty) => b.status !== "Cancelled"

/** The firm's bilties inside the window, and those of them still standing. */
function books(company: CompanySlug) {
  const recent = getSeedBilties(company).filter(inWindow)
  return { recent, live: recent.filter(isLive) }
}

export interface Kpis {
  biltiesBooked: number
  cancelled: number
  lrRange: string
  freightBooked: number
  receivable: number
  receivableCount: number
  inTransit: number
  delivered: number
  awaitingDispatch: number
}

export function getKpis(company: CompanySlug): Kpis {
  const { recent, live } = books(company)
  const lrNumbers = recent.map((b) => Number(b.lrNo)).sort((a, b) => a - b)
  const receivables = live.filter(
    (b) => b.paymentType === "To Pay" || b.paymentType === "TBB"
  )

  return {
    biltiesBooked: live.length,
    cancelled: recent.length - live.length,
    lrRange:
      lrNumbers.length > 0
        ? `LR ${lrNumbers[0]}–${lrNumbers[lrNumbers.length - 1]}`
        : "—",
    freightBooked: live.reduce((sum, b) => sum + grossTotal(b.charges), 0),
    receivable: receivables.reduce((sum, b) => sum + balanceDue(b.charges), 0),
    receivableCount: receivables.length,
    inTransit: live.filter((b) => b.status === "In Transit").length,
    delivered: live.filter((b) => b.status === "Delivered").length,
    awaitingDispatch: live.filter((b) => b.status === "Booked").length,
  }
}

export interface MonthPoint {
  month: string
  /** Axis tick — "Jul" */
  label: string
  /** Tooltip and table row — "Jul 2026" */
  fullLabel: string
  freight: number
}

export function getMonthlyFreight(company: CompanySlug): MonthPoint[] {
  return monthlyFreightFor(company).map(({ month, freight }) => {
    const d = new Date(`${month}-01T00:00:00`)
    return {
      month,
      // Trimmed to three letters — ICU renders September as "Sept", which
      // leaves one ragged tick among eleven three-letter ones.
      label: d.toLocaleDateString("en-IN", { month: "short" }).slice(0, 3),
      fullLabel: d.toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      }),
      freight,
    }
  })
}

/** Change in the most recent complete month against the one before it. */
export function getMonthOverMonth(company: CompanySlug): {
  latest: MonthPoint
  changePct: number
} {
  const points = getMonthlyFreight(company)
  const latest = points[points.length - 1]
  const previous = points[points.length - 2]
  return {
    latest,
    changePct: ((latest.freight - previous.freight) / previous.freight) * 100,
  }
}

export interface PaymentSlice {
  type: PaymentType
  count: number
  freight: number
  share: number
}

export function getPaymentSplit(company: CompanySlug): PaymentSlice[] {
  const { live } = books(company)
  const total = live.reduce((sum, b) => sum + grossTotal(b.charges), 0)
  const order: PaymentType[] = ["Paid", "To Pay", "TBB"]

  return order.map((type) => {
    const rows = live.filter((b) => b.paymentType === type)
    const freight = rows.reduce((sum, b) => sum + grossTotal(b.charges), 0)
    return {
      type,
      count: rows.length,
      freight,
      share: total > 0 ? (freight / total) * 100 : 0,
    }
  })
}

export interface RoutePoint {
  route: string
  destination: string
  trips: number
  freight: number
}

export function getTopRoutes(company: CompanySlug, limit = 6): RoutePoint[] {
  const byDestination = new Map<string, RoutePoint>()

  for (const b of books(company).live) {
    const existing = byDestination.get(b.to)
    if (existing) {
      existing.trips += 1
      existing.freight += grossTotal(b.charges)
    } else {
      byDestination.set(b.to, {
        route: `${b.from} → ${b.to}`,
        destination: b.to,
        trips: 1,
        freight: grossTotal(b.charges),
      })
    }
  }

  return [...byDestination.values()]
    .sort((a, b) => b.freight - a.freight)
    .slice(0, limit)
}

export function getRecentBilties(company: CompanySlug, limit = 6): Bilty[] {
  return getSeedBilties(company).slice(0, limit)
}
