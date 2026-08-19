/**
 * Domain model for the Trip Register — the office daybook, one row per lorry
 * sent out. Field names and their order follow the printed ledger, read left to
 * right across the spread: what went where, what the lorry is owed, and what
 * the party has paid back against it.
 *
 * This register is deliberately NOT kept per firm. The L.R. book, the bill book
 * and the slip book are each one firm's own and never cross; this one daybook
 * is worked by both, and both see the same rows. Anything reading it therefore
 * asks for the whole register rather than for a firm's slice of it — there is
 * no `CompanySlug` anywhere in this file, and that is the point.
 */

/**
 * The money columns split into two blocks on the paper, and they run in
 * opposite directions:
 *
 *   - `advance`, `balance` and `toPay` are what the office owes the lorry.
 *   - `partyPayment` and the two `…Receive` columns are what the party owes
 *     the office, and what has come in against it.
 *
 * `commission` is what the office keeps out of the middle.
 */
export interface Trip {
  id: string
  /** ISO yyyy-mm-dd */
  date: string
  truckNo: string
  partyName: string
  /** Blank on a trip the office placed itself, without a broker in the middle. */
  brokerName: string
  from: string
  to: string
  goods: string
  /** Rupees per tonne. */
  rate: number
  /** Tonnes. */
  weight: number
  /** Handed to the driver at the loading point. */
  advance: number
  /** Left to pay the lorry once it has run. */
  balance: number
  /** Freight to be collected at the delivery end rather than booked here. */
  toPay: number
  /**
   * ISO yyyy-mm-dd. The ledger runs these two against the lorry's money:
   * the day the driver took the advance, and the day the balance was settled.
   * TODO: confirm with the office — the column headings do not say so outright.
   */
  receiveDate: string
  paidDate: string
  /** L.R. No. — the bilty raised for the trip, where one was. */
  lrNo: string
  /** What the office keeps on the trip. */
  commission: number
  remarks: string
  /** What the party is to pay the office for the trip. */
  partyPayment: number
  /** Come in from the party against the advance, and the day it came. */
  advanceReceiveRs: number
  advanceDate: string
  /** …and the same against the balance. */
  balanceReceiveRs: number
  balanceDate: string
}

/** Rate × weight — the lorry hire the advance and balance are drawn against. */
export function tripFreight(trip: Trip): number {
  return Math.round(trip.rate * trip.weight)
}

/** What the party has actually paid in, across both receipts. */
export function tripReceived(trip: Trip): number {
  return trip.advanceReceiveRs + trip.balanceReceiveRs
}

/** Still to come in from the party. Negative would mean they have overpaid. */
export function tripDueFromParty(trip: Trip): number {
  return trip.partyPayment - tripReceived(trip)
}

/** Still to go out to the lorry. */
export function tripDueToLorry(trip: Trip): number {
  return trip.balance
}

/** A blank row. `from` is the station the office books out of. */
export function emptyTrip(date: string, from: string): Trip {
  return {
    id: "",
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
