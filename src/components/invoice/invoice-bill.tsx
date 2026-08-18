import { TruckIcon } from "lucide-react"

import type { Company } from "@/lib/companies"
import { amountInWords, formatNumber, formatTonnes } from "@/lib/format"
import { invoiceTotal, type Invoice, type InvoiceLine } from "@/lib/invoice-types"
import { cn } from "@/lib/utils"

/**
 * The bill exactly as it comes off the book — same boxes, same column order,
 * same wording. It is a document rather than a screen, so it stays black ink on
 * white paper in either theme and never picks up the app's own styling.
 */

/** 17-02-2026 — the bill book writes dates out in full, not "17 Feb". */
function billDate(iso: string): string {
  if (!iso) return ""
  const [y, m, d] = iso.split("-")
  return y && m && d ? `${d}-${m}-${y}` : iso
}

const cell = "border border-black px-1.5 py-1 align-top"
const heading = `${cell} text-center font-bold`

/** Rupees on the bill are written with the paise struck out: 127500/- */
function rupees(amount: number): string {
  return `${formatNumber(amount)}/-`
}

function LineRow({ line }: { line: InvoiceLine }) {
  const freight = line.kind === "Freight"
  return (
    <tr>
      <td className={cn(cell, "text-center font-bold tabular-nums")}>
        {line.challanNo}
      </td>
      <td className={cn(cell, "text-center font-bold tabular-nums")}>
        {billDate(line.date)}
      </td>
      <td className={cn(cell, "text-center font-bold")}>{line.particulars}</td>
      <td className={cn(cell, "text-center font-bold tabular-nums")}>
        {freight && line.rate ? formatNumber(line.rate) : ""}
      </td>
      <td className={cn(cell, "text-center font-bold tabular-nums")}>
        {freight && line.weight ? formatTonnes(line.weight) : ""}
      </td>
      <td className={cn(cell, "text-right font-bold tabular-nums")}>
        {line.amount ? rupees(line.amount) : ""}
      </td>
      <td className={cn(cell, "text-center tabular-nums")}>
        {line.amount ? "00" : ""}
      </td>
    </tr>
  )
}

function BlankRow() {
  return (
    <tr>
      {Array.from({ length: 7 }, (_, i) => (
        <td key={i} className={cn(cell, "h-6")} />
      ))}
    </tr>
  )
}

export function InvoiceBill({
  invoice,
  company,
  className,
}: {
  invoice: Invoice
  /** Whose book this bill came out of — it fills the whole letterhead. */
  company: Company
  className?: string
}) {
  const total = invoiceTotal(invoice)
  // The printed bill keeps its box a fixed depth however few challans it
  // carries, so a one-trip bill is not a stub.
  const blanks = Math.max(0, 5 - invoice.lines.length)

  return (
    <div
      className={cn(
        "print-sheet mx-auto w-full max-w-[210mm] bg-white text-[11px] leading-tight text-black",
        className
      )}
    >
      <div className="border border-black">
        {/* Masthead */}
        <div className="relative border-b border-black px-2 py-2 text-center">
          <span
            aria-hidden
            className="absolute top-2 left-2 grid size-11 place-items-center rounded-md bg-[#c81e1e] text-white"
          >
            <TruckIcon className="size-6" />
          </span>
          <p className="font-bold">M : {company.phones.slice(0, 2).join(" , ")}</p>
          <p className="text-2xl font-bold tracking-tight text-[#c81e1e] uppercase">
            {company.name}
          </p>
          <p className="text-[10px] font-bold italic uppercase">
            {company.billTagline}
          </p>
          <p className="mt-1 font-bold">EMAIL: {company.emails.bill}</p>
        </div>

        {/* Party and route */}
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col className="w-[16%]" />
            <col className="w-[46%]" />
            <col className="w-[12%]" />
            <col className="w-[26%]" />
          </colgroup>
          <tbody>
            <tr>
              <th className={cn(cell, "text-left font-bold")}>M/s.</th>
              <td className={cn(cell, "font-bold uppercase")}>
                {invoice.party.name}
              </td>
              <th className={cn(cell, "text-left font-bold")}>Bill No</th>
              <td className={cn(cell, "font-bold tabular-nums")}>
                {invoice.billNo}
              </td>
            </tr>
            <tr>
              <th className={cn(cell, "text-left font-bold")}>ADDRESS</th>
              <td className={cn(cell, "font-bold uppercase")} colSpan={3}>
                {invoice.party.address}
              </td>
            </tr>
            <tr>
              <th className={cn(cell, "text-left font-bold")}>GST NO</th>
              <td className={cn(cell, "font-bold uppercase")}>
                {invoice.party.gstNo}
              </td>
              <th className={cn(cell, "text-right font-bold")}>DATE:</th>
              <td className={cn(cell, "font-bold tabular-nums")}>
                {billDate(invoice.billDate)}
              </td>
            </tr>
            <tr>
              <th className={heading}>From</th>
              <td className={cn(cell, "text-center font-bold uppercase")}>
                {invoice.from}
              </td>
              <th className={cn(cell, "text-left font-bold")}>TO</th>
              <td className={cn(cell, "text-center font-bold uppercase")}>
                {invoice.to}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Charge lines */}
        <table className="-mt-px w-full table-fixed border-collapse">
          <colgroup>
            <col className="w-[12%]" />
            <col className="w-[14%]" />
            <col className="w-[33%]" />
            <col className="w-[10%]" />
            <col className="w-[13%]" />
            <col className="w-[13%]" />
            <col className="w-[5%]" />
          </colgroup>
          <thead>
            <tr>
              <th className={heading} rowSpan={2}>
                Challan No.
              </th>
              <th className={heading} rowSpan={2}>
                Date
              </th>
              <th className={heading} rowSpan={2}>
                Perticulars
              </th>
              <th className={heading} rowSpan={2}>
                Rate
              </th>
              <th className={heading} rowSpan={2}>
                Weight
              </th>
              <th className={heading} colSpan={2}>
                Amount
              </th>
            </tr>
            <tr>
              <th className={heading}>Rs.</th>
              <th className={heading}>Ps.</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line) => (
              <LineRow key={line.id} line={line} />
            ))}
            {Array.from({ length: blanks }, (_, i) => (
              <BlankRow key={`blank-${i}`} />
            ))}
            {invoice.partyInvoiceNo ? (
              <tr>
                <td className={cell} />
                <td className={cell} />
                <td className={cn(cell, "text-center font-bold")}>
                  INVOICE NO: {invoice.partyInvoiceNo}
                </td>
                <td className={cell} />
                <td className={cell} />
                <td className={cell} />
                <td className={cell} />
              </tr>
            ) : null}
          </tbody>
        </table>

        {/* Bank details against the total */}
        <table className="-mt-px w-full table-fixed border-collapse">
          <colgroup>
            <col className="w-[69%]" />
            <col className="w-[13%]" />
            <col className="w-[18%]" />
          </colgroup>
          <tbody>
            <tr>
              <td className={cn(cell, "p-2")} rowSpan={2}>
                <dl className="grid grid-cols-[5.5rem_1fr] gap-x-2 font-bold">
                  <dt>Our Bank:</dt>
                  <dd className="uppercase">
                    {company.bank.name} — {company.name}
                  </dd>
                  <dt>Branch:</dt>
                  <dd className="uppercase">{company.bank.branch}</dd>
                  <dt>A/c No.:</dt>
                  <dd className="tabular-nums">{company.bank.accountNo}</dd>
                  <dt>IFSC Code:</dt>
                  <dd className="tabular-nums">{company.bank.ifsc}</dd>
                </dl>
              </td>
              <td className={cn(cell, "h-8")} />
              <td className={cn(cell, "h-8")} />
            </tr>
            <tr>
              <th className={cn(cell, "bg-neutral-200 text-center font-bold")}>
                Total
              </th>
              <td className={cn(cell, "text-right font-bold tabular-nums")}>
                {rupees(total)}00
              </td>
            </tr>
          </tbody>
        </table>

        {/* Amount in words, then the standing terms */}
        <div className="-mt-px border-t border-black px-2 py-1.5 font-bold uppercase">
          Rupees: {amountInWords(total)}
        </div>

        <div className="flex items-end justify-between gap-3 border-t border-black px-2 py-1.5">
          <p className="text-[10px] font-bold">PAN No: {company.pan}</p>
          <p className="font-bold">E.&amp; O.E.</p>
          <div className="text-right">
            <p className="text-[10px]">For, {company.name}</p>
            <p className="font-bold">{company.jurisdiction}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
