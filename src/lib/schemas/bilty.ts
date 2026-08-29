import { z } from "zod"

import {
  BILTY_STATUSES,
  PAYMENT_TYPES,
  RISK_TYPES,
  type Bilty,
} from "@/lib/types"

/**
 * The bilty, as a schema.
 *
 * The same definition does both jobs it does on the settings screen: it is the
 * resolver behind the L.R. form, and it parses what the API sends back. It
 * mirrors `biltySchema` in scm-backend, whose copy is the one that actually
 * guards the register — when one moves, move the other.
 *
 * Almost nothing is required, and that is the printed book's rule rather than
 * a gap: a clerk books a lorry before the e-way bill exists and writes the
 * number in later. What is required is what makes the document mean anything —
 * a number, a date, where it is going, and who it is for.
 */

const text = (max: number) => z.string().trim().max(max)

const money = z
  .number()
  .nonnegative("Cannot be negative")
  .max(999_999_999_999.99, "Larger than the register can hold")

const weight = z.number().nonnegative("Cannot be negative").max(999_999_999.999)

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Required")

const partySchema = z.object({
  name: text(160),
  address: text(300),
  gstNo: text(15).toUpperCase(),
})

export const biltySchema = z
  .object({
    lrNo: z
      .string()
      .trim()
      .min(1, "L.R. number is required")
      .max(20)
      .regex(/^[A-Za-z0-9/-]+$/, "Digits, letters, / and - only"),
    lrDate: isoDate,

    lorryNo: text(20).toUpperCase(),
    from: text(80).min(1, "Origin is required"),
    to: text(80).min(1, "Destination is required"),
    deliveryAt: text(300),
    bookingOffice: text(120),

    consignor: partySchema.extend({
      name: text(160).min(1, "Consignor is required"),
    }),
    consignee: partySchema.extend({
      name: text(160).min(1, "Consignee is required"),
    }),

    packages: z.number().int().nonnegative().max(1_000_000),
    contents: text(400),
    actualWeight: weight,
    chargedWeight: weight,
    declaredValue: money,
    rate: money,

    charges: z.object({
      freight: money,
      aoc: money,
      hamali: money,
      stCharges: money,
      otherCharges: money,
      advance: money,
    }),

    paymentType: z.enum(PAYMENT_TYPES),
    status: z.enum(BILTY_STATUSES),
    risk: z.enum(RISK_TYPES),

    invoiceNo: text(60),
    eWayBillNo: text(20),

    insurance: z.object({
      company: text(160),
      policyNo: text(60),
      date: isoDate.or(z.literal("")),
      amount: money,
    }),

    remarks: text(1000),
  })
  .refine(
    ({ charges: c }) =>
      c.advance <= c.freight + c.aoc + c.hamali + c.stCharges + c.otherCharges,
    {
      message: "Advance cannot exceed the gross total",
      // Reported against the box the clerk would fix, not the whole form.
      path: ["charges", "advance"],
    }
  )

/** What the L.R. form holds and what a create or update sends. */
export type BiltyInput = z.infer<typeof biltySchema>

/** A bilty as the API reports it — the input, plus the id the register gave it. */
export const biltyDtoSchema = z.object({
  id: z.string(),
  lrNo: z.string(),
  lrDate: z.string(),
  lorryNo: z.string(),
  from: z.string(),
  to: z.string(),
  deliveryAt: z.string(),
  bookingOffice: z.string(),
  consignor: partySchema,
  consignee: partySchema,
  packages: z.number(),
  contents: z.string(),
  actualWeight: z.number(),
  chargedWeight: z.number(),
  declaredValue: z.number(),
  rate: z.number(),
  charges: z.object({
    freight: z.number(),
    aoc: z.number(),
    hamali: z.number(),
    stCharges: z.number(),
    otherCharges: z.number(),
    advance: z.number(),
  }),
  paymentType: z.enum(PAYMENT_TYPES),
  status: z.enum(BILTY_STATUSES),
  invoiceNo: z.string(),
  eWayBillNo: z.string(),
  risk: z.enum(RISK_TYPES),
  insurance: z.object({
    company: z.string(),
    policyNo: z.string(),
    date: z.string(),
    amount: z.number(),
  }),
  remarks: z.string(),
})

/**
 * Holds the API's shape to the one the screens and the printed L.R. take.
 *
 * `Bilty` is what `bilty-lr.tsx` prints and what the register renders. If the
 * API ever stops satisfying it, this fails to compile — which is the point,
 * because the alternative is finding out on a printed consignment note.
 */
const _dtoIsABilty: z.infer<typeof biltyDtoSchema> extends Bilty
  ? true
  : never = true
void _dtoIsABilty

/** One page of the register, with the footer's figures. */
export const biltyPageSchema = z.object({
  bilties: biltyDtoSchema.array(),
  meta: z.object({
    page: z.number(),
    pageSize: z.number(),
    /** Rows matching the filters, across every page. */
    total: z.number(),
    totalPages: z.number(),
    /** Rows in the firm's whole book — the "of 29" in "12 of 29 bilties". */
    bookTotal: z.number(),
    totals: z.object({ gross: z.number(), balance: z.number() }),
  }),
})

export type BiltyPage = z.infer<typeof biltyPageSchema>

/** The editable half of a bilty — what the form loads and saves. */
export function biltyInputOf(bilty: Bilty): BiltyInput {
  const { id, ...input } = bilty
  void id
  return input
}
