import type { Company } from "@/lib/companies"
import { formatDateNumeric, formatNumber } from "@/lib/format"
import {
  formatDimensions,
  slipBalance,
  type LoadingSlip as Slip,
} from "@/lib/loading-slip-types"
import { cn } from "@/lib/utils"

/**
 * The loading slip exactly as it comes off the book — same letterhead, same
 * standing paragraph, same run of boxes down the page. It is a document rather
 * than a screen, so it keeps its own ink in either theme and never picks up the
 * app's styling.
 *
 * The slip is written on the same letterhead as the L.R., so it takes the L.R.
 * book's wording and address rather than the bill book's.
 */

/** The book is printed in blue, with the firm's name heavier than the rest. */
const INK = "#1c3f94"

const rule = "border-[#1c3f94]"

/** A value written on a ruled line, as the clerk fills the paper in. */
function Line({
  label,
  value,
  className,
}: {
  label: string
  value: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex min-w-0 items-baseline gap-2", className)}>
      <span className="shrink-0 font-semibold">{label}</span>
      <span className="shrink-0">:</span>
      <span className="min-w-0 flex-1 border-b border-[#1c3f94]/70 font-bold break-words">
        {value || "\u00a0"}
      </span>
    </div>
  )
}

const rupeeFigures = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Rupees on the slip are written out in full figures, paise and all. */
function rupees(amount: number): string {
  return rupeeFigures.format(amount)
}

export function LoadingSlipSheet({
  slip,
  company,
  className,
}: {
  slip: Slip
  /** Whose book this slip came out of — it fills the whole letterhead. */
  company: Company
  className?: string
}) {
  const balance = slipBalance(slip)

  return (
    <div
      className={cn(
        "print-sheet mx-auto w-full max-w-[210mm] bg-white text-[11px] leading-tight",
        className
      )}
      style={{ color: INK }}
    >
      <div className={cn("border-2 px-5 py-4", rule)}>
        {/* Masthead */}
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className={cn(
              "grid size-14 shrink-0 place-items-center rounded-full border-2 text-sm font-bold",
              rule
            )}
          >
            {company.monogram}
          </span>

          <div className="min-w-0 flex-1 text-center">
            <p className="text-[10px] font-semibold">{company.jurisdiction}</p>
            <p className="text-3xl font-extrabold tracking-tight uppercase">
              {company.name}
            </p>
            <p
              className={cn(
                "mx-auto mt-0.5 inline-block border px-2 py-px text-[10px] font-bold uppercase",
                rule
              )}
            >
              {company.lrTagline}
            </p>
            <p className="mt-1.5 text-[10px] font-semibold">
              {company.address}
            </p>
            <p className="text-[10px] font-semibold">
              Email : {company.emails.lr}
            </p>
          </div>

          <div className="w-28 shrink-0 text-right text-[10px] font-semibold">
            {company.phones.map((phone) => (
              <p key={phone}>(M) : {phone}</p>
            ))}
          </div>
        </div>

        <p className="mt-4 text-center text-xl font-bold">Loading Slip</p>

        {/* Number and date */}
        <div className="mt-3 flex items-baseline justify-between gap-4 text-base font-bold">
          <p>No. {slip.slipNo}</p>
          <p className="font-semibold">
            Date{" "}
            <span className="font-bold tabular-nums">
              {formatDateNumeric(slip.slipDate)}
            </span>
          </p>
        </div>

        {/* Addressee */}
        <div className="mt-3 flex items-baseline gap-2 text-base">
          <span className="shrink-0 font-semibold">To M/s.</span>
          <span className="min-w-0 flex-1 border-b border-[#1c3f94]/70 font-bold uppercase">
            {slip.party || "\u00a0"}
          </span>
        </div>

        {/* The standing paragraph, printed on every slip in the book */}
        <p className="mt-3 text-[13px] leading-relaxed">
          As per Your order we are sending our Truck/Trailor for loading your
          goods. Kindly arrange to load the same handover all the necessary
          documents through the bearer of this letter
        </p>

        {/* The trip */}
        <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2.5 text-[13px]">
          <Line
            label="Vehicle no."
            value={<span className="uppercase">{slip.vehicleNo}</span>}
            className="col-span-2"
          />
          <Line
            label="From"
            value={<span className="uppercase">{slip.from}</span>}
          />
          <Line
            label="To"
            value={<span className="uppercase">{slip.to}</span>}
          />
          <Line
            label="Rate Rs"
            value={<span className="tabular-nums">{rupees(slip.rate)}</span>}
          />
          <Line
            label="Weight"
            value={
              <span className="tabular-nums">
                {slip.weight ? Number(slip.weight.toFixed(3)) : 0}
              </span>
            }
          />
          <Line
            label="Total Freight"
            value={
              <span className="tabular-nums">{rupees(slip.totalFreight)}</span>
            }
          />
          <Line
            label="Advance"
            value={<span className="tabular-nums">{rupees(slip.advance)}</span>}
          />

          {/* Written across the page on the paper, not boxed against anything */}
          <p className="col-span-2 font-semibold">
            Loading Point Detention{" "}
            <span className="font-bold tabular-nums">
              {formatNumber(slip.detention)}
            </span>
          </p>

          <Line
            label="Balance Rs"
            value={<span className="tabular-nums">{rupees(balance)}</span>}
          />
          <Line
            label="Length"
            value={
              <span className="tabular-nums">
                {formatDimensions(slip.dimensions)}
              </span>
            }
          />
        </div>

        {/* Remarks, then the bank the balance is to be settled into */}
        <div className="mt-4 flex items-end justify-between gap-6">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Remarks</p>
            {slip.remarks ? (
              <p className="mt-0.5 font-bold">{slip.remarks}</p>
            ) : null}
            <div className="mt-1 font-semibold">
              <p>{company.bank.name},</p>
              <p className="tabular-nums">A/c No. {company.bank.accountNo}</p>
              <p className="tabular-nums">
                IFSC : {company.bank.ifsc}, {company.bank.branch}
              </p>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="font-bold uppercase">For, {company.name}</p>
            {/* The slip is signed by hand before it leaves the office. */}
            <div className="h-12" />
            <p className="border-t border-[#1c3f94]/70 pt-0.5 text-[10px] font-semibold">
              Authorised Signatory
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
