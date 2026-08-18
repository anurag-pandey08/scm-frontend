import type { PaymentType } from "./types"

/**
 * Payment type owns a fixed categorical slot everywhere it appears — the donut,
 * the legend and the row badges all read from here, so a colour always means
 * the same thing and never shifts with rank or filtering.
 */
export const PAYMENT_COLOR: Record<PaymentType, string> = {
  Paid: "var(--chart-1)",
  "To Pay": "var(--chart-2)",
  TBB: "var(--chart-3)",
}

export const PAYMENT_HELP: Record<PaymentType, string> = {
  Paid: "Freight collected at booking",
  "To Pay": "Freight collected from the consignee on delivery",
  TBB: "To be billed — charged to the party's monthly account",
}
