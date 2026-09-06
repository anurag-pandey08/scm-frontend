/**
 * Domain model for a freight bill — what the office raises on a party once the
 * consignments have run. Field names follow the printed bill book: one bill
 * carries one party, one route and a column of challans.
 *
 * This is the shape the screens and the printed bill are written against.
 * `lib/schemas/invoice.ts` is what parses it off the API and what the form
 * validates, and it is checked against these types at compile time.
 */

import type { Party } from "./types"

export const INVOICE_STATUSES = [
  "Draft",
  "Raised",
  "Paid",
  "Cancelled",
] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

/**
 * A Freight line bills a challan at a rate per tonne. A Charge line is a lump
 * sum with no challan behind it — detention, halting, extra loading — and is
 * written straight into the amount column, exactly as on the paper bill.
 */
export const LINE_KINDS = ["Freight", "Charge"] as const
export type LineKind = (typeof LINE_KINDS)[number]

/** One row of the charge column, as it comes back from the book. */
export interface InvoiceLine {
  id: string
  kind: LineKind
  /** Challan No. — the L.R. this line bills. Blank on a charge line. */
  challanNo: string
  /** ISO yyyy-mm-dd. Blank on a charge line. */
  date: string
  /** Perticulars — the lorry number on a freight line, the charge's name otherwise. */
  particulars: string
  /** Rupees per tonne. */
  rate: number
  /** Tonnes. */
  weight: number
  /** The Rs. column. */
  amount: number
}

/** A line as the form holds it, before the book has given it an id. */
export type InvoiceLineDraft = Omit<InvoiceLine, "id">

export interface Invoice {
  id: string
  /** Bill No. — the number printed on the book. */
  billNo: string
  /** ISO yyyy-mm-dd */
  billDate: string
  /** M/s — the party the bill is raised on. */
  party: Party
  /**
   * Free text rather than the station list the L.R. uses: bills run to places
   * the booking office never books from, like Khurdha (Odisha).
   */
  from: string
  to: string
  /** The party's own invoice number for the goods, printed under the lines. */
  partyInvoiceNo: string
  lines: InvoiceLine[]
  status: InvoiceStatus
  /** ISO yyyy-mm-dd, once the party has settled. */
  paidOn: string
  remarks: string
}

/** What a freight line comes to before anyone rounds it off. */
export function freightAmount(rate: number, weight: number): number {
  return Math.round(rate * weight)
}

/**
 * The Total box — every line in the amount column added up.
 *
 * Takes anything with an amount column, so the form can total a draft that has
 * no ids on its lines yet and the register can total a bill that has.
 */
export function invoiceTotal(invoice: { lines: { amount: number }[] }): number {
  return invoice.lines.reduce((sum, line) => sum + line.amount, 0)
}

/** The challans a bill covers, in the order they are printed. */
export function billedChallans(invoice: Invoice): string[] {
  return invoice.lines
    .filter((line) => line.kind === "Freight" && line.challanNo)
    .map((line) => line.challanNo)
}

/** A blank line, of either kind. */
export function emptyLine(kind: LineKind = "Freight"): InvoiceLineDraft {
  return {
    kind,
    challanNo: "",
    date: "",
    particulars: kind === "Charge" ? "Detention" : "",
    rate: 0,
    weight: 0,
    amount: 0,
  }
}
