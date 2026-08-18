import type { Company } from "@/lib/companies"
import { formatDateNumeric, formatNumber } from "@/lib/format"
import { grossTotal, type Bilty } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * The lorry receipt exactly as it comes off the book — same boxes, same wording,
 * same blue rule and red masthead. It is a document rather than a screen, so it
 * keeps its own ink in either theme and never picks up the app's styling.
 */

/** The book is printed in blue, with the firm's name and the copy mark in red. */
const INK = "#1c3f94"
const RED = "#cc1f1f"

const rule = "border-[#1c3f94]"

function Line({
  label,
  value,
  className,
  strong,
}: {
  label: string
  value: React.ReactNode
  className?: string
  strong?: boolean
}) {
  return (
    <div className={cn("flex items-baseline gap-1 px-1 py-[3px]", className)}>
      <span className="shrink-0 font-semibold">{label}</span>
      <span
        className={cn(
          "min-w-0 flex-1 border-b border-dotted border-[#1c3f94]/60 break-words",
          strong ? "text-[11px] font-bold" : "font-bold"
        )}
      >
        {value || " "}
      </span>
    </div>
  )
}

function Party({
  title,
  name,
  address,
  gstNo,
  className,
}: {
  title: string
  name: string
  address: string
  gstNo: string
  className?: string
}) {
  return (
    <div className={cn("min-w-0 flex-1 p-1", className)}>
      <p className="font-bold">{title}</p>
      <Line label="M/s" value={name} />
      <Line label="Add. :" value={address} />
      <Line label="GST No. :" value={gstNo} />
    </div>
  )
}

export function BiltyLr({
  bilty,
  company,
  copy = "Consignee Copy",
  className,
}: {
  bilty: Bilty
  /** Whose book this L.R. came out of — it fills the whole letterhead. */
  company: Company
  /** The book is carbon-copied — each copy is marked for whoever keeps it. */
  copy?: string
  className?: string
}) {
  const c = bilty.charges
  // The form has one money column for prepaid freight and one for freight
  // collected on delivery. TBB is billed to the party's account later, so it is
  // not collected at booking either — it goes in the To Pay column.
  const paid = bilty.paymentType === "Paid"

  const chargeLines: [string, number][] = [
    ["Freight", c.freight],
    ["A/o. cr.", c.aoc],
    ["Hamali", c.hamali],
    ["Other Ch.", c.otherCharges],
    ["St. Charges", c.stCharges],
    ["Advance", c.advance],
  ]

  const money = (amount: number) => (amount ? formatNumber(amount) : "")

  return (
    <div
      className={cn(
        "print-sheet mx-auto w-full max-w-[210mm] bg-white text-[10px] leading-tight",
        className
      )}
      style={{ color: INK }}
    >
      <div className={cn("border-2", rule)}>
        {/* Masthead */}
        <div className="flex">
          <div
            className={cn(
              "flex w-28 shrink-0 flex-col gap-1.5 border-r p-1 text-center text-[8px] font-semibold",
              rule
            )}
          >
            <p>{company.jurisdiction}</p>
            <p className="text-[9px] font-bold uppercase">At {bilty.risk}</p>
          </div>

          <div className="flex-1 px-2 py-1 text-center">
            <div className="flex items-center justify-center gap-2">
              <span
                aria-hidden
                className="grid size-9 shrink-0 place-items-center rounded-full border-2 text-[11px] font-bold"
                style={{ borderColor: RED, color: RED }}
              >
                {company.monogram}
              </span>
              <div>
                <p
                  className="text-xl font-extrabold tracking-tight uppercase"
                  style={{ color: RED }}
                >
                  {company.name}
                </p>
                <p className="text-[9px] font-bold uppercase">
                  {company.lrTagline}
                </p>
              </div>
            </div>
            <p className="mt-1 text-[8px]">{company.address}</p>
            <p className="text-[8px]">E-mail : {company.emails.lr}</p>
          </div>

          <div className={cn("w-44 shrink-0 border-l", rule)}>
            <div className={cn("border-b p-1 text-[8.5px] font-semibold", rule)}>
              {company.phones.map((phone) => (
                <p key={phone}>M. : {phone}</p>
              ))}
            </div>
            <Line label="L. R. No." value={bilty.lrNo} strong />
            <Line label="Lorry No." value={bilty.lorryNo} />
            <Line label="Date" value={formatDateNumeric(bilty.lrDate)} />
            <Line label="From" value={bilty.from} />
            <Line label="To" value={bilty.to} />
          </div>
        </div>

        <div className={cn("flex border-t-2", rule)}>
          {/* Consignment */}
          <div className={cn("min-w-0 flex-1 border-r", rule)}>
            <div className={cn("flex border-b", rule)}>
              <Party
                title="Consignor"
                name={bilty.consignor.name}
                address={bilty.consignor.address}
                gstNo={bilty.consignor.gstNo}
                className={cn("border-r", rule)}
              />
              <Party
                title="Consignee"
                name={bilty.consignee.name}
                address={bilty.consignee.address}
                gstNo={bilty.consignee.gstNo}
              />
            </div>

            <table className="w-full table-fixed border-collapse text-center">
              <colgroup>
                <col className="w-[13%]" />
                <col className="w-[35%]" />
                <col className="w-[15%]" />
                <col className="w-[15%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
              </colgroup>
              <thead>
                <tr>
                  <th
                    className={cn("border-b border-r p-1 font-semibold", rule)}
                    rowSpan={2}
                  >
                    Packages
                  </th>
                  <th
                    className={cn("border-b border-r p-1 font-semibold", rule)}
                    rowSpan={2}
                  >
                    Contents as to be contain
                  </th>
                  <th
                    className={cn("border-b border-r p-1 font-semibold", rule)}
                    colSpan={2}
                  >
                    Weight
                  </th>
                  <th
                    className={cn("border-b border-r p-1 font-semibold", rule)}
                    rowSpan={2}
                  >
                    Value
                  </th>
                  <th
                    className={cn("border-b p-1 font-semibold", rule)}
                    rowSpan={2}
                  >
                    Rate
                  </th>
                </tr>
                <tr>
                  <th
                    className={cn("border-b border-r p-1 text-[8px]", rule)}
                  >
                    Actual Kg. Grm.
                  </th>
                  <th
                    className={cn("border-b border-r p-1 text-[8px]", rule)}
                  >
                    Charged Kg. Grm.
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={cn("h-12 border-r p-1 align-top font-bold", rule)}>
                    {formatNumber(bilty.packages)}
                  </td>
                  <td className={cn("border-r p-1 text-left align-top font-bold", rule)}>
                    {bilty.contents}
                  </td>
                  <td className={cn("border-r p-1 align-top font-bold", rule)}>
                    {formatNumber(bilty.actualWeight)}
                  </td>
                  <td className={cn("border-r p-1 align-top font-bold", rule)}>
                    {formatNumber(bilty.chargedWeight)}
                  </td>
                  <td className={cn("border-r p-1 align-top font-bold", rule)}>
                    {money(bilty.declaredValue)}
                  </td>
                  <td className="p-1 align-top font-bold">{money(bilty.rate)}</td>
                </tr>
              </tbody>
            </table>

            <div className={cn("border-t", rule)}>
              <Line label="DELIVERY AT :" value={bilty.deliveryAt} />
            </div>

            <div className={cn("border-t p-1 text-[8.5px]", rule)}>
              <p className="font-semibold">
                Insurance &bull; The customer has stated that he has not insured
                the consignment. Or &bull; He has insured the consignment.
              </p>
              <div className="mt-0.5 flex flex-wrap gap-x-2">
                <Line
                  label="Company"
                  value={bilty.insurance.company}
                  className="min-w-32 flex-1 px-0"
                />
                <Line
                  label="Policy No."
                  value={bilty.insurance.policyNo}
                  className="min-w-24 flex-1 px-0"
                />
                <Line
                  label="Date"
                  value={formatDateNumeric(bilty.insurance.date)}
                  className="min-w-20 flex-1 px-0"
                />
                <Line
                  label="Amount"
                  value={money(bilty.insurance.amount)}
                  className="min-w-20 flex-1 px-0"
                />
                <Line
                  label="Risk"
                  value={bilty.risk}
                  className="min-w-24 flex-1 px-0"
                />
              </div>
            </div>
          </div>

          {/* Charges */}
          <div className="flex w-[32%] shrink-0 flex-col">
            <table className="w-full table-fixed border-collapse text-center">
              <colgroup>
                <col className="w-[42%]" />
                <col className="w-[29%]" />
                <col className="w-[29%]" />
              </colgroup>
              <thead>
                <tr>
                  <th className={cn("border-b border-r p-1", rule)} rowSpan={2} />
                  <th
                    className={cn("border-b border-l p-1 font-semibold", rule)}
                    colSpan={2}
                  >
                    Freight
                  </th>
                </tr>
                <tr>
                  <th className={cn("border-b border-l p-1 font-semibold", rule)}>
                    Paid
                  </th>
                  <th className={cn("border-b border-l p-1 font-semibold", rule)}>
                    To Pay
                  </th>
                </tr>
              </thead>
              <tbody>
                {chargeLines.map(([label, amount]) => (
                  <tr key={label}>
                    <th
                      className={cn(
                        "border-b border-r p-1 text-left font-semibold",
                        rule
                      )}
                    >
                      {label}
                    </th>
                    <td
                      className={cn(
                        "border-b border-l p-1 text-right font-bold",
                        rule
                      )}
                    >
                      {paid ? money(amount) : ""}
                    </td>
                    <td
                      className={cn(
                        "border-b border-l p-1 text-right font-bold",
                        rule
                      )}
                    >
                      {paid ? "" : money(amount)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <th
                    className={cn(
                      "border-b border-r p-1 text-left font-bold",
                      rule
                    )}
                  >
                    Gr.Total
                  </th>
                  <td
                    className={cn(
                      "border-b border-l p-1 text-right font-bold",
                      rule
                    )}
                  >
                    {paid ? money(grossTotal(c)) : ""}
                  </td>
                  <td
                    className={cn(
                      "border-b border-l p-1 text-right font-bold",
                      rule
                    )}
                  >
                    {paid ? "" : money(grossTotal(c))}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className={cn("border-b", rule)}>
              <Line label="Invoice No. :" value={bilty.invoiceNo} />
              <Line label="Date :" value={formatDateNumeric(bilty.lrDate)} />
              <Line label="E-Way Bill No. :" value={bilty.eWayBillNo} />
            </div>

            <div className="flex-1 p-1">
              <p className="font-semibold">REMARKS</p>
              <p className="font-bold">{bilty.remarks}</p>
            </div>
          </div>
        </div>

        {/* Standing terms */}
        <div className={cn("flex border-t-2 text-[8.5px]", rule)}>
          <div className={cn("flex-1 border-r p-1", rule)}>
            <p className="font-semibold">Bank Detail :</p>
            <p className="font-bold">{company.bank.name}</p>
            <p>{company.bank.branch}</p>
            <p>
              A/C. No. : {company.bank.accountNo} &middot; IFSC Code :{" "}
              {company.bank.ifsc}
            </p>
            <p className="mt-0.5 font-bold">P.A.N. : {company.pan}</p>
          </div>
          <div className="flex-1 p-1">
            <p>Re-booking through central office only.</p>
            <p>Not responsible for leakage or breakage.</p>
            <Line
              label="Booking Office"
              value={bilty.bookingOffice}
              className="px-0"
            />
          </div>
        </div>

        <div
          className={cn(
            "flex items-end justify-between gap-2 border-t p-1 text-[8.5px]",
            rule
          )}
        >
          <p>We are not responsible for breakage &amp; leakage.</p>
          <p className="font-bold uppercase" style={{ color: RED }}>
            {copy}
          </p>
          <p className="font-bold uppercase" style={{ color: RED }}>
            For, {company.name}
          </p>
        </div>
      </div>
    </div>
  )
}
