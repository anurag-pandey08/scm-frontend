"use client"

import * as React from "react"
import { PlusIcon, Trash2Icon } from "lucide-react"

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
import { formatINR } from "@/lib/format"
import {
  INVOICE_STATUSES,
  emptyLine,
  freightAmount,
  invoiceTotal,
  type Invoice,
  type InvoiceLine,
  type LineKind,
} from "@/lib/invoice-types"
import type { Party } from "@/lib/types"
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
  columns = true,
}: {
  title: string
  note?: string
  children: React.ReactNode
  columns?: boolean
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
      <div className={cn("grid gap-3", columns && "sm:grid-cols-2")}>
        {children}
      </div>
    </section>
  )
}

/** Money and count inputs: blank rather than a stubborn 0 when empty. */
function NumberInput({
  id,
  value,
  onValueChange,
  step,
  className,
  placeholder = "0",
}: {
  id: string
  value: number
  onValueChange: (value: number) => void
  step?: string
  className?: string
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
      className={cn("tabular-nums", className)}
      value={value === 0 ? "" : String(value)}
      onChange={(event) => {
        const parsed = Number(event.target.value)
        onValueChange(Number.isFinite(parsed) && parsed >= 0 ? parsed : 0)
      }}
    />
  )
}

/**
 * One row of the charge column. A freight line prices a challan by the tonne
 * and fills its own amount in; a charge line is a lump sum, so the rate and
 * weight boxes stay off it entirely — same as the paper.
 */
function LineRow({
  line,
  index,
  onChange,
  onRemove,
  removable,
}: {
  line: InvoiceLine
  index: number
  onChange: (line: InvoiceLine) => void
  onRemove: () => void
  removable: boolean
}) {
  const freight = line.kind === "Freight"
  const id = (part: string) => `line-${line.id}-${part}`

  const set = <K extends keyof InvoiceLine>(key: K, value: InvoiceLine[K]) =>
    onChange({ ...line, [key]: value })

  // Rate × weight is what the office quotes, so it fills the amount in as the
  // two are typed. The amount stays editable — bills get rounded off.
  const price = (rate: number, weight: number) =>
    onChange({ ...line, rate, weight, amount: freightAmount(rate, weight) })

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          {freight ? `Freight line ${index + 1}` : `Charge line ${index + 1}`}
        </p>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={!removable}
          aria-label={`Remove line ${index + 1}`}
          onClick={onRemove}
        >
          <Trash2Icon />
        </Button>
      </div>

      <div
        className={cn(
          "grid gap-2",
          freight ? "sm:grid-cols-6" : "sm:grid-cols-3"
        )}
      >
        {freight ? (
          <>
            <Field label="Challan No." htmlFor={id("challan")}>
              <Input
                id={id("challan")}
                className="tabular-nums"
                placeholder="L.R. no."
                value={line.challanNo}
                onChange={(e) => set("challanNo", e.target.value)}
              />
            </Field>
            <Field label="Date" htmlFor={id("date")}>
              <Input
                id={id("date")}
                type="date"
                value={line.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </Field>
            <Field label="Perticulars" htmlFor={id("particulars")}>
              <Input
                id={id("particulars")}
                placeholder="Lorry no."
                value={line.particulars}
                onChange={(e) =>
                  set("particulars", e.target.value.toUpperCase())
                }
              />
            </Field>
            <Field label="Rate (₹/ton)" htmlFor={id("rate")}>
              <NumberInput
                id={id("rate")}
                value={line.rate}
                onValueChange={(v) => price(v, line.weight)}
              />
            </Field>
            <Field label="Weight (ton)" htmlFor={id("weight")}>
              <NumberInput
                id={id("weight")}
                step="0.01"
                value={line.weight}
                onValueChange={(v) => price(line.rate, v)}
              />
            </Field>
            <Field label="Amount (₹)" htmlFor={id("amount")}>
              <NumberInput
                id={id("amount")}
                value={line.amount}
                onValueChange={(v) => set("amount", v)}
              />
            </Field>
          </>
        ) : (
          <>
            <Field
              label="Perticulars"
              htmlFor={id("particulars")}
              className="sm:col-span-2"
            >
              <Input
                id={id("particulars")}
                placeholder="Detention, halting, extra labour…"
                value={line.particulars}
                onChange={(e) => set("particulars", e.target.value)}
              />
            </Field>
            <Field label="Amount (₹)" htmlFor={id("amount")}>
              <NumberInput
                id={id("amount")}
                value={line.amount}
                onValueChange={(v) => set("amount", v)}
              />
            </Field>
          </>
        )}
      </div>
    </div>
  )
}

export function InvoiceFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  takenBillNos,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  initial: Invoice
  /** Bill numbers already in the book, excluding the record being edited. */
  takenBillNos: string[]
  onSave: (invoice: Invoice) => void
}) {
  const [draft, setDraft] = React.useState<Invoice>(initial)
  const [errors, setErrors] = React.useState<Errors>({})
  const [loaded, setLoaded] = React.useState<Invoice>(initial)

  // The caller hands over a fresh object every time the dialog is opened, so a
  // changed identity means "start again from this record" — discard the draft.
  if (initial !== loaded) {
    setLoaded(initial)
    setDraft(initial)
    setErrors({})
  }

  const set = <K extends keyof Invoice>(key: K, value: Invoice[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const setParty = (key: keyof Party, value: string) =>
    setDraft((d) => ({ ...d, party: { ...d.party, [key]: value } }))

  const setLine = (line: InvoiceLine) =>
    setDraft((d) => ({
      ...d,
      lines: d.lines.map((l) => (l.id === line.id ? line : l)),
    }))

  const addLine = (kind: LineKind) =>
    setDraft((d) => ({
      ...d,
      lines: [
        ...d.lines,
        kind === "Freight" ? { ...emptyLine(kind), date: d.billDate } : emptyLine(kind),
      ],
    }))

  const removeLine = (id: string) =>
    setDraft((d) => ({ ...d, lines: d.lines.filter((l) => l.id !== id) }))

  const total = invoiceTotal(draft)

  function handleSave() {
    const next: Errors = {}
    const billNo = draft.billNo.trim()
    if (!billNo) next.billNo = "Bill number is required"
    else if (takenBillNos.includes(billNo))
      next.billNo = `Bill ${billNo} is already in the book`
    if (!draft.billDate) next.billDate = "Date is required"
    if (!draft.party.name.trim()) next.partyName = "Party is required"
    if (!draft.to.trim()) next.to = "Destination is required"
    if (draft.lines.length === 0) next.lines = "A bill needs at least one line"
    if (draft.lines.some((l) => !l.particulars.trim()))
      next.lines = "Every line needs a perticulars entry"
    if (draft.status === "Paid" && !draft.paidOn)
      next.paidOn = "Record the date the party settled"

    setErrors(next)
    if (Object.keys(next).length > 0) return

    onSave({
      ...draft,
      billNo,
      id: draft.id || `invoice-${billNo}`,
      lines: draft.lines.map((l) => ({ ...l })),
      paidOn: draft.status === "Paid" ? draft.paidOn : "",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[90dvh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "New bill" : `Edit bill ${initial.billNo}`}
          </DialogTitle>
          <DialogDescription>
            Fields follow the printed bill book. One bill carries one party and
            one route; each challan on it is a line of the charge column.
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-4 overflow-y-auto px-4">
          <Section title="Bill">
            <Field label="Bill No." htmlFor="billNo" error={errors.billNo}>
              <Input
                id="billNo"
                className="tabular-nums"
                value={draft.billNo}
                onChange={(e) => set("billNo", e.target.value)}
              />
            </Field>
            <Field label="Date" htmlFor="billDate" error={errors.billDate}>
              <Input
                id="billDate"
                type="date"
                value={draft.billDate}
                onChange={(e) => set("billDate", e.target.value)}
              />
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
                  {INVOICE_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              label="Settled on"
              htmlFor="paidOn"
              error={errors.paidOn}
              hint="Only once the party has paid"
            >
              <Input
                id="paidOn"
                type="date"
                disabled={draft.status !== "Paid"}
                value={draft.paidOn}
                onChange={(e) => set("paidOn", e.target.value)}
              />
            </Field>
          </Section>

          <Section title="Party">
            <Field label="M/s" htmlFor="partyName" error={errors.partyName}>
              <Input
                id="partyName"
                value={draft.party.name}
                onChange={(e) => setParty("name", e.target.value)}
              />
            </Field>
            <Field label="GST No." htmlFor="partyGst">
              <Input
                id="partyGst"
                placeholder="21AAFCI9440L1ZG"
                value={draft.party.gstNo}
                onChange={(e) => setParty("gstNo", e.target.value.toUpperCase())}
              />
            </Field>
            <Field
              label="Address"
              htmlFor="partyAddress"
              className="sm:col-span-2"
            >
              <Textarea
                id="partyAddress"
                rows={2}
                value={draft.party.address}
                onChange={(e) => setParty("address", e.target.value)}
              />
            </Field>
          </Section>

          <Section
            title="Route"
            note="Typed, not picked — bills run to stations the office never books from"
          >
            <Field label="From" htmlFor="from">
              <Input
                id="from"
                value={draft.from}
                onChange={(e) => set("from", e.target.value)}
              />
            </Field>
            <Field label="To" htmlFor="to" error={errors.to}>
              <Input
                id="to"
                placeholder="Khurdha (Odisha)"
                value={draft.to}
                onChange={(e) => set("to", e.target.value)}
              />
            </Field>
            <Field
              label="Party's invoice no."
              htmlFor="partyInvoiceNo"
              hint="The goods invoice, printed under the charge lines"
            >
              <Input
                id="partyInvoiceNo"
                className="tabular-nums"
                value={draft.partyInvoiceNo}
                onChange={(e) => set("partyInvoiceNo", e.target.value)}
              />
            </Field>
          </Section>

          <Section title="Charge lines" columns={false}>
            {draft.lines.map((line, index) => (
              <LineRow
                key={line.id}
                line={line}
                index={index}
                onChange={setLine}
                onRemove={() => removeLine(line.id)}
                removable={draft.lines.length > 1}
              />
            ))}

            {errors.lines ? (
              <p className="text-xs text-destructive">{errors.lines}</p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => addLine("Freight")}>
                <PlusIcon data-icon="inline-start" />
                Add challan
              </Button>
              <Button variant="outline" onClick={() => addLine("Charge")}>
                <PlusIcon data-icon="inline-start" />
                Add detention / other charge
              </Button>
            </div>

            <div className="rounded-lg bg-muted/60 p-3">
              <dl className="flex items-center justify-between text-sm">
                <dt className="font-medium">Total</dt>
                <dd className="font-semibold tabular-nums">
                  {formatINR(total)}
                </dd>
              </dl>
            </div>
          </Section>

          <Section title="Remarks" columns={false}>
            <Field label="Office note" htmlFor="remarks">
              <Textarea
                id="remarks"
                rows={2}
                value={draft.remarks}
                onChange={(e) => set("remarks", e.target.value)}
              />
            </Field>
          </Section>
        </div>

        <DialogFooter className="sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Total{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {formatINR(total)}
            </span>
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {mode === "create" ? "Save bill" : "Save changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
