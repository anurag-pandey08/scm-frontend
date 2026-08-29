import { z } from "zod"

import { biltyDtoSchema } from "@/lib/schemas/bilty"
import { PAYMENT_TYPES } from "@/lib/types"

/**
 * The dashboard, as the API reports it.
 *
 * Parsed rather than cast, for the reason given in `api/companies.ts`: the API
 * is a separate repository on a separate deploy cycle, and a figure that has
 * quietly changed shape should fail at the boundary with the field named
 * rather than render as a blank tile or a chart with no bars.
 *
 * Everything here is a figure. The sentences the screen writes around them —
 * "LR 3010–3038", "Aug 2026", "+17.2% against the month before" — are built in
 * `lib/analytics.ts`, where the reader's locale is known.
 */

export const dashboardSchema = z.object({
  /** The days the figures cover, as the API worked them out. */
  window: z.object({
    days: z.number(),
    /** ISO yyyy-mm-dd, inclusive at both ends. */
    start: z.string(),
    end: z.string(),
  }),

  kpis: z.object({
    biltiesBooked: z.number(),
    cancelled: z.number(),
    /** Lowest and highest number written in the window, "" on an empty one. */
    lrFrom: z.string(),
    lrTo: z.string(),
    freightBooked: z.number(),
    receivable: z.number(),
    receivableCount: z.number(),
    inTransit: z.number(),
    delivered: z.number(),
    awaitingDispatch: z.number(),
  }),

  /**
   * Twelve months ending with this one. A quiet month is a zero, not a gap.
   *
   * At least two, because the trend card reads a first, a last and the one
   * before it. Fewer would be a chart with nothing to say and a crash where
   * the sentence under it goes, so it fails here instead, named.
   */
  monthly: z.object({ month: z.string(), freight: z.number() }).array().min(2),

  paymentSplit: z
    .object({
      type: z.enum(PAYMENT_TYPES),
      count: z.number(),
      freight: z.number(),
      /** Percent of the window's freight. */
      share: z.number(),
    })
    .array(),

  topRoutes: z
    .object({
      route: z.string(),
      destination: z.string(),
      trips: z.number(),
      freight: z.number(),
    })
    .array(),

  /** The top of the book — the latest entries, window or no window. */
  recent: biltyDtoSchema.array(),
})

export type Dashboard = z.infer<typeof dashboardSchema>
export type DashboardWindow = Dashboard["window"]
export type Kpis = Dashboard["kpis"]
export type MonthTotal = Dashboard["monthly"][number]
export type PaymentSlice = Dashboard["paymentSplit"][number]
export type RoutePoint = Dashboard["topRoutes"][number]
