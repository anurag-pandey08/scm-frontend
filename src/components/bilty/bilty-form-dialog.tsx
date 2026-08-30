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

import { useNextLrNo } from "@/components/bilty/use-bilties"
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
import { STATIONS, type Company } from "@/lib/companies"
import { formatINR } from "@/lib/format"
import { biltyInputOf, biltySchema, type BiltyInput } from "@/lib/schemas/bilty"
import {
  BILTY_STATUSES,
  PAYMENT_TYPES,
  RISK_TYPES,
  emptyBilty,
  type Bilty,
} from "@/lib/types"
import { cn } from "@/lib/utils"

type BiltyField = FieldPath<BiltyInput>

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

/**
 * The three wrappers below exist because this form has sixty-odd boxes in it.
 * Written out one at a time — a Field, a Controller, an input, an error read
 * off a nested path — each box is a dozen lines, and the shape of the L.R.
 * disappears under the plumbing. Wrapped, the form below reads as the printed
 * page does: a list of what is on it.
 */

/** A plain text box, uncontrolled — react-hook-form reads it off the DOM. */
function TextField({
  label,
  name,
  registration,
  error,
  hint,
  className,
  inputClassName,
  placeholder,
  maxLength,
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
  maxLength?: number
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
        maxLength={maxLength}
        {...(multiline ? { rows: 2 } : {})}
        {...registration}
      />
    </Field>
  )
}

/**
 * A money or count box: blank rather than a stubborn 0 when empty, and a
 * number rather than a string when read.
 *
 * Controlled through a Controller because the value has to be a number in the
 * form's data — `register` with `valueAsNumber` reports NaN for an empty box,
 * and NaN in a charge column is worse than a zero.
 */
function NumberField({
  label,
  name,
  control,
  error,
  hint,
  step,
  className,
}: {
  label: string
  name: BiltyField
  control: Control<BiltyInput>
  error?: string
  hint?: string
  step?: string
  className?: string
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
                field.onChange(
                  Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
                )
              }}
            />
          </Field>
        )
      }}
    />
  )
}

/** One of a fixed list — a station, a status, a set of freight terms. */
function SelectField({
  label,
  name,
  control,
  options,
  error,
  hint,
  placeholder,
  className,
}: {
  label: string
  name: BiltyField
  control: Control<BiltyInput>
  options: readonly string[]
  error?: string
  hint?: string
  placeholder?: string
  className?: string
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Field
          label={label}
          htmlFor={name}
          error={error}
          hint={hint}
          className={className}
        >
          <Select
            value={typeof field.value === "string" ? field.value : ""}
            // A Select dismissed rather than chosen from reports no value; what
            // was already there stands.
            onValueChange={(value) => value && field.onChange(value)}
          >
            <SelectTrigger id={name} className="w-full">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
    />
  )
}

/**
 * The L.R. as a form — every box on the printed book, in the order it is
 * printed in.
 *
 * Booking and amending are the same form. What differs is only where the
 * opening values come from: an amendment loads the consignment, a new booking
 * loads a blank one and asks the register what number is next. That question
 * is asked as the dialog opens rather than kept ready, because the answer
 * stops being true the moment the next desk books something.
 */
export function BiltyFormDialog({
  open,
  onOpenChange,
  editing,
  company,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The consignment being amended, or null when a new one is being booked. */
  editing: Bilty | null
  /** Whose book is being written in — it owns the booking offices. */
  company: Company
  onSave: (input: BiltyInput) => Promise<void>
}) {
  const creating = editing === null

  // Only asked while a new bilty is being booked; an amendment keeps its own
  // number.
  const nextLrNo = useNextLrNo(company.slug, open && creating)

  const blank = React.useCallback(
    (lrNo: string) =>
      biltyInputOf(
        emptyBilty(lrNo, new Date().toISOString().slice(0, 10), {
          from: company.origin,
          bookingOffice: company.bookingOffices[0] ?? "",
        })
      ),
    [company]
  )

  const form = useForm<BiltyInput>({
    resolver: zodResolver(biltySchema),
    defaultValues: editing ? biltyInputOf(editing) : blank(""),
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
  } = form

  // Reloads the form whenever the dialog is pointed at a different record —
  // opened on another bilty, or switched from amending to booking. Without
  // this the dialog reopens on the last consignment's figures.
  const [loaded, setLoaded] = React.useState<Bilty | null>(editing)
  const [wasOpen, setWasOpen] = React.useState(open)
  if (open && (editing !== loaded || !wasOpen)) {
    setLoaded(editing)
    setWasOpen(true)
    reset(editing ? biltyInputOf(editing) : blank(""))
  }
  if (!open && wasOpen) setWasOpen(false)

  // The number arrives after the dialog has already opened, so it is written in
  // when it lands rather than waited for — the clerk can be typing the party's
  // name while the register is still being asked.
  React.useEffect(() => {
    if (open && creating && nextLrNo.data) {
      setValue("lrNo", nextLrNo.data)
    }
  }, [open, creating, nextLrNo.data, setValue])

  // Watched rather than read off `getValues`, because the totals below have to
  // move as the charge boxes are typed into.
  const charges = useWatch({ control, name: "charges" })
  const gross =
    charges.freight +
    charges.aoc +
    charges.hamali +
    charges.stCharges +
    charges.otherCharges
  const balance = gross - charges.advance

  const onSubmit = handleSubmit(async (input) => {
    try {
      await onSave(input)
    } catch (cause) {
      if (!(cause instanceof ApiError)) {
        toast.error("Could not save the bilty")
        return
      }

      // The server addresses fields the way this form does — `charges.advance`,
      // `consignor.name` — so a rejection lands on the box that caused it.
      if (cause.fieldErrors) {
        for (const [path, messages] of Object.entries(cause.fieldErrors)) {
          if (path === "_form" || !messages[0]) continue
          setError(path as BiltyField, { type: "server", message: messages[0] })
        }
      }

      // A number taken since the form was opened comes back as a conflict
      // rather than a field error, and it is about one box.
      if (cause.status === 409) {
        setError("lrNo", { type: "server", message: cause.message })
      }

      toast.error(cause.message)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[90dvh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {creating ? "New bilty" : `Edit bilty ${editing.lrNo}`}
          </DialogTitle>
          <DialogDescription>
            Fields follow the printed L.R. book. Goods are carried at
            owner&rsquo;s risk unless marked otherwise.
          </DialogDescription>
        </DialogHeader>

        <form
          id="bilty-form"
          onSubmit={(event) => void onSubmit(event)}
          className="-mx-4 overflow-y-auto px-4"
        >
          <Section title="Consignment">
            <TextField
              label="L.R. No."
              name="lrNo"
              registration={register("lrNo")}
              error={errors.lrNo?.message}
              inputClassName="tabular-nums"
              hint={
                creating && nextLrNo.isPending
                  ? "Asking the register for the next number…"
                  : undefined
              }
            />
            <Controller
              control={control}
              name="lrDate"
              render={({ field, fieldState }) => (
                <Field
                  label="Date"
                  htmlFor="lrDate"
                  error={fieldState.error?.message}
                >
                  <DateField
                    id="lrDate"
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                </Field>
              )}
            />
            <TextField
              label="Lorry No."
              name="lorryNo"
              registration={register("lorryNo", {
                setValueAs: (v: string) => v.trim().toUpperCase(),
              })}
              error={errors.lorryNo?.message}
              placeholder="GJ-01-BT-4471"
            />
            <SelectField
              label="Booking office"
              name="bookingOffice"
              control={control}
              options={company.bookingOffices}
              error={errors.bookingOffice?.message}
              placeholder="Select office"
            />
            <SelectField
              label="From"
              name="from"
              control={control}
              options={STATIONS}
              error={errors.from?.message}
              placeholder="Origin"
            />
            <SelectField
              label="To"
              name="to"
              control={control}
              options={STATIONS}
              error={errors.to?.message}
              placeholder="Destination"
            />
          </Section>

          <Section title="Consignor">
            <TextField
              label="M/s"
              name="consignor.name"
              registration={register("consignor.name")}
              error={errors.consignor?.name?.message}
            />
            <TextField
              label="GST No."
              name="consignor.gstNo"
              registration={register("consignor.gstNo", {
                setValueAs: (v: string) => v.trim().toUpperCase(),
              })}
              error={errors.consignor?.gstNo?.message}
              placeholder="24AACCS4471K1ZP"
            />
            <TextField
              label="Address"
              name="consignor.address"
              registration={register("consignor.address")}
              error={errors.consignor?.address?.message}
              className="sm:col-span-2"
              multiline
            />
          </Section>

          <Section title="Consignee">
            <TextField
              label="M/s"
              name="consignee.name"
              registration={register("consignee.name")}
              error={errors.consignee?.name?.message}
            />
            <TextField
              label="GST No."
              name="consignee.gstNo"
              registration={register("consignee.gstNo", {
                setValueAs: (v: string) => v.trim().toUpperCase(),
              })}
              error={errors.consignee?.gstNo?.message}
            />
            <TextField
              label="Address"
              name="consignee.address"
              registration={register("consignee.address")}
              error={errors.consignee?.address?.message}
              className="sm:col-span-2"
              multiline
            />
            <TextField
              label="Delivery at"
              name="deliveryAt"
              registration={register("deliveryAt")}
              error={errors.deliveryAt?.message}
              className="sm:col-span-2"
            />
          </Section>

          <Section
            title="Goods"
            note="Said to contain — declared by the consignor"
          >
            <TextField
              label="Contents"
              name="contents"
              registration={register("contents")}
              error={errors.contents?.message}
              className="sm:col-span-2"
            />
            <NumberField
              label="Packages"
              name="packages"
              control={control}
              error={errors.packages?.message}
            />
            <NumberField
              label="Declared value (₹)"
              name="declaredValue"
              control={control}
              error={errors.declaredValue?.message}
            />
            <NumberField
              label="Actual weight (kg)"
              name="actualWeight"
              control={control}
              error={errors.actualWeight?.message}
            />
            <NumberField
              label="Charged weight (kg)"
              name="chargedWeight"
              control={control}
              error={errors.chargedWeight?.message}
              hint="Whichever is higher — actual or volumetric"
            />
            <NumberField
              label="Rate (₹ per quintal)"
              name="rate"
              control={control}
              error={errors.rate?.message}
            />
            <SelectField
              label="Risk"
              name="risk"
              control={control}
              options={RISK_TYPES}
              error={errors.risk?.message}
            />
            <TextField
              label="Invoice No."
              name="invoiceNo"
              registration={register("invoiceNo")}
              error={errors.invoiceNo?.message}
            />
            <TextField
              label="E-Way Bill No."
              name="eWayBillNo"
              registration={register("eWayBillNo")}
              error={errors.eWayBillNo?.message}
              inputClassName="tabular-nums"
            />
          </Section>

          <Section title="Charges">
            <NumberField
              label="Freight (₹)"
              name="charges.freight"
              control={control}
              error={errors.charges?.freight?.message}
            />
            <NumberField
              label="A.O.C. (₹)"
              name="charges.aoc"
              control={control}
              error={errors.charges?.aoc?.message}
              hint="Any other charges"
            />
            <NumberField
              label="Hamali (₹)"
              name="charges.hamali"
              control={control}
              error={errors.charges?.hamali?.message}
            />
            <NumberField
              label="St. Charges (₹)"
              name="charges.stCharges"
              control={control}
              error={errors.charges?.stCharges?.message}
            />
            <NumberField
              label="Other charges (₹)"
              name="charges.otherCharges"
              control={control}
              error={errors.charges?.otherCharges?.message}
            />
            <NumberField
              label="Advance (₹)"
              name="charges.advance"
              control={control}
              error={errors.charges?.advance?.message}
            />

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
                  <dd className="tabular-nums">{formatINR(charges.advance)}</dd>
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
            <SelectField
              label="Freight terms"
              name="paymentType"
              control={control}
              options={PAYMENT_TYPES}
              error={errors.paymentType?.message}
            />
            <SelectField
              label="Status"
              name="status"
              control={control}
              options={BILTY_STATUSES}
              error={errors.status?.message}
            />
            <TextField
              label="Remarks"
              name="remarks"
              registration={register("remarks")}
              error={errors.remarks?.message}
              className="sm:col-span-2"
              multiline
            />
          </Section>

          <Section
            title="Insurance"
            note="Leave blank if the party has not insured the consignment"
          >
            <TextField
              label="Company"
              name="insurance.company"
              registration={register("insurance.company")}
              error={errors.insurance?.company?.message}
            />
            <TextField
              label="Policy No."
              name="insurance.policyNo"
              registration={register("insurance.policyNo")}
              error={errors.insurance?.policyNo?.message}
            />
            <Controller
              control={control}
              name="insurance.date"
              render={({ field, fieldState }) => (
                <Field
                  label="Policy date"
                  htmlFor="insurance.date"
                  error={fieldState.error?.message}
                >
                  <DateField
                    id="insurance.date"
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                </Field>
              )}
            />
            <NumberField
              label="Insured amount (₹)"
              name="insurance.amount"
              control={control}
              error={errors.insurance?.amount?.message}
            />
          </Section>
        </form>

        <DialogFooter className="sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Gr. Total{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {formatINR(gross)}
            </span>
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            {/* Outside the scrolling area, so it is submitted by `form` rather
                than by being inside the element. */}
            <Button type="submit" form="bilty-form" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving…"
                : creating
                  ? "Save bilty"
                  : "Save changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
