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

import { DateField } from "@/components/date-field"
import { StationField } from "@/components/station-field"
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
import { ApiError } from "@/lib/api/client"
import { formatINR } from "@/lib/format"
import {
  emptyTripInput,
  tripInputOf,
  tripSchema,
  type TripInput,
} from "@/lib/schemas/trip"
import {
  REGISTER_ORIGIN,
  tripFreight,
  tripReceived,
  type Trip,
} from "@/lib/trip-register-types"
import { cn } from "@/lib/utils"

type TripField = FieldPath<TripInput>

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
 * A money or measure box: blank rather than a stubborn 0 when empty, and a
 * number rather than a string when read.
 *
 * Controlled through a Controller because the value has to be a number in the
 * form's data — `register` with `valueAsNumber` reports NaN for an empty box,
 * and NaN in a money ledger is worse than a zero.
 *
 * `onValueChange` is for the three boxes that do not simply store what they
 * are given: rate, weight and advance also re-price the row around them.
 */
function NumberField({
  label,
  name,
  control,
  error,
  hint,
  step,
  onValueChange,
}: {
  label: string
  name: TripField
  control: Control<TripInput>
  error?: string
  hint?: string
  step?: string
  onValueChange?: (value: number) => void
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const value = typeof field.value === "number" ? field.value : 0

        return (
          <Field label={label} htmlFor={name} error={error} hint={hint}>
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

/**
 * A station — one of the office's own routes, anywhere else in India, or
 * somewhere too small to be on any list. Suggests without confining: a lorry
 * is placed wherever the order sends it, and this box still takes that.
 */
function StationBox({
  label,
  name,
  control,
  error,
  hint,
  placeholder,
}: {
  label: string
  name: TripField
  control: Control<TripInput>
  error?: string
  hint?: string
  placeholder?: string
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Field label={label} htmlFor={name} error={error} hint={hint}>
          <StationField
            id={name}
            value={typeof field.value === "string" ? field.value : ""}
            onValueChange={field.onChange}
            onBlur={field.onBlur}
            placeholder={placeholder}
            maxLength={120}
            aria-invalid={Boolean(error)}
          />
        </Field>
      )}
    />
  )
}

/** A ledger date box — every one of them but the trip's own may be left empty. */
function DateFieldControl({
  label,
  name,
  control,
  error,
  hint,
}: {
  label: string
  name: TripField
  control: Control<TripInput>
  error?: string
  hint?: string
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Field label={label} htmlFor={name} error={error} hint={hint}>
          <DateField
            id={name}
            value={String(field.value ?? "")}
            onValueChange={field.onChange}
          />
        </Field>
      )}
    />
  )
}

/** Today, as the clerk would write it. */
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function TripFormDialog({
  open,
  onOpenChange,
  editing,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The row being amended, or null when a new one is being entered. */
  editing: Trip | null
  onSave: (input: TripInput) => Promise<void>
}) {
  const creating = editing === null

  const form = useForm<TripInput>({
    resolver: zodResolver(tripSchema),
    defaultValues: editing
      ? tripInputOf(editing)
      : emptyTripInput(today(), REGISTER_ORIGIN),
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
  // opened on another trip, or switched from amending to entering. Without
  // this the dialog reopens on the last row's figures.
  const [loaded, setLoaded] = React.useState<Trip | null>(editing)
  const [wasOpen, setWasOpen] = React.useState(open)
  if (open && (editing !== loaded || !wasOpen)) {
    setLoaded(editing)
    setWasOpen(true)
    reset(
      editing ? tripInputOf(editing) : emptyTripInput(today(), REGISTER_ORIGIN)
    )
  }
  if (!open && wasOpen) setWasOpen(false)

  // Watched rather than read off `getValues`, because the three summaries
  // below have to move as the money boxes are typed into.
  const rate = useWatch({ control, name: "rate" })
  const weight = useWatch({ control, name: "weight" })
  const partyPayment = useWatch({ control, name: "partyPayment" })
  const advanceReceiveRs = useWatch({ control, name: "advanceReceiveRs" })
  const balanceReceiveRs = useWatch({ control, name: "balanceReceiveRs" })

  const freight = tripFreight({ rate: rate || 0, weight: weight || 0 })
  const received = tripReceived({
    advanceReceiveRs: advanceReceiveRs || 0,
    balanceReceiveRs: balanceReceiveRs || 0,
  })
  const due = (partyPayment || 0) - received

  /**
   * Rate × weight is the hire the two lorry columns are drawn against, so the
   * balance follows the advance as they are typed, and the party's bill starts
   * at the same figure.
   *
   * Both stay editable afterwards — hires get rounded off, and a trip can be
   * settled at a figure nobody quoted — which is why a hire of zero leaves
   * them alone rather than wiping them back to nothing.
   */
  function price(
    next: Partial<Pick<TripInput, "rate" | "weight" | "advance">>
  ) {
    const values = { ...getValues(), ...next }
    const hire = tripFreight(values)
    if (!hire) return

    const write = { shouldDirty: true, shouldValidate: true } as const
    setValue("balance", Math.max(0, hire - values.advance), write)
    setValue("partyPayment", hire, write)
  }

  const onSubmit = handleSubmit(async (input) => {
    try {
      await onSave(input)
    } catch (cause) {
      if (!(cause instanceof ApiError)) {
        toast.error("Could not save the trip")
        return
      }

      // The server addresses fields the way this form does — `advance`,
      // `partyPayment` — so a rejection lands on the box that caused it.
      if (cause.fieldErrors) {
        for (const [path, messages] of Object.entries(cause.fieldErrors)) {
          if (path === "_form" || !messages[0]) continue
          setError(path as TripField, { type: "server", message: messages[0] })
        }
      }

      toast.error(cause.message)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[90dvh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {creating ? "New trip" : `Edit trip — ${editing.truckNo}`}
          </DialogTitle>
          <DialogDescription>
            Fields follow the ledger, left to right: the trip, what the lorry is
            owed, then what the party has paid back against it.
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-4 overflow-y-auto px-4">
          <Section title="Trip">
            <DateFieldControl
              label="Date"
              name="date"
              control={control}
              error={errors.date?.message}
            />
            <TextField
              label="Truck No."
              name="truckNo"
              registration={register("truckNo")}
              error={errors.truckNo?.message}
              inputClassName="uppercase"
              placeholder="GJ-01-BT-4471"
            />
            <TextField
              label="L.R. No."
              name="lrNo"
              registration={register("lrNo")}
              error={errors.lrNo?.message}
              inputClassName="tabular-nums"
              hint="Where one was raised"
            />
            <TextField
              label="Party Name"
              name="partyName"
              registration={register("partyName")}
              error={errors.partyName?.message}
            />
            <TextField
              label="Broker Name"
              name="brokerName"
              registration={register("brokerName")}
              error={errors.brokerName?.message}
              hint="Blank where the office placed the lorry itself"
            />
            <TextField
              label="Goods"
              name="goods"
              registration={register("goods")}
              error={errors.goods?.message}
            />
            <StationBox
              label="From"
              name="from"
              control={control}
              error={errors.from?.message}
            />
            <StationBox
              label="To"
              name="to"
              control={control}
              error={errors.to?.message}
            />
          </Section>

          <Section title="Freight">
            <NumberField
              label="Rate (₹/ton)"
              name="rate"
              control={control}
              error={errors.rate?.message}
              onValueChange={(next) => price({ rate: next })}
            />
            <NumberField
              label="Weight (ton)"
              name="weight"
              control={control}
              step="0.01"
              error={errors.weight?.message}
              onValueChange={(next) => price({ weight: next })}
            />
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
            <NumberField
              label="Advance"
              name="advance"
              control={control}
              error={errors.advance?.message}
              onValueChange={(next) => price({ advance: next })}
            />
            <NumberField
              label="Balance"
              name="balance"
              control={control}
              error={errors.balance?.message}
            />
            <NumberField
              label="To Pay"
              name="toPay"
              control={control}
              error={errors.toPay?.message}
              hint="Collected at the delivery end instead"
            />
            <DateFieldControl
              label="Receive Date"
              name="receiveDate"
              control={control}
              error={errors.receiveDate?.message}
              hint="The day the driver took the advance"
            />
            <DateFieldControl
              label="Paid Date"
              name="paidDate"
              control={control}
              error={errors.paidDate?.message}
              hint="Blank until the balance is settled"
            />
            <NumberField
              label="Commission"
              name="commission"
              control={control}
              error={errors.commission?.message}
            />
          </Section>

          <Section title="Party payment">
            <NumberField
              label="Party Payment"
              name="partyPayment"
              control={control}
              error={errors.partyPayment?.message}
            />
            <NumberField
              label="Advance Receive Rs."
              name="advanceReceiveRs"
              control={control}
              error={errors.advanceReceiveRs?.message}
            />
            <DateFieldControl
              label="Advance Date"
              name="advanceDate"
              control={control}
              error={errors.advanceDate?.message}
            />
            <NumberField
              label="Balance Receive Rs."
              name="balanceReceiveRs"
              control={control}
              error={errors.balanceReceiveRs?.message}
            />
            <DateFieldControl
              label="Balance Date"
              name="balanceDate"
              control={control}
              error={errors.balanceDate?.message}
            />
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
            <TextField
              label="Ledger note"
              name="remarks"
              registration={register("remarks")}
              error={errors.remarks?.message}
              multiline
            />
          </Section>
        </div>

        <DialogFooter className="sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Hire{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {formatINR(freight)}
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
              {creating ? "Save trip" : "Save changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
