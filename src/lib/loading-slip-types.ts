/**
 * Domain model for a Loading Slip — the letter the office sends ahead of a
 * lorry it has placed against someone else's order. Field names follow the
 * printed slip book: one slip is one lorry, one route and one agreed hire.
 *
 * It is not an L.R. and not a bill. Nothing is booked and nobody is charged;
 * it only tells the loading point which lorry is coming, what was agreed for
 * it, and how much of that the driver has already been handed.
 */

export const LOADING_SLIP_STATUSES = [
  "Draft",
  "Issued",
  "Loaded",
  "Cancelled",
] as const
export type LoadingSlipStatus = (typeof LOADING_SLIP_STATUSES)[number]

/** Feet. The bed the party asked for, printed L X W X H on the slip. */
export interface SlipDimensions {
  length: number
  width: number
  height: number
}

export interface LoadingSlip {
  id: string
  /** No. — the number printed on the slip book. */
  slipNo: string
  /** ISO yyyy-mm-dd */
  slipDate: string
  /**
   * To M/s. — whoever ordered the lorry. Free text and a name only: the paper
   * slip carries one line for it, and it is as often another transport firm as
   * it is a party the office keeps an address for.
   */
  party: string
  vehicleNo: string
  from: string
  to: string
  /** Rupees per tonne, where the trip was quoted by weight rather than lump sum. */
  rate: number
  /** Tonnes. */
  weight: number
  /** Lorry hire agreed for the trip, the figure the slip is really about. */
  totalFreight: number
  /** Handed to the driver at the loading point. */
  advance: number
  /** Detention allowed at the loading point, in rupees. */
  detention: number
  dimensions: SlipDimensions
  status: LoadingSlipStatus
  remarks: string
}

/**
 * The Balance Rs box — what is left to pay the lorry at the far end. Detention
 * allowed at the loading point is owed on top of the hire, and the advance has
 * already gone to the driver, so both move the balance.
 */
export function slipBalance(slip: LoadingSlip): number {
  return slip.totalFreight + slip.detention - slip.advance
}

/** 32.00 X 8.00 X 7.00 — the Length box, written out even when it is all zeros. */
export function formatDimensions(dimensions: SlipDimensions): string {
  const { length, width, height } = dimensions
  return [length, width, height].map((v) => v.toFixed(2)).join(" X ")
}

/** A blank slip. `from` is the placing firm's own station, so it is passed in. */
export function emptyLoadingSlip(
  slipNo: string,
  slipDate: string,
  from: string
): LoadingSlip {
  return {
    id: "",
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
