import { z } from "zod"

import {
  LOADING_SLIP_STATUSES,
  type LoadingSlip,
} from "@/lib/loading-slip-types"

/**
 * The loading slip, as a schema.
 *
 * The same definition does both jobs the other two do: it is the resolver
 * behind the slip form, and it parses what the API sends back. It mirrors
 * `loadingSlipSchema` in scm-backend, whose copy is the one that actually
 * guards the book — when one moves, move the other.
 *
 * Six things make a slip mean something: a number, a date, whose order the
 * lorry is against, which lorry, where it is going, and what was agreed for
 * it. Beyond those the page can be left as the paper often leaves it — no rate
 * where the trip went on a lump sum, no bed where nobody wrote one down.
 */

const text = (max: number) => z.string().trim().max(max)

const rupees = (max: number) =>
  z
    .number()
    .nonnegative("Cannot be negative")
    .max(max, "Larger than the slip book can hold")

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Required")

const dimensionsSchema = z.object({
  length: z.number().nonnegative("Cannot be negative").max(999_999.99),
  width: z.number().nonnegative("Cannot be negative").max(999_999.99),
  height: z.number().nonnegative("Cannot be negative").max(999_999.99),
})

export const loadingSlipSchema = z
  .object({
    slipNo: z
      .string()
      .trim()
      .min(1, "Slip number is required")
      .max(20)
      .regex(/^[A-Za-z0-9/-]+$/, "Digits, letters, / and - only"),
    slipDate: isoDate,

    party: text(200).min(1, "Whose order the lorry is against"),

    vehicleNo: text(20).min(1, "Lorry number is required").toUpperCase(),
    from: text(120),
    to: text(120).min(1, "Destination is required"),

    // Left at zero on a lump-sum trip, exactly as on the paper — so neither of
    // these is required and neither is checked against the hire.
    rate: rupees(9_999_999_999.99),
    weight: z.number().nonnegative("Cannot be negative").max(999_999_999.999),

    totalFreight: rupees(999_999_999_999.99).refine(
      (value) => value > 0,
      "Agreed hire is required"
    ),
    advance: rupees(9_999_999_999.99),
    detention: rupees(9_999_999_999.99),

    dimensions: dimensionsSchema,

    status: z.enum(LOADING_SLIP_STATUSES),

    remarks: text(1000),
  })
  .refine((slip) => slip.advance <= slip.totalFreight + slip.detention, {
    message: "Advance is more than the whole hire",
    // Reported against the box the clerk would fix, not the whole form.
    path: ["advance"],
  })

/** What the slip form holds and what a create or update sends. */
export type LoadingSlipInput = z.infer<typeof loadingSlipSchema>

/** A slip as the API reports it — the input, plus the id the book gave it. */
export const loadingSlipDtoSchema = z.object({
  id: z.string(),
  slipNo: z.string(),
  slipDate: z.string(),
  party: z.string(),
  vehicleNo: z.string(),
  from: z.string(),
  to: z.string(),
  rate: z.number(),
  weight: z.number(),
  totalFreight: z.number(),
  advance: z.number(),
  detention: z.number(),
  dimensions: z.object({
    length: z.number(),
    width: z.number(),
    height: z.number(),
  }),
  status: z.enum(LOADING_SLIP_STATUSES),
  remarks: z.string(),
})

/**
 * Holds the API's shape to the one the screens and the printed slip take.
 *
 * `LoadingSlip` is what `loading-slip.tsx` prints and what the register
 * renders. If the API ever stops satisfying it, this fails to compile — which
 * is the point, because the alternative is finding out on a slip that has gone
 * out with a driver.
 */
const _dtoIsASlip: z.infer<typeof loadingSlipDtoSchema> extends LoadingSlip
  ? true
  : never = true
void _dtoIsASlip

/** One page of the slip book, with the footer's figures. */
export const loadingSlipPageSchema = z.object({
  slips: loadingSlipDtoSchema.array(),
  meta: z.object({
    page: z.number(),
    pageSize: z.number(),
    /** Slips matching the filters, across every page. */
    total: z.number(),
    totalPages: z.number(),
    /** Slips in the firm's whole book — the "of 8" in "3 of 8 slips". */
    bookTotal: z.number(),
    totals: z.object({
      hire: z.number(),
      advance: z.number(),
      balance: z.number(),
    }),
  }),
})

export type LoadingSlipPage = z.infer<typeof loadingSlipPageSchema>

/**
 * A blank slip. `from` is the placing firm's own station, so it is passed in
 * rather than assumed.
 */
export function emptyLoadingSlipInput(
  slipNo: string,
  slipDate: string,
  from: string
): LoadingSlipInput {
  return {
    slipNo,
    slipDate,
    party: "",
    vehicleNo: "",
    from,
    to: "",
    rate: 0,
    weight: 0,
    totalFreight: 0,
    advance: 0,
    detention: 0,
    dimensions: { length: 0, width: 0, height: 0 },
    status: "Draft",
    remarks: "",
  }
}

/** The editable half of a slip — what the form loads and saves. */
export function loadingSlipInputOf(slip: LoadingSlip): LoadingSlipInput {
  const { id, ...input } = slip
  void id
  return input
}
