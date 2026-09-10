import { z } from "zod"

import { biltyDtoSchema } from "@/lib/schemas/bilty"
import { PAYMENT_TYPES } from "@/lib/types"

/**
 * The dashboard, as a schema.
 *
 * Read-only, so unlike the four registers there is no form half here — this
 * parses what the API sends and nothing else. It mirrors the `Dashboard` type
 * in scm-backend/src/types/dashboard.types.ts.
 *
 * What arrives is figures, not sentences: `lrFrom`/`lrTo` rather than
 * "LR 3010–3038", `month` rather than "Aug 2026". Writing the sentence is the
 * screen's job and it is done in `lib/analytics.ts`, in the reader's own
 * locale — which is the whole reason the API does not do it.
 */

/** The days the figures cover, as the API worked them out. */
export const dashboardWindowSchema = z.object({
  days: z.number(),
  /** ISO yyyy-mm-dd, inclusive. */
  start: z.string(),
  /** ISO yyyy-mm-dd — today, in the office's own day. */
  end: z.string(),
})

/** The four tiles across the top. */
export const kpisSchema = z.object({
  biltiesBooked: z.number(),
  cancelled: z.number(),
  /** Lowest and highest number written in the window, "" on an empty one. */
  lrFrom: z.string(),
  lrTo: z.string(),
  /** Gross of every charge head, advances not deducted. */
  freightBooked: z.number(),
  /** What is still collectable — To Pay and TBB, less the advances taken. */
  receivable: z.number(),
  receivableCount: z.number(),
  inTransit: z.number(),
  delivered: z.number(),
  awaitingDispatch: z.number(),
})

export const dashboardDtoSchema = z.object({
  window: dashboardWindowSchema,
  kpis: kpisSchema,
  /** Twelve months ending with this one, months with no bookings included. */
  monthly: z
    .object({
      /** yyyy-mm */
      month: z.string(),
      freight: z.number(),
    })
    .array(),
  paymentSplit: z
    .object({
      type: z.enum(PAYMENT_TYPES),
      count: z.number(),
      freight: z.number(),
      /** Percent of the window's freight. 0 on a book with nothing in it. */
      share: z.number(),
    })
    .array(),
  topRoutes: z
    .object({
      /** "Ahmedabad → Jaipur" */
      route: z.string(),
      destination: z.string(),
      trips: z.number(),
      freight: z.number(),
    })
    .array(),
  /** The top of the book — the latest entries, window or no window. */
  recent: biltyDtoSchema.array(),
})

export type DashboardDto = z.infer<typeof dashboardDtoSchema>
export type DashboardWindow = z.infer<typeof dashboardWindowSchema>
export type Kpis = z.infer<typeof kpisSchema>
