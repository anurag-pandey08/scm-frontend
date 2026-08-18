"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { STATIONS, type Company } from "@/lib/companies"
import { formatINR } from "@/lib/format"
import {
  BILTY_STATUSES,
  PAYMENT_TYPES,
  RISK_TYPES,
  balanceDue,
  grossTotal,
  type Bilty,
  type BiltyCharges,
  type Party,
} from "@/lib/types"
import { cn } from "@/lib/utils"

type Errors = Partial<Record<string, string>>

function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

function Section({
  title,
  note,
  children,
}: {
  title: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <section className="border-b py-4 last:border-b-0">
      <div className="mb-3 flex items-baseline gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </h3>
        {note ? (
          <span className="text-xs text-muted-foreground">{note}</span>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  )
}

/** Money and count inputs: blank rather than a stubborn 0 when empty. */
function NumberInput({
  id,
  value,
  onValueChange,
  step,
  placeholder = "0",
}: {
  id: string
  value: number
  onValueChange: (value: number) => void
  step?: string
  placeholder?: string
}) {
  return (
    <Input
      id={id}
      type="number"
      inputMode="decimal"
      min={0}
      step={step}
      placeholder={placeholder}
      className="tabular-nums"
      value={value === 0 ? "" : String(value)}
      onChange={(event) => {
        const parsed = Number(event.target.value)
        onValueChange(Number.isFinite(parsed) && parsed >= 0 ? parsed : 0)
      }}
    />
  )
}

export function BiltyFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  company,
  takenLrNos,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  initial: Bilty
  /** Whose book is being written in — it owns the booking offices. */
  company: Company
  /** L.R. numbers already in the book, excluding the record being edited. */
  takenLrNos: string[]
  onSave: (bilty: Bilty) => void
}) {
  const [draft, setDraft] = React.useState<Bilty>(initial)
  const [errors, setErrors] = React.useState<Errors>({})
  const [loaded, setLoaded] = React.useState<Bilty>(initial)

  // The caller hands over a fresh object every time the dialog is opened, so a
  // changed identity means "start again from this record" — discard the draft.
  if (initial !== loaded) {
    setLoaded(initial)
    setDraft(initial)
    setErrors({})
  }

  const set = <K extends keyof Bilty>(key: K, value: Bilty[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const setParty = (
    which: "consignor" | "consignee",
    key: keyof Party,
    value: string
  ) => setDraft((d) => ({ ...d, [which]: { ...d[which], [key]: value } }))

  const setCharge = (key: keyof BiltyCharges, value: number) =>
    setDraft((d) => ({ ...d, charges: { ...d.charges, [key]: value } }))

  const gross = grossTotal(draft.charges)
  const balance = balanceDue(draft.charges)

  function handleSave() {
    const next: Errors = {}
    const lrNo = draft.lrNo.trim()
    if (!lrNo) next.lrNo = "L.R. number is required"
    else if (takenLrNos.includes(lrNo))
      next.lrNo = `L.R. ${lrNo} is already in the register`
    if (!draft.lrDate) next.lrDate = "Date is required"
    if (!draft.to.trim()) next.to = "Destination is required"
    if (!draft.consignor.name.trim())
      next.consignorName = "Consignor is required"
    if (!draft.consignee.name.trim())
      next.consigneeName = "Consignee is required"
    if (draft.charges.advance > gross)
      next.advance = "Advance cannot exceed the gross total"

    setErrors(next)
    if (Object.keys(next).length > 0) return

    onSave({
      ...draft,
      lrNo,
      id: draft.id || `bilty-${lrNo}`,
      charges: { ...draft.charges },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[90dvh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "New bilty" : `Edit bilty ${initial.lrNo}`}
          </DialogTitle>
          <DialogDescription>
            Fields follow the printed L.R. book. Goods are carried at owner&rsquo;s
            risk unless marked otherwise.
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-4 overflow-y-auto px-4">
          <Section title="Consignment">
            <Field label="L.R. No." htmlFor="lrNo" error={errors.lrNo}>
              <Input
                id="lrNo"
                className="tabular-nums"
                value={draft.lrNo}
                onChange={(e) => set("lrNo", e.target.value)}
              />
            </Field>
            <Field label="Date" htmlFor="lrDate" error={errors.lrDate}>
              <Input
                id="lrDate"
                type="date"
                value={draft.lrDate}
                onChange={(e) => set("lrDate", e.target.value)}
              />
            </Field>
            <Field label="Lorry No." htmlFor="lorryNo">
              <Input
                id="lorryNo"
                placeholder="GJ-01-BT-4471"
                value={draft.lorryNo}
                onChange={(e) => set("lorryNo", e.target.value.toUpperCase())}
              />
            </Field>
            <Field label="Booking office" htmlFor="bookingOffice">
              <Select
                value={draft.bookingOffice}
                onValueChange={(value) => value && set("bookingOffice", value)}
              >
                <SelectTrigger id="bookingOffice" className="w-full">
                  <SelectValue placeholder="Select office" />
                </SelectTrigger>
                <SelectContent>
                  {company.bookingOffices.map((office) => (
                    <SelectItem key={office} value={office}>
                      {office}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="From" htmlFor="from">
              <Select
                value={draft.from}
                onValueChange={(value) => value && set("from", value)}
              >
                <SelectTrigger id="from" className="w-full">
                  <SelectValue placeholder="Origin" />
                </SelectTrigger>
                <SelectContent>
                  {STATIONS.map((station) => (
                    <SelectItem key={station} value={station}>
                      {station}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="To" htmlFor="to" error={errors.to}>
              <Select
                value={draft.to}
                onValueChange={(value) => value && set("to", value)}
              >
                <SelectTrigger id="to" className="w-full">
                  <SelectValue placeholder="Destination" />
                </SelectTrigger>
                <SelectContent>
                  {STATIONS.map((station) => (
                    <SelectItem key={station} value={station}>
                      {station}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </Section>

          <Section title="Consignor">
            <Field
              label="M/s"
              htmlFor="consignorName"
              error={errors.consignorName}
            >
              <Input
                id="consignorName"
                value={draft.consignor.name}
                onChange={(e) => setParty("consignor", "name", e.target.value)}
              />
            </Field>
            <Field label="GST No." htmlFor="consignorGst">
              <Input
                id="consignorGst"
                placeholder="24AACCS4471K1ZP"
                value={draft.consignor.gstNo}
                onChange={(e) =>
                  setParty("consignor", "gstNo", e.target.value.toUpperCase())
                }
              />
            </Field>
            <Field
              label="Address"
              htmlFor="consignorAddress"
              className="sm:col-span-2"
            >
              <Textarea
                id="consignorAddress"
                rows={2}
                value={draft.consignor.address}
                onChange={(e) =>
                  setParty("consignor", "address", e.target.value)
                }
              />
            </Field>
          </Section>

          <Section title="Consignee">
            <Field
              label="M/s"
              htmlFor="consigneeName"
              error={errors.consigneeName}
            >
              <Input
                id="consigneeName"
                value={draft.consignee.name}
                onChange={(e) => setParty("consignee", "name", e.target.value)}
              />
            </Field>
            <Field label="GST No." htmlFor="consigneeGst">
              <Input
                id="consigneeGst"
                value={draft.consignee.gstNo}
                onChange={(e) =>
                  setParty("consignee", "gstNo", e.target.value.toUpperCase())
                }
              />
            </Field>
            <Field
              label="Address"
              htmlFor="consigneeAddress"
              className="sm:col-span-2"
            >
              <Textarea
                id="consigneeAddress"
                rows={2}
                value={draft.consignee.address}
                onChange={(e) =>
                  setParty("consignee", "address", e.target.value)
                }
              />
            </Field>
            <Field
              label="Delivery at"
              htmlFor="deliveryAt"
              className="sm:col-span-2"
            >
              <Input
                id="deliveryAt"
                value={draft.deliveryAt}
                onChange={(e) => set("deliveryAt", e.target.value)}
              />
            </Field>
          </Section>

          <Section title="Goods" note="Said to contain — declared by the consignor">
            <Field
              label="Contents"
              htmlFor="contents"
              className="sm:col-span-2"
            >
              <Input
                id="contents"
                value={draft.contents}
                onChange={(e) => set("contents", e.target.value)}
              />
            </Field>
            <Field label="Packages" htmlFor="packages">
              <NumberInput
                id="packages"
                value={draft.packages}
                onValueChange={(v) => set("packages", v)}
              />
            </Field>
            <Field label="Declared value (₹)" htmlFor="declaredValue">
              <NumberInput
                id="declaredValue"
                value={draft.declaredValue}
                onValueChange={(v) => set("declaredValue", v)}
              />
            </Field>
            <Field label="Actual weight (kg)" htmlFor="actualWeight">
              <NumberInput
                id="actualWeight"
                value={draft.actualWeight}
                onValueChange={(v) => set("actualWeight", v)}
              />
            </Field>
            <Field
              label="Charged weight (kg)"
              htmlFor="chargedWeight"
              hint="Whichever is higher — actual or volumetric"
            >
              <NumberInput
                id="chargedWeight"
                value={draft.chargedWeight}
                onValueChange={(v) => set("chargedWeight", v)}
              />
            </Field>
            <Field label="Rate (₹ per quintal)" htmlFor="rate">
              <NumberInput
                id="rate"
                value={draft.rate}
                onValueChange={(v) => set("rate", v)}
              />
            </Field>
            <Field label="Risk" htmlFor="risk">
              <Select
                value={draft.risk}
                onValueChange={(value) => value && set("risk", value)}
              >
                <SelectTrigger id="risk" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RISK_TYPES.map((risk) => (
                    <SelectItem key={risk} value={risk}>
                      {risk}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Invoice No." htmlFor="invoiceNo">
              <Input
                id="invoiceNo"
                value={draft.invoiceNo}
                onChange={(e) => set("invoiceNo", e.target.value)}
              />
            </Field>
            <Field label="E-Way Bill No." htmlFor="eWayBillNo">
              <Input
                id="eWayBillNo"
                className="tabular-nums"
                value={draft.eWayBillNo}
                onChange={(e) => set("eWayBillNo", e.target.value)}
              />
            </Field>
          </Section>

          <Section title="Charges">
            <Field label="Freight (₹)" htmlFor="freight">
              <NumberInput
                id="freight"
                value={draft.charges.freight}
                onValueChange={(v) => setCharge("freight", v)}
              />
            </Field>
            <Field label="A.O.C. (₹)" htmlFor="aoc" hint="Any other charges">
              <NumberInput
                id="aoc"
                value={draft.charges.aoc}
                onValueChange={(v) => setCharge("aoc", v)}
              />
            </Field>
            <Field label="Hamali (₹)" htmlFor="hamali">
              <NumberInput
                id="hamali"
                value={draft.charges.hamali}
                onValueChange={(v) => setCharge("hamali", v)}
              />
            </Field>
            <Field label="St. Charges (₹)" htmlFor="stCharges">
              <NumberInput
                id="stCharges"
                value={draft.charges.stCharges}
                onValueChange={(v) => setCharge("stCharges", v)}
              />
            </Field>
            <Field label="Other charges (₹)" htmlFor="otherCharges">
              <NumberInput
                id="otherCharges"
                value={draft.charges.otherCharges}
                onValueChange={(v) => setCharge("otherCharges", v)}
              />
            </Field>
            <Field label="Advance (₹)" htmlFor="advance" error={errors.advance}>
              <NumberInput
                id="advance"
                value={draft.charges.advance}
                onValueChange={(v) => setCharge("advance", v)}
              />
            </Field>

            <div className="rounded-lg bg-muted/60 p-3 sm:col-span-2">
              <dl className="grid gap-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Gr. Total</dt>
                  <dd className="font-semibold tabular-nums">
                    {formatINR(gross)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Less advance</dt>
                  <dd className="tabular-nums">
                    {formatINR(draft.charges.advance)}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-t pt-1.5">
                  <dt className="font-medium">Balance to collect</dt>
                  <dd className="font-semibold tabular-nums">
                    {formatINR(balance)}
                  </dd>
                </div>
              </dl>
            </div>
          </Section>

          <Section title="Terms & status">
            <Field label="Freight terms" htmlFor="paymentType">
              <Select
                value={draft.paymentType}
                onValueChange={(value) => value && set("paymentType", value)}
              >
                <SelectTrigger id="paymentType" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status" htmlFor="status">
              <Select
                value={draft.status}
                onValueChange={(value) => value && set("status", value)}
              >
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BILTY_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Remarks" htmlFor="remarks" className="sm:col-span-2">
              <Textarea
                id="remarks"
                rows={2}
                value={draft.remarks}
                onChange={(e) => set("remarks", e.target.value)}
              />
            </Field>
          </Section>

          <Section
            title="Insurance"
            note="Leave blank if the party has not insured the consignment"
          >
            <Field label="Company" htmlFor="insuranceCompany">
              <Input
                id="insuranceCompany"
                value={draft.insurance.company}
                onChange={(e) =>
                  set("insurance", {
                    ...draft.insurance,
                    company: e.target.value,
                  })
                }
              />
            </Field>
            <Field label="Policy No." htmlFor="insurancePolicy">
              <Input
                id="insurancePolicy"
                value={draft.insurance.policyNo}
                onChange={(e) =>
                  set("insurance", {
                    ...draft.insurance,
                    policyNo: e.target.value,
                  })
                }
              />
            </Field>
            <Field label="Policy date" htmlFor="insuranceDate">
              <Input
                id="insuranceDate"
                type="date"
                value={draft.insurance.date}
                onChange={(e) =>
                  set("insurance", { ...draft.insurance, date: e.target.value })
                }
              />
            </Field>
            <Field label="Insured amount (₹)" htmlFor="insuranceAmount">
              <NumberInput
                id="insuranceAmount"
                value={draft.insurance.amount}
                onValueChange={(v) =>
                  set("insurance", { ...draft.insurance, amount: v })
                }
              />
            </Field>
          </Section>
        </div>

        <DialogFooter className="sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Gr. Total{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {formatINR(gross)}
            </span>
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {mode === "create" ? "Save bilty" : "Save changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
