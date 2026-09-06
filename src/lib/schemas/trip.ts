import { z } from "zod"

import { tripFreight, type Trip } from "@/lib/trip-register-types"

/**
 * The trip, as a schema.
 *
 * The same definition does both jobs the other three do: it is the resolver
 * behind the ledger form, and it parses what the API sends back. It mirrors
 * `tripSchema` in scm-backend, whose copy is the one that actually guards the
 * daybook — when one moves, move the other.
 *
 * Almost everything can be blank, and that is the ledger's rule rather than a
 * gap: a row is entered when the lorry leaves, and the money columns are
 * filled in over the following fortnight. What is required is what identifies
 * the trip — the day, the lorry, the party and where it went.
 */

const text = (max: number) => z.string().trim().max(max)

const rupees = (max: number) =>
  z
    .number()
    .nonnegative("Cannot be negative")
    .max(max, "Larger than the register can hold")

const money = rupees(9_999_999_999.99)

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Required")

/** A day the ledger has not reached yet is written as an empty box. */
const optionalIsoDate = isoDate.or(z.literal(""))

export const tripSchema = z
  .object({
    date: isoDate,

    truckNo: text(20).min(1, "Truck number is required").toUpperCase(),
    partyName: text(200).min(1, "Party is required"),
    brokerName: text(200),
    from: text(120),
    to: text(120).min(1, "Destination is required"),
    goods: text(300),

    rate: money,
    weight: z.number().nonnegative("Cannot be negative").max(999_999_999.999),

    advance: money,
    balance: money,
    toPay: money,

    receiveDate: optionalIsoDate,
    paidDate: optionalIsoDate,

    lrNo: text(20),

    commission: money,
    remarks: text(1000),

    partyPayment: rupees(999_999_999_999.99),
    advanceReceiveRs: money,
    advanceDate: optionalIsoDate,
    balanceReceiveRs: money,
    balanceDate: optionalIsoDate,
  })
  .refine(
    // Only checked where a hire was quoted at all. A trip entered before the
    // rate is agreed has a hire of zero, and an advance against it is not an
    // overpayment — it is a row that is not finished yet.
    (trip) => {
      const freight = tripFreight(trip)
      return freight === 0 || trip.advance <= freight
    },
    {
      message: "Advance is more than the whole hire",
      // Reported against the box the clerk would fix, not the whole form.
      path: ["advance"],
    }
  )

/** What the ledger form holds and what a create or update sends. */
export type TripInput = z.infer<typeof tripSchema>

/** A trip as the API reports it — the input, plus the id the register gave it. */
export const tripDtoSchema = z.object({
  id: z.string(),
  date: z.string(),
  truckNo: z.string(),
  partyName: z.string(),
  brokerName: z.string(),
  from: z.string(),
  to: z.string(),
  goods: z.string(),
  rate: z.number(),
  weight: z.number(),
  advance: z.number(),
  balance: z.number(),
  toPay: z.number(),
  receiveDate: z.string(),
  paidDate: z.string(),
  lrNo: z.string(),
  commission: z.number(),
  remarks: z.string(),
  partyPayment: z.number(),
  advanceReceiveRs: z.number(),
  advanceDate: z.string(),
  balanceReceiveRs: z.number(),
  balanceDate: z.string(),
})

/**
 * Holds the API's shape to the one the ledger spread is written against.
 *
 * If the API ever stops satisfying `Trip`, this fails to compile — which is
 * the point, because the alternative is a column quietly reading blank.
 */
const _dtoIsATrip: z.infer<typeof tripDtoSchema> extends Trip ? true : never =
  true
void _dtoIsATrip

/** One page of the daybook, with the five figures above the spread. */
export const tripPageSchema = z.object({
  trips: tripDtoSchema.array(),
  meta: z.object({
    page: z.number(),
    pageSize: z.number(),
    /** Rows matching the filters, across every page. */
    total: z.number(),
    totalPages: z.number(),
    /** Rows in the whole daybook — the "of 15" in "4 of 15". */
    bookTotal: z.number(),
    totals: z.object({
      freight: z.number(),
      commission: z.number(),
      received: z.number(),
      dueFromParty: z.number(),
      dueToLorry: z.number(),
    }),
  }),
})

export type TripPage = z.infer<typeof tripPageSchema>

/** A blank row. `from` is the station the office books out of. */
export function emptyTripInput(date: string, from: string): TripInput {
  return {
    date,
    truckNo: "",
    partyName: "",
    brokerName: "",
    from,
    to: "",
    goods: "",
    rate: 0,
    weight: 0,
    advance: 0,
    balance: 0,
    toPay: 0,
    receiveDate: "",
    paidDate: "",
    lrNo: "",
    commission: 0,
    remarks: "",
    partyPayment: 0,
    advanceReceiveRs: 0,
    advanceDate: "",
    balanceReceiveRs: 0,
    balanceDate: "",
  }
}

/** The editable half of a trip — what the form loads and saves. */
export function tripInputOf(trip: Trip): TripInput {
  const { id, ...input } = trip
  void id
  return input
}
