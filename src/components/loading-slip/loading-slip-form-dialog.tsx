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
import { formatINR } from "@/lib/format"
import {
  LOADING_SLIP_STATUSES,
  slipBalance,
  type LoadingSlip,
  type SlipDimensions,
} from "@/lib/loading-slip-types"
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

/** Money and measure inputs: blank rather than a stubborn 0 when empty. */
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

export function LoadingSlipFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  takenSlipNos,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  initial: LoadingSlip
  /** Slip numbers already in the book, excluding the record being edited. */
  takenSlipNos: string[]
  onSave: (slip: LoadingSlip) => void
}) {
  const [draft, setDraft] = React.useState<LoadingSlip>(initial)
  const [errors, setErrors] = React.useState<Errors>({})
  const [loaded, setLoaded] = React.useState<LoadingSlip>(initial)

  // The caller hands over a fresh object every time the dialog is opened, so a
  // changed identity means "start again from this record" — discard the draft.
  if (initial !== loaded) {
    setLoaded(initial)
    setDraft(initial)
    setErrors({})
  }

  const set = <K extends keyof LoadingSlip>(key: K, value: LoadingSlip[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const setBed = (key: keyof SlipDimensions, value: number) =>
    setDraft((d) => ({ ...d, dimensions: { ...d.dimensions, [key]: value } }))

  // Rate × weight is what the office quotes, so it fills the hire in as the two
  // are typed. The figure stays editable — lorries also go on a lump sum, and
  // then the rate box is left at zero exactly as on the paper.
  const price = (rate: number, weight: number) =>
    setDraft((d) => ({
      ...d,
      rate,
      weight,
      totalFreight: rate && weight ? Math.round(rate * weight) : d.totalFreight,
    }))

  const balance = slipBalance(draft)

  function handleSave() {
    const next: Errors = {}
    const slipNo = draft.slipNo.trim()
    if (!slipNo) next.slipNo = "Slip number is required"
    else if (takenSlipNos.includes(slipNo))
      next.slipNo = `Slip ${slipNo} is already in the book`
    if (!draft.slipDate) next.slipDate = "Date is required"
    if (!draft.party.trim()) next.party = "Whose order the lorry is against"
    if (!draft.vehicleNo.trim()) next.vehicleNo = "Lorry number is required"
    if (!draft.to.trim()) next.to = "Destination is required"
    if (!draft.totalFreight) next.totalFreight = "Agreed hire is required"
    if (draft.advance > draft.totalFreight + draft.detention)
      next.advance = "Advance is more than the whole hire"

    setErrors(next)
    if (Object.keys(next).length > 0) return

    onSave({
      ...draft,
      slipNo,
      id: draft.id || `slip-${slipNo}`,
      party: draft.party.trim(),
      vehicleNo: draft.vehicleNo.trim().toUpperCase(),
      dimensions: { ...draft.dimensions },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[90dvh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create"
              ? "New loading slip"
              : `Edit slip ${initial.slipNo}`}
          </DialogTitle>
          <DialogDescription>
            Fields follow the printed slip book. One slip is one lorry placed
            against one order — no goods are booked here, and nobody is charged.
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-4 overflow-y-auto px-4">
          <Section title="Slip">
            <Field label="No." htmlFor="slipNo" error={errors.slipNo}>
              <Input
                id="slipNo"
                className="tabular-nums"
                value={draft.slipNo}
                onChange={(e) => set("slipNo", e.target.value)}
              />
            </Field>
            <Field label="Date" htmlFor="slipDate" error={errors.slipDate}>
              <Input
                id="slipDate"
                type="date"
                value={draft.slipDate}
                onChange={(e) => set("slipDate", e.target.value)}
              />
            </Field>
            <Field
              label="To M/s."
              htmlFor="party"
              error={errors.party}
              hint="The party or transport firm whose order the lorry is against"
            >
              <Input
                id="party"
                value={draft.party}
                onChange={(e) => set("party", e.target.value)}
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
                  {LOADING_SLIP_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </Section>

          <Section title="Lorry and route">
            <Field
              label="Vehicle no."
              htmlFor="vehicleNo"
              error={errors.vehicleNo}
            >
              <Input
                id="vehicleNo"
                placeholder="GJ-01-BT-4471"
                value={draft.vehicleNo}
                onChange={(e) => set("vehicleNo", e.target.value.toUpperCase())}
              />
            </Field>
            <Field label="From" htmlFor="from">
              <Input
                id="from"
                value={draft.from}
                onChange={(e) => set("from", e.target.value)}
              />
            </Field>
            <Field
              label="To"
              htmlFor="to"
              error={errors.to}
              hint="Typed, not picked — a lorry is placed wherever the order sends it"
            >
              <Input
                id="to"
                placeholder="Hathras"
                value={draft.to}
                onChange={(e) => set("to", e.target.value)}
              />
            </Field>
          </Section>

          <Section title="Hire">
            <Field
              label="Rate (₹/ton)"
              htmlFor="rate"
              hint="Leave at zero on a lump-sum trip"
            >
              <NumberInput
                id="rate"
                value={draft.rate}
                onValueChange={(v) => price(v, draft.weight)}
              />
            </Field>
            <Field label="Weight (ton)" htmlFor="weight">
              <NumberInput
                id="weight"
                step="0.01"
                value={draft.weight}
                onValueChange={(v) => price(draft.rate, v)}
              />
            </Field>
            <Field
              label="Total freight (₹)"
              htmlFor="totalFreight"
              error={errors.totalFreight}
            >
              <NumberInput
                id="totalFreight"
                value={draft.totalFreight}
                onValueChange={(v) => set("totalFreight", v)}
              />
            </Field>
            <Field
              label="Advance (₹)"
              htmlFor="advance"
              error={errors.advance}
              hint="Handed to the driver at the loading point"
            >
              <NumberInput
                id="advance"
                value={draft.advance}
                onValueChange={(v) => set("advance", v)}
              />
            </Field>
            <Field
              label="Loading point detention (₹)"
              htmlFor="detention"
              hint="Allowed on top of the hire"
            >
              <NumberInput
                id="detention"
                value={draft.detention}
                onValueChange={(v) => set("detention", v)}
              />
            </Field>

            <div className="self-end rounded-lg bg-muted/60 p-3">
              <dl className="flex items-center justify-between text-sm">
                <dt className="font-medium">Balance</dt>
                <dd className="font-semibold tabular-nums">
                  {formatINR(balance)}
                </dd>
              </dl>
            </div>
          </Section>

          <Section
            title="Length"
            note="Feet — the bed the order asked for, printed L X W X H"
          >
            <div className="grid grid-cols-3 gap-3 sm:col-span-2">
              <Field label="Length" htmlFor="bedLength">
                <NumberInput
                  id="bedLength"
                  step="0.01"
                  value={draft.dimensions.length}
                  onValueChange={(v) => setBed("length", v)}
                />
              </Field>
              <Field label="Width" htmlFor="bedWidth">
                <NumberInput
                  id="bedWidth"
                  step="0.01"
                  value={draft.dimensions.width}
                  onValueChange={(v) => setBed("width", v)}
                />
              </Field>
              <Field label="Height" htmlFor="bedHeight">
                <NumberInput
                  id="bedHeight"
                  step="0.01"
                  value={draft.dimensions.height}
                  onValueChange={(v) => setBed("height", v)}
                />
              </Field>
            </div>
          </Section>

          <Section title="Remarks" columns={false}>
            <Field
              label="Printed on the slip"
              htmlFor="remarks"
              hint="Goes on the paper above the bank details, so keep it to what the loading point needs"
            >
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
            Balance{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {formatINR(balance)}
            </span>
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {mode === "create" ? "Save slip" : "Save changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
