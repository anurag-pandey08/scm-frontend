/**
 * Domain model for a freight bill — what the office raises on a party once the
 * consignments have run. Field names follow the printed bill book: one bill
 * carries one party, one route and a column of challans.
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

/** The Total box — every line in the amount column added up. */
export function invoiceTotal(invoice: Invoice): number {
  return invoice.lines.reduce((sum, line) => sum + line.amount, 0)
}

/** Money the party still owes. A draft has not been sent, so it is not yet due. */
export function outstanding(invoice: Invoice): number {
  return invoice.status === "Raised" ? invoiceTotal(invoice) : 0
}

/** The challans a bill covers, in the order they are printed. */
export function billedChallans(invoice: Invoice): string[] {
  return invoice.lines
    .filter((line) => line.kind === "Freight" && line.challanNo)
    .map((line) => line.challanNo)
}

// Line ids only have to be unique within one bill; a counter beats a random id
// here because it keeps React keys stable between the server and client render.
let lineSeq = 0

export function emptyLine(kind: LineKind = "Freight"): InvoiceLine {
  lineSeq += 1
  return {
    id: `line-${lineSeq}`,
    kind,
    challanNo: "",
    date: "",
    particulars: kind === "Charge" ? "Detention" : "",
    rate: 0,
    weight: 0,
    amount: 0,
  }
}

export function emptyInvoice(billNo: string, billDate: string): Invoice {
  return {
    id: "",
    billNo,
    billDate,
    party: { name: "", address: "", gstNo: "" },
    from: "Ahmedabad",
    to: "",
    partyInvoiceNo: "",
    lines: [{ ...emptyLine("Freight"), date: billDate }],
    status: "Draft",
    paidOn: "",
    remarks: "",
  }
}
