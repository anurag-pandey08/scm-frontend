"use client"

import { PencilIcon } from "lucide-react"

import { PaymentBadge, StatusBadge } from "@/components/bilty/badges"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { Company } from "@/lib/companies"
import { formatDate, formatINR, formatNumber, formatWeight } from "@/lib/format"
import { balanceDue, grossTotal, type Bilty } from "@/lib/types"

function Row({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 py-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words">{value || "—"}</dd>
    </div>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      <dl>{children}</dl>
    </section>
  )
}

export function BiltyDetailSheet({
  bilty,
  company,
  open,
  onOpenChange,
  onEdit,
}: {
  bilty: Bilty | null
  company: Company
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (bilty: Bilty) => void
}) {
  if (!bilty) return null

  const charges = bilty.charges
  const gross = grossTotal(charges)
  const balance = balanceDue(charges)

  const chargeLines: [string, number][] = [
    ["Freight", charges.freight],
    ["A.O.C.", charges.aoc],
    ["Hamali", charges.hamali],
    ["St. Charges", charges.stCharges],
    ["Other charges", charges.otherCharges],
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-lg">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2">
            L.R. No. {bilty.lrNo}
            <StatusBadge status={bilty.status} />
          </SheetTitle>
          <SheetDescription>
            {formatDate(bilty.lrDate)} · {bilty.from} → {bilty.to} ·{" "}
            {bilty.lorryNo}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <Block title="Consignor">
            <Row label="M/s" value={bilty.consignor.name} />
            <Row label="Address" value={bilty.consignor.address} />
            <Row label="GST No." value={bilty.consignor.gstNo} />
          </Block>

          <Separator />

          <Block title="Consignee">
            <Row label="M/s" value={bilty.consignee.name} />
            <Row label="Address" value={bilty.consignee.address} />
            <Row label="GST No." value={bilty.consignee.gstNo} />
            <Row label="Delivery at" value={bilty.deliveryAt} />
          </Block>

          <Separator />

          <Block title="Goods">
            <Row label="Contents" value={bilty.contents} />
            <Row label="Packages" value={formatNumber(bilty.packages)} />
            <Row
              label="Weight"
              value={`${formatWeight(bilty.actualWeight)} actual · ${formatWeight(bilty.chargedWeight)} charged`}
            />
            <Row label="Value" value={formatINR(bilty.declaredValue)} />
            <Row label="Rate" value={`${formatINR(bilty.rate)} per quintal`} />
            <Row label="Invoice No." value={bilty.invoiceNo} />
            <Row label="E-Way Bill" value={bilty.eWayBillNo} />
            <Row label="Risk" value={bilty.risk} />
          </Block>

          <Separator />

          <Block title="Charges">
            <div className="rounded-lg bg-muted/60 p-3">
              <dl className="space-y-1 text-sm">
                {chargeLines.map(([label, amount]) => (
                  <div key={label} className="flex justify-between">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="tabular-nums">{formatINR(amount)}</dd>
                  </div>
                ))}
                <div className="flex justify-between border-t pt-1 font-medium">
                  <dt>Gr. Total</dt>
                  <dd className="tabular-nums">{formatINR(gross)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Less advance</dt>
                  <dd className="tabular-nums">{formatINR(charges.advance)}</dd>
                </div>
                <div className="flex justify-between border-t pt-1 font-semibold">
                  <dt>Balance to collect</dt>
                  <dd className="tabular-nums">{formatINR(balance)}</dd>
                </div>
              </dl>
            </div>
            <div className="mt-2">
              <Row
                label="Freight terms"
                value={<PaymentBadge type={bilty.paymentType} />}
              />
            </div>
          </Block>

          <Separator />

          <Block title="Insurance">
            {bilty.insurance.company ? (
              <>
                <Row label="Company" value={bilty.insurance.company} />
                <Row label="Policy No." value={bilty.insurance.policyNo} />
                <Row label="Policy date" value={formatDate(bilty.insurance.date)} />
                <Row label="Amount" value={formatINR(bilty.insurance.amount)} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                The party has declared the consignment uninsured. Carried at{" "}
                {bilty.risk.toLowerCase()}.
              </p>
            )}
          </Block>

          {bilty.remarks ? (
            <>
              <Separator />
              <Block title="Remarks">
                <p className="text-sm">{bilty.remarks}</p>
              </Block>
            </>
          ) : null}

          <Separator />

          <div className="text-xs leading-relaxed text-muted-foreground">
            <p className="font-medium text-foreground">{company.name}</p>
            <p>{company.address}</p>
            <p className="mt-1">
              PAN {company.pan} · {company.bank.name} A/C{" "}
              {company.bank.accountNo} · IFSC {company.bank.ifsc}
            </p>
            <p className="mt-1">
              Booked at {bilty.bookingOffice}. Not responsible for breakage or
              leakage. {company.jurisdiction}.
            </p>
          </div>
        </div>

        <SheetFooter className="border-t">
          <Button
            onClick={() => {
              onOpenChange(false)
              onEdit(bilty)
            }}
          >
            <PencilIcon data-icon="inline-start" />
            Edit bilty
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
