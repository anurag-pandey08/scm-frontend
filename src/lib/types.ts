/**
 * Domain model for a Bilty (Lorry Receipt / consignment note).
 * Field names follow the printed LR book so the paper form and the screen
 * stay one-to-one.
 */

export const PAYMENT_TYPES = ["Paid", "To Pay", "TBB"] as const
export type PaymentType = (typeof PAYMENT_TYPES)[number]

export const BILTY_STATUSES = [
  "Booked",
  "In Transit",
  "Delivered",
  "Cancelled",
] as const
export type BiltyStatus = (typeof BILTY_STATUSES)[number]

export const RISK_TYPES = ["Owner's Risk", "Carrier's Risk"] as const
export type RiskType = (typeof RISK_TYPES)[number]

export interface Party {
  name: string
  address: string
  gstNo: string
}

/** The charge column of the LR, rupee amounts. */
export interface BiltyCharges {
  freight: number
  /** A.O.C. — any other charges */
  aoc: number
  /** Loading / unloading labour */
  hamali: number
  /** St. Charges — statistical / station charges */
  stCharges: number
  otherCharges: number
  /** Collected at booking, deducted from the gross total */
  advance: number
}

export interface Insurance {
  company: string
  policyNo: string
  date: string
  amount: number
}

export interface Bilty {
  id: string
  /** L.R. No. — the number printed on the book */
  lrNo: string
  /** ISO yyyy-mm-dd */
  lrDate: string
  lorryNo: string
  from: string
  to: string
  deliveryAt: string
  bookingOffice: string
  consignor: Party
  consignee: Party
  packages: number
  /** "Said to contain" — declared by the consignor, not verified */
  contents: string
  /** Kilograms */
  actualWeight: number
  chargedWeight: number
  declaredValue: number
  /** Freight rate per quintal */
  rate: number
  charges: BiltyCharges
  paymentType: PaymentType
  status: BiltyStatus
  invoiceNo: string
  eWayBillNo: string
  risk: RiskType
  insurance: Insurance
  remarks: string
}

/** Gr. Total — every charge line added up, before the advance is knocked off. */
export function grossTotal(c: BiltyCharges): number {
  return c.freight + c.aoc + c.hamali + c.stCharges + c.otherCharges
}

/** What is still collectable on the consignment. */
export function balanceDue(c: BiltyCharges): number {
  return grossTotal(c) - c.advance
}

export function emptyBilty(lrNo: string, lrDate: string): Bilty {
  return {
    id: "",
    lrNo,
    lrDate,
    lorryNo: "",
    from: "Ahmedabad",
    to: "",
    deliveryAt: "",
    bookingOffice: "Odhav, Ahmedabad",
    consignor: { name: "", address: "", gstNo: "" },
    consignee: { name: "", address: "", gstNo: "" },
    packages: 0,
    contents: "",
    actualWeight: 0,
    chargedWeight: 0,
    declaredValue: 0,
    rate: 0,
    charges: {
      freight: 0,
      aoc: 0,
      hamali: 0,
      stCharges: 200,
      otherCharges: 0,
      advance: 0,
    },
    paymentType: "To Pay",
    status: "Booked",
    invoiceNo: "",
    eWayBillNo: "",
    risk: "Owner's Risk",
    insurance: { company: "", policyNo: "", date: "", amount: 0 },
    remarks: "",
  }
}
