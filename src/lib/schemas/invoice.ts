import { z } from "zod"

import {
  INVOICE_STATUSES,
  LINE_KINDS,
  emptyLine,
  type Invoice,
} from "@/lib/invoice-types"

/**
 * The freight bill, as a schema.
 *
 * The same definition does both jobs `schemas/bilty.ts` does: it is what the
 * bill form validates against, and it parses what the API sends back. It
 * mirrors `invoiceSchema` in scm-backend, whose copy is the one that actually
 * guards the book — when one moves, move the other.
 *
 * Five things make a bill mean something: a number, a date, a party to raise
 * it on, somewhere it ran to, and at least one line in the charge column.
 * Beyond those the page can be left for later, which is the printed book's
 * rule rather than a gap.
 */

const text = (max: number) => z.string().trim().max(max)

const money = z
  .number()
  .nonnegative("Cannot be negative")
  .max(999_999_999_999.99, "Larger than the bill book can hold")

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Required")

const optionalIsoDate = isoDate.or(z.literal(""))

const partySchema = z.object({
  name: text(160),
  address: text(300),
  gstNo: text(15).toUpperCase(),
})

/**
 * One row of the charge column.
 *
 * A charge line's challan, date, rate and weight are blank on the paper but
 * are still sent — the form keeps one shape for both kinds of line, and the
 * API blanks them on the way in, so a line switched from freight to charge
 * cannot leave a stale lorry number behind it.
 */
export const invoiceLineSchema = z.object({
  kind: z.enum(LINE_KINDS),
  challanNo: text(20),
  date: optionalIsoDate,
  particulars: text(160).min(1, "Required"),
  rate: z.number().nonnegative("Cannot be negative").max(9_999_999_999.99),
  weight: z.number().nonnegative("Cannot be negative").max(999_999_999.999),
  amount: money,
})

export const invoiceSchema = z
  .object({
    billNo: z
      .string()
      .trim()
      .min(1, "Bill number is required")
      .max(20)
      .regex(/^[A-Za-z0-9/-]+$/, "Digits, letters, / and - only"),
    billDate: isoDate,

    party: partySchema.extend({
      name: text(160).min(1, "Party is required"),
    }),

    from: text(120),
    to: text(120).min(1, "Destination is required"),

    partyInvoiceNo: text(60),

    lines: invoiceLineSchema
      .array()
      .min(1, "A bill needs at least one line")
      .max(100),

    status: z.enum(INVOICE_STATUSES),
    paidOn: optionalIsoDate,

    remarks: text(1000),
  })
  .refine((invoice) => invoice.status !== "Paid" || invoice.paidOn !== "", {
    message: "Record the date the party settled",
    // Reported against the box the clerk would fix, not the whole form.
    path: ["paidOn"],
  })

/** What the bill form holds and what a create or update sends. */
export type InvoiceInput = z.infer<typeof invoiceSchema>

/** A bill as the API reports it — the input, plus the ids the book gave it. */
export const invoiceDtoSchema = z.object({
  id: z.string(),
  billNo: z.string(),
  billDate: z.string(),
  party: partySchema,
  from: z.string(),
  to: z.string(),
  partyInvoiceNo: z.string(),
  lines: z
    .object({
      id: z.string(),
      kind: z.enum(LINE_KINDS),
      challanNo: z.string(),
      date: z.string(),
      particulars: z.string(),
      rate: z.number(),
      weight: z.number(),
      amount: z.number(),
    })
    .array(),
  status: z.enum(INVOICE_STATUSES),
  paidOn: z.string(),
  remarks: z.string(),
})

/**
 * Holds the API's shape to the one the screens and the printed bill take.
 *
 * `Invoice` is what `invoice-bill.tsx` prints and what the register renders. If
 * the API ever stops satisfying it, this fails to compile — which is the point,
 * because the alternative is finding out on a bill that has gone to a party.
 */
const _dtoIsAnInvoice: z.infer<typeof invoiceDtoSchema> extends Invoice
  ? true
  : never = true
void _dtoIsAnInvoice

/** One page of the bill book, with the footer's figures. */
export const invoicePageSchema = z.object({
  invoices: invoiceDtoSchema.array(),
  meta: z.object({
    page: z.number(),
    pageSize: z.number(),
    /** Bills matching the filters, across every page. */
    total: z.number(),
    totalPages: z.number(),
    /** Bills in the firm's whole book — the "of 13" in "4 of 13 bills". */
    bookTotal: z.number(),
    totals: z.object({ billed: z.number(), outstanding: z.number() }),
  }),
})

export type InvoicePage = z.infer<typeof invoicePageSchema>

/**
 * A blank bill.
 *
 * `from` is the booking firm's own station, so it is passed in rather than
 * assumed — the two firms book out of the same premises today, but the bill
 * book is the firm's and so is its origin.
 *
 * It opens with one freight line already dated, because a bill with no lines
 * is a blank sheet with a number on it and the first thing the clerk does is
 * add one.
 */
export function emptyInvoiceInput(
  billNo: string,
  billDate: string,
  from: string
): InvoiceInput {
  return {
    billNo,
    billDate,
    party: { name: "", address: "", gstNo: "" },
    from,
    to: "",
    partyInvoiceNo: "",
    lines: [{ ...emptyLine("Freight"), date: billDate }],
    status: "Draft",
    paidOn: "",
    remarks: "",
  }
}

/**
 * The editable half of a bill — what the form loads and saves.
 *
 * The line ids go with the bill's own: they are the book's, not the form's,
 * and a bill being amended is written back as a fresh charge column rather
 * than as a set of edits to the rows that were there.
 */
export function invoiceInputOf(invoice: Invoice): InvoiceInput {
  return {
    billNo: invoice.billNo,
    billDate: invoice.billDate,
    party: invoice.party,
    from: invoice.from,
    to: invoice.to,
    partyInvoiceNo: invoice.partyInvoiceNo,
    lines: invoice.lines.map(({ id, ...line }) => {
      void id
      return line
    }),
    status: invoice.status,
    paidOn: invoice.paidOn,
    remarks: invoice.remarks,
  }
}
