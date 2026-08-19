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
import { Textarea } from "@/components/ui/textarea"
import { formatINR } from "@/lib/format"
import {
  tripDueFromParty,
  tripFreight,
  tripReceived,
  type Trip,
} from "@/lib/trip-register-types"
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
  columns = "sm:grid-cols-3",
}: {
  title: string
  note?: string
  children: React.ReactNode
  columns?: string
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
      <div className={cn("grid gap-3", columns)}>{children}</div>
    </section>
  )
}

/** Money and measure boxes: blank rather than a stubborn 0 when empty. */
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

export function TripFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  initial: Trip
  onSave: (trip: Trip) => void
}) {
  const [draft, setDraft] = React.useState<Trip>(initial)
  const [errors, setErrors] = React.useState<Errors>({})
  const [loaded, setLoaded] = React.useState<Trip>(initial)

  // The caller hands over a fresh object every time the dialog is opened, so a
  // changed identity means "start again from this record" — discard the draft.
  if (initial !== loaded) {
    setLoaded(initial)
    setDraft(initial)
    setErrors({})
  }

  const set = <K extends keyof Trip>(key: K, value: Trip[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  // Rate × weight is the hire the two lorry columns are drawn against, so the
  // balance follows the advance as they are typed. Both stay editable — hires
  // get rounded off, and a trip can be settled at a figure nobody quoted.
  const price = (rate: number, weight: number, advance: number) =>
    setDraft((d) => {
      const freight = Math.round(rate * weight)
      return {
        ...d,
        rate,
        weight,
        advance,
        balance: freight ? Math.max(0, freight - advance) : d.balance,
        partyPayment: freight || d.partyPayment,
      }
    })

  const freight = tripFreight(draft)
  const received = tripReceived(draft)
  const due = tripDueFromParty(draft)

  function handleSave() {
    const next: Errors = {}
    if (!draft.date) next.date = "Date is required"
    if (!draft.truckNo.trim()) next.truckNo = "Truck number is required"
    if (!draft.partyName.trim()) next.partyName = "Party is required"
    if (!draft.to.trim()) next.to = "Destination is required"
    if (draft.advance > freight && freight > 0)
      next.advance = "Advance is more than the whole hire"

    setErrors(next)
    if (Object.keys(next).length > 0) return

    onSave({
      ...draft,
      truckNo: draft.truckNo.trim().toUpperCase(),
      partyName: draft.partyName.trim(),
      brokerName: draft.brokerName.trim(),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[90dvh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "New trip" : `Edit trip — ${initial.truckNo}`}
          </DialogTitle>
          <DialogDescription>
            Fields follow the ledger, left to right: the trip, what the lorry is
            owed, then what the party has paid back against it.
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-4 overflow-y-auto px-4">
          <Section title="Trip">
            <Field label="Date" htmlFor="date" error={errors.date}>
              <Input
                id="date"
                type="date"
                value={draft.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </Field>
            <Field label="Truck No." htmlFor="truckNo" error={errors.truckNo}>
              <Input
                id="truckNo"
                placeholder="GJ-01-BT-4471"
                value={draft.truckNo}
                onChange={(e) => set("truckNo", e.target.value.toUpperCase())}
              />
            </Field>
            <Field label="L.R. No." htmlFor="lrNo" hint="Where one was raised">
              <Input
                id="lrNo"
                className="tabular-nums"
                value={draft.lrNo}
                onChange={(e) => set("lrNo", e.target.value)}
              />
            </Field>
            <Field
              label="Party Name"
              htmlFor="partyName"
              error={errors.partyName}
            >
              <Input
                id="partyName"
                value={draft.partyName}
                onChange={(e) => set("partyName", e.target.value)}
              />
            </Field>
            <Field
              label="Broker Name"
              htmlFor="brokerName"
              className="sm:col-span-2"
              hint="Leave blank where the office placed the lorry itself"
            >
              <Input
                id="brokerName"
                value={draft.brokerName}
                onChange={(e) => set("brokerName", e.target.value)}
              />
            </Field>
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
                value={draft.to}
                onChange={(e) => set("to", e.target.value)}
              />
            </Field>
            <Field label="Goods" htmlFor="goods">
              <Input
                id="goods"
                value={draft.goods}
                onChange={(e) => set("goods", e.target.value)}
              />
            </Field>
          </Section>

          <Section title="Freight">
            <Field label="Rate (₹/ton)" htmlFor="rate">
              <NumberInput
                id="rate"
                value={draft.rate}
                onValueChange={(v) => price(v, draft.weight, draft.advance)}
              />
            </Field>
            <Field label="Weight (ton)" htmlFor="weight">
              <NumberInput
                id="weight"
                step="0.01"
                value={draft.weight}
                onValueChange={(v) => price(draft.rate, v, draft.advance)}
              />
            </Field>
            <div className="self-end rounded-lg bg-muted/60 p-3">
              <dl className="flex items-center justify-between text-sm">
                <dt className="font-medium">Hire</dt>
                <dd className="font-semibold tabular-nums">
                  {formatINR(freight)}
                </dd>
              </dl>
            </div>
          </Section>

          <Section title="Owed to the lorry">
            <Field label="Advance" htmlFor="advance" error={errors.advance}>
              <NumberInput
                id="advance"
                value={draft.advance}
                onValueChange={(v) => price(draft.rate, draft.weight, v)}
              />
            </Field>
            <Field label="Balance" htmlFor="balance">
              <NumberInput
                id="balance"
                value={draft.balance}
                onValueChange={(v) => set("balance", v)}
              />
            </Field>
            <Field
              label="To Pay"
              htmlFor="toPay"
              hint="Freight collected at the delivery end instead"
            >
              <NumberInput
                id="toPay"
                value={draft.toPay}
                onValueChange={(v) => set("toPay", v)}
              />
            </Field>
            <Field
              label="Receive Date"
              htmlFor="receiveDate"
              hint="Advance taken by the driver"
            >
              <Input
                id="receiveDate"
                type="date"
                value={draft.receiveDate}
                onChange={(e) => set("receiveDate", e.target.value)}
              />
            </Field>
            <Field
              label="Paid Date"
              htmlFor="paidDate"
              hint="Balance settled with the lorry"
            >
              <Input
                id="paidDate"
                type="date"
                value={draft.paidDate}
                onChange={(e) => set("paidDate", e.target.value)}
              />
            </Field>
            <Field label="Commission" htmlFor="commission">
              <NumberInput
                id="commission"
                value={draft.commission}
                onValueChange={(v) => set("commission", v)}
              />
            </Field>
          </Section>

          <Section title="Party payment">
            <Field label="Party Payment" htmlFor="partyPayment">
              <NumberInput
                id="partyPayment"
                value={draft.partyPayment}
                onValueChange={(v) => set("partyPayment", v)}
              />
            </Field>
            <Field label="Advance Receive Rs." htmlFor="advanceReceiveRs">
              <NumberInput
                id="advanceReceiveRs"
                value={draft.advanceReceiveRs}
                onValueChange={(v) => set("advanceReceiveRs", v)}
              />
            </Field>
            <Field label="Advance Date" htmlFor="advanceDate">
              <Input
                id="advanceDate"
                type="date"
                value={draft.advanceDate}
                onChange={(e) => set("advanceDate", e.target.value)}
              />
            </Field>
            <Field label="Balance Receive Rs." htmlFor="balanceReceiveRs">
              <NumberInput
                id="balanceReceiveRs"
                value={draft.balanceReceiveRs}
                onValueChange={(v) => set("balanceReceiveRs", v)}
              />
            </Field>
            <Field label="Balance Date" htmlFor="balanceDate">
              <Input
                id="balanceDate"
                type="date"
                value={draft.balanceDate}
                onChange={(e) => set("balanceDate", e.target.value)}
              />
            </Field>
            <div className="self-end rounded-lg bg-muted/60 p-3">
              <dl className="grid gap-1 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Received</dt>
                  <dd className="tabular-nums">{formatINR(received)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="font-medium">Due</dt>
                  <dd className="font-semibold tabular-nums">
                    {formatINR(due)}
                  </dd>
                </div>
              </dl>
            </div>
          </Section>

          <Section title="Remarks" columns="">
            <Field label="Ledger note" htmlFor="remarks">
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
            Due from party{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {formatINR(due)}
            </span>
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {mode === "create" ? "Save trip" : "Save changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
