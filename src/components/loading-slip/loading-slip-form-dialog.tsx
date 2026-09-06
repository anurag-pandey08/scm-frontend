"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Controller,
  useForm,
  useWatch,
  type Control,
  type FieldPath,
  type UseFormRegisterReturn,
} from "react-hook-form"
import { toast } from "sonner"

import { useNextSlipNo } from "@/components/loading-slip/use-loading-slips"
import { DateField } from "@/components/date-field"
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
import { ApiError } from "@/lib/api/client"
import type { Company } from "@/lib/companies"
import { formatINR } from "@/lib/format"
import {
  LOADING_SLIP_STATUSES,
  slipBalance,
  type LoadingSlip,
} from "@/lib/loading-slip-types"
import {
  emptyLoadingSlipInput,
  loadingSlipInputOf,
  loadingSlipSchema,
  type LoadingSlipInput,
} from "@/lib/schemas/loading-slip"
import { cn } from "@/lib/utils"

type SlipField = FieldPath<LoadingSlipInput>

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

function TextField({
  label,
  name,
  registration,
  error,
  hint,
  className,
  inputClassName,
  placeholder,
  multiline,
}: {
  label: string
  name: string
  registration: UseFormRegisterReturn
  error?: string
  hint?: string
  className?: string
  inputClassName?: string
  placeholder?: string
  multiline?: boolean
}) {
  const Control = multiline ? Textarea : Input

  return (
    <Field
      label={label}
      htmlFor={name}
      error={error}
      hint={hint}
      className={className}
    >
      <Control
        id={name}
        className={inputClassName}
        placeholder={placeholder}
        {...(multiline ? { rows: 2 } : {})}
        {...registration}
      />
    </Field>
  )
}

/**
 * A money, weight or feet box: blank rather than a stubborn 0 when empty, and
 * a number rather than a string when read.
 *
 * Controlled through a Controller because the value has to be a number in the
 * form's data — `register` with `valueAsNumber` reports NaN for an empty box,
 * and NaN in a hire figure is worse than a zero.
 *
 * `onValueChange` is for the two boxes that do not simply store what they are
 * given: typing a rate or a weight also prices the hire beside them.
 */
function NumberField({
  label,
  name,
  control,
  error,
  hint,
  step,
  className,
  onValueChange,
}: {
  label: string
  name: SlipField
  control: Control<LoadingSlipInput>
  error?: string
  hint?: string
  step?: string
  className?: string
  onValueChange?: (value: number) => void
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const value = typeof field.value === "number" ? field.value : 0

        return (
          <Field
            label={label}
            htmlFor={name}
            error={error}
            hint={hint}
            className={className}
          >
            <Input
              id={name}
              type="number"
              inputMode="decimal"
              min={0}
              step={step}
              placeholder="0"
              className="tabular-nums"
              value={value === 0 ? "" : String(value)}
              onBlur={field.onBlur}
              onChange={(event) => {
                const parsed = Number(event.target.value)
                const next = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
                field.onChange(next)
                onValueChange?.(next)
              }}
            />
          </Field>
        )
      }}
    />
  )
}

/** Today, as the clerk would write it. */
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function LoadingSlipFormDialog({
  open,
  onOpenChange,
  editing,
  company,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The slip being amended, or null when a new one is being written. */
  editing: LoadingSlip | null
  /** Whose book is being written in — it owns the origin station. */
  company: Company
  onSave: (input: LoadingSlipInput) => Promise<void>
}) {
  const creating = editing === null

  // Only asked while a new slip is being written; an amendment keeps its own
  // number.
  const nextSlipNo = useNextSlipNo(company.slug, open && creating)

  const blank = React.useCallback(
    (slipNo: string) => emptyLoadingSlipInput(slipNo, today(), company.origin),
    [company]
  )

  const form = useForm<LoadingSlipInput>({
    resolver: zodResolver(loadingSlipSchema),
    defaultValues: editing ? loadingSlipInputOf(editing) : blank(""),
    mode: "onTouched",
  })

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError,
    setValue,
    getValues,
  } = form

  // Reloads the form whenever the dialog is pointed at a different record —
  // opened on another slip, or switched from amending to writing. Without this
  // the dialog reopens on the last slip's figures.
  const [loaded, setLoaded] = React.useState<LoadingSlip | null>(editing)
  const [wasOpen, setWasOpen] = React.useState(open)
  if (open && (editing !== loaded || !wasOpen)) {
    setLoaded(editing)
    setWasOpen(true)
    reset(editing ? loadingSlipInputOf(editing) : blank(""))
  }
  if (!open && wasOpen) setWasOpen(false)

  // The number arrives after the dialog has already opened, so it is written in
  // when it lands rather than waited for — the clerk can be typing the lorry
  // number while the book is still being asked.
  React.useEffect(() => {
    if (open && creating && nextSlipNo.data) {
      setValue("slipNo", nextSlipNo.data)
    }
  }, [open, creating, nextSlipNo.data, setValue])

  // Watched rather than read off `getValues`, because the balance below has to
  // move as the three money boxes are typed into.
  const totalFreight = useWatch({ control, name: "totalFreight" })
  const advance = useWatch({ control, name: "advance" })
  const detention = useWatch({ control, name: "detention" })
  const balance = slipBalance({
    totalFreight: totalFreight || 0,
    advance: advance || 0,
    detention: detention || 0,
  })

  /**
   * Rate × weight is what the office quotes, so it prices the hire as the two
   * are typed. The figure stays editable — lorries also go on a lump sum, and
   * then the rate box is left at zero exactly as on the paper, which is why a
   * zero on either side leaves the hire alone rather than wiping it.
   */
  function price(rate: number, weight: number) {
    if (!rate || !weight) return

    setValue("totalFreight", Math.round(rate * weight), {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  const onSubmit = handleSubmit(async (input) => {
    try {
      await onSave(input)
    } catch (cause) {
      if (!(cause instanceof ApiError)) {
        toast.error("Could not save the slip")
        return
      }

      // The server addresses fields the way this form does — `advance`,
      // `dimensions.length` — so a rejection lands on the box that caused it.
      if (cause.fieldErrors) {
        for (const [path, messages] of Object.entries(cause.fieldErrors)) {
          if (path === "_form" || !messages[0]) continue
          setError(path as SlipField, { type: "server", message: messages[0] })
        }
      }

      // A number taken since the form was opened comes back as a conflict
      // rather than a field error, and it is about one box.
      if (cause.status === 409) {
        setError("slipNo", { type: "server", message: cause.message })
      }

      toast.error(cause.message)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[90dvh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {creating ? "New loading slip" : `Edit slip ${editing.slipNo}`}
          </DialogTitle>
          <DialogDescription>
            Fields follow the printed slip book. One slip is one lorry placed
            against one order — no goods are booked here, and nobody is charged.
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-4 overflow-y-auto px-4">
          <Section title="Slip">
            <TextField
              label="No."
              name="slipNo"
              registration={register("slipNo")}
              error={errors.slipNo?.message}
              inputClassName="tabular-nums"
              hint={
                creating && nextSlipNo.isFetching
                  ? "Asking the book for the next number…"
                  : undefined
              }
            />
            <Controller
              control={control}
              name="slipDate"
              render={({ field }) => (
                <Field
                  label="Date"
                  htmlFor="slipDate"
                  error={errors.slipDate?.message}
                >
                  <DateField
                    id="slipDate"
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                </Field>
              )}
            />
            <TextField
              label="To M/s."
              name="party"
              registration={register("party")}
              error={errors.party?.message}
              hint="The party or transport firm whose order the lorry is against"
            />
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Field label="Status" htmlFor="status">
                  <Select
                    items={LOADING_SLIP_STATUSES.map((s) => ({
                      value: s,
                      label: s,
                    }))}
                    value={field.value}
                    onValueChange={(value) => value && field.onChange(value)}
                  >
                    <SelectTrigger id="status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOADING_SLIP_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          </Section>

          <Section title="Lorry and route">
            <TextField
              label="Vehicle no."
              name="vehicleNo"
              registration={register("vehicleNo")}
              error={errors.vehicleNo?.message}
              placeholder="GJ-01-BT-4471"
              inputClassName="uppercase"
            />
            <TextField
              label="From"
              name="from"
              registration={register("from")}
              error={errors.from?.message}
            />
            <TextField
              label="To"
              name="to"
              registration={register("to")}
              error={errors.to?.message}
              placeholder="Hathras"
              hint="Typed, not picked — a lorry is placed wherever the order sends it"
            />
          </Section>

          <Section title="Hire">
            <NumberField
              label="Rate (₹/ton)"
              name="rate"
              control={control}
              error={errors.rate?.message}
              hint="Leave at zero on a lump-sum trip"
              onValueChange={(next) => price(next, getValues("weight"))}
            />
            <NumberField
              label="Weight (ton)"
              name="weight"
              control={control}
              step="0.01"
              error={errors.weight?.message}
              onValueChange={(next) => price(getValues("rate"), next)}
            />
            <NumberField
              label="Total freight (₹)"
              name="totalFreight"
              control={control}
              error={errors.totalFreight?.message}
            />
            <NumberField
              label="Advance (₹)"
              name="advance"
              control={control}
              error={errors.advance?.message}
              hint="Handed to the driver at the loading point"
            />
            <NumberField
              label="Loading point detention (₹)"
              name="detention"
              control={control}
              error={errors.detention?.message}
              hint="Allowed on top of the hire"
            />

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
              <NumberField
                label="Length"
                name="dimensions.length"
                control={control}
                step="0.01"
                error={errors.dimensions?.length?.message}
              />
              <NumberField
                label="Width"
                name="dimensions.width"
                control={control}
                step="0.01"
                error={errors.dimensions?.width?.message}
              />
              <NumberField
                label="Height"
                name="dimensions.height"
                control={control}
                step="0.01"
                error={errors.dimensions?.height?.message}
              />
            </div>
          </Section>

          <Section title="Remarks" columns={false}>
            <TextField
              label="Printed on the slip"
              name="remarks"
              registration={register("remarks")}
              error={errors.remarks?.message}
              hint="Goes on the paper above the bank details, so keep it to what the loading point needs"
              multiline
            />
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
            <Button
              variant="outline"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button disabled={isSubmitting} onClick={() => void onSubmit()}>
              {creating ? "Save slip" : "Save changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
