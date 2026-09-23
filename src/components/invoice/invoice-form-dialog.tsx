"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type FieldPath,
  type UseFormRegisterReturn,
  type UseFormSetValue,
} from "react-hook-form"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { useNextBillNo } from "@/components/invoice/use-invoices"
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
  INVOICE_STATUSES,
  emptyLine,
  freightAmount,
  invoiceTotal,
  type Invoice,
  type LineKind,
} from "@/lib/invoice-types"
import {
  emptyInvoiceInput,
  invoiceInputOf,
  invoiceSchema,
  type InvoiceInput,
} from "@/lib/schemas/invoice"
import { cn } from "@/lib/utils"

type InvoiceField = FieldPath<InvoiceInput>

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
 * A money or weight box: blank rather than a stubborn 0 when empty, and a
 * number rather than a string when read.
 *
 * Controlled through a Controller because the value has to be a number in the
 * form's data — `register` with `valueAsNumber` reports NaN for an empty box,
 * and NaN in a charge column is worse than a zero.
 *
 * `onValueChange` is for the two boxes that do not simply store what they are
 * given: typing a rate or a weight also fills the amount in beside them.
 */
function NumberField({
  label,
  name,
  control,
  error,
  step,
  onValueChange,
}: {
  label: string
  name: InvoiceField
  control: Control<InvoiceInput>
  error?: string
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
          <Field label={label} htmlFor={name} error={error}>
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
 * One row of the charge column.
 *
 * A freight line prices a challan by the tonne and fills its own amount in; a
 * charge line is a lump sum, so the challan, date, rate and weight boxes stay
 * off it entirely — same as the paper. The values behind those boxes are left
 * alone here and blanked by the API on the way in, so a line switched from one
 * kind to the other cannot print a rate against "Detention".
 */
function LineRow({
  index,
  kind,
  control,
  setValue,
  errors,
  onRemove,
  removable,
}: {
  index: number
  kind: LineKind
  control: Control<InvoiceInput>
  setValue: UseFormSetValue<InvoiceInput>
  errors: Partial<Record<string, string>>
  onRemove: () => void
  removable: boolean
}) {
  const freight = kind === "Freight"
  const at = (part: string) => `lines.${index}.${part}` as InvoiceField

  // Rate × weight is what the office quotes, so it fills the amount in as the
  // two are typed. The amount stays editable — bills get rounded off.
  const price = (rate: number, weight: number) =>
    setValue(at("amount"), freightAmount(rate, weight), {
      shouldDirty: true,
      shouldValidate: true,
    })

  const rate = useWatch({ control, name: at("rate") })
  const weight = useWatch({ control, name: at("weight") })

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
            <Controller
              control={control}
              name={at("challanNo")}
              render={({ field }) => (
                <Field label="Challan No." htmlFor={at("challan")}>
                  <Input
                    id={at("challan")}
                    className="tabular-nums"
                    placeholder="L.R. no."
                    value={String(field.value ?? "")}
                    onBlur={field.onBlur}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                </Field>
              )}
            />
            <Controller
              control={control}
              name={at("date")}
              render={({ field }) => (
                <Field label="Date" htmlFor={at("date")}>
                  <DateField
                    id={at("date")}
                    value={String(field.value ?? "")}
                    onValueChange={field.onChange}
                  />
                </Field>
              )}
            />
            <Controller
              control={control}
              name={at("particulars")}
              render={({ field }) => (
                <Field
                  label="Perticulars"
                  htmlFor={at("particulars")}
                  error={errors[`lines.${index}.particulars`]}
                >
                  <Input
                    id={at("particulars")}
                    placeholder="Lorry no."
                    value={String(field.value ?? "")}
                    onBlur={field.onBlur}
                    onChange={(e) =>
                      field.onChange(e.target.value.toUpperCase())
                    }
                  />
                </Field>
              )}
            />
            <NumberField
              label="Rate (₹/ton)"
              name={at("rate")}
              control={control}
              error={errors[`lines.${index}.rate`]}
              onValueChange={(next) => price(next, Number(weight) || 0)}
            />
            <NumberField
              label="Weight (ton)"
              name={at("weight")}
              control={control}
              step="0.01"
              error={errors[`lines.${index}.weight`]}
              onValueChange={(next) => price(Number(rate) || 0, next)}
            />
            <NumberField
              label="Amount (₹)"
              name={at("amount")}
              control={control}
              error={errors[`lines.${index}.amount`]}
            />
          </>
        ) : (
          <>
            <Controller
              control={control}
              name={at("particulars")}
              render={({ field }) => (
                <Field
                  label="Perticulars"
                  htmlFor={at("particulars")}
                  error={errors[`lines.${index}.particulars`]}
                  className="sm:col-span-2"
                >
                  <Input
                    id={at("particulars")}
                    placeholder="Detention, halting, extra labour…"
                    value={String(field.value ?? "")}
                    onBlur={field.onBlur}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                </Field>
              )}
            />
            <NumberField
              label="Amount (₹)"
              name={at("amount")}
              control={control}
              error={errors[`lines.${index}.amount`]}
            />
          </>
        )}
      </div>
    </div>
  )
}

/**
 * A station — one of the office's own routes, anywhere else in India, or
 * somewhere too small to be on any list. Suggests without confining: a bill
 * runs to stations the office never books from, and this box still takes them.
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
  name: InvoiceField
  control: Control<InvoiceInput>
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

/** Today, as the clerk would write it. */
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function InvoiceFormDialog({
  open,
  onOpenChange,
  editing,
  company,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The bill being amended, or null when a new one is being raised. */
  editing: Invoice | null
  /** Whose book is being written in — it owns the origin station. */
  company: Company
  onSave: (input: InvoiceInput) => Promise<void>
}) {
  const creating = editing === null

  // Only asked while a new bill is being raised; an amendment keeps its own
  // number.
  const nextBillNo = useNextBillNo(company.slug, open && creating)

  const blank = React.useCallback(
    (billNo: string) => emptyInvoiceInput(billNo, today(), company.origin),
    [company]
  )

  const form = useForm<InvoiceInput>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: editing ? invoiceInputOf(editing) : blank(""),
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

  const lines = useFieldArray({ control, name: "lines" })

  // Reloads the form whenever the dialog is pointed at a different record —
  // opened on another bill, or switched from amending to raising. Without this
  // the dialog reopens on the last bill's figures.
  const [loaded, setLoaded] = React.useState<Invoice | null>(editing)
  const [wasOpen, setWasOpen] = React.useState(open)
  if (open && (editing !== loaded || !wasOpen)) {
    setLoaded(editing)
    setWasOpen(true)
    reset(editing ? invoiceInputOf(editing) : blank(""))
  }
  if (!open && wasOpen) setWasOpen(false)

  // The number arrives after the dialog has already opened, so it is written in
  // when it lands rather than waited for — the clerk can be typing the party's
  // name while the book is still being asked.
  React.useEffect(() => {
    if (open && creating && nextBillNo.data) {
      setValue("billNo", nextBillNo.data)
    }
  }, [open, creating, nextBillNo.data, setValue])

  // Watched rather than read off `getValues`, because the total below has to
  // move as the amount boxes are typed into.
  const watchedLines = useWatch({ control, name: "lines" })
  const status = useWatch({ control, name: "status" })
  const total = invoiceTotal({ lines: watchedLines ?? [] })

  /**
   * The server's field errors, flattened to the dotted paths the boxes are
   * named with — `lines.0.particulars`, `paidOn`. react-hook-form keeps its
   * own errors as a nested object, and the line rows are handed this instead
   * so a message about line three lands on line three.
   */
  const lineErrors = React.useMemo(() => {
    const flat: Record<string, string> = {}

    // `errors.lines` carries both a per-row array and its own `message` for an
    // error about the list itself, so it is only iterable when it is actually
    // the array half.
    const rows = errors.lines
    if (!Array.isArray(rows)) return flat

    rows.forEach((line, index) => {
      if (!line) return
      for (const [key, entry] of Object.entries(line)) {
        const message = (entry as { message?: string } | undefined)?.message
        if (message) flat[`lines.${index}.${key}`] = message
      }
    })

    return flat
  }, [errors.lines])

  function addLine(kind: LineKind) {
    lines.append(
      kind === "Freight"
        ? { ...emptyLine(kind), date: form.getValues("billDate") }
        : emptyLine(kind)
    )
  }

  const onSubmit = handleSubmit(async (input) => {
    try {
      await onSave(input)
    } catch (cause) {
      if (!(cause instanceof ApiError)) {
        toast.error("Could not save the bill")
        return
      }

      // The server addresses fields the way this form does — `party.name`,
      // `lines.0.rate` — so a rejection lands on the box that caused it.
      if (cause.fieldErrors) {
        for (const [path, messages] of Object.entries(cause.fieldErrors)) {
          if (path === "_form" || !messages[0]) continue
          setError(path as InvoiceField, {
            type: "server",
            message: messages[0],
          })
        }
      }

      // A number taken since the form was opened comes back as a conflict
      // rather than a field error, and it is about one box.
      if (cause.status === 409) {
        setError("billNo", { type: "server", message: cause.message })
      }

      toast.error(cause.message)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[90dvh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {creating ? "New bill" : `Edit bill ${editing.billNo}`}
          </DialogTitle>
          <DialogDescription>
            Fields follow the printed bill book. One bill carries one party and
            one route; each challan on it is a line of the charge column.
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-4 overflow-y-auto px-4">
          <Section title="Bill">
            <TextField
              label="Bill No."
              name="billNo"
              registration={register("billNo")}
              error={errors.billNo?.message}
              inputClassName="tabular-nums"
              hint={
                creating && nextBillNo.isFetching
                  ? "Asking the book for the next number…"
                  : undefined
              }
            />
            <Controller
              control={control}
              name="billDate"
              render={({ field }) => (
                <Field
                  label="Date"
                  htmlFor="billDate"
                  error={errors.billDate?.message}
                >
                  <DateField
                    id="billDate"
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                </Field>
              )}
            />
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Field label="Status" htmlFor="status">
                  <Select
                    items={INVOICE_STATUSES.map((s) => ({
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
                      {INVOICE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
            <Controller
              control={control}
              name="paidOn"
              render={({ field }) => (
                <Field
                  label="Settled on"
                  htmlFor="paidOn"
                  error={errors.paidOn?.message}
                  hint="Only once the party has paid"
                >
                  <DateField
                    id="paidOn"
                    disabled={status !== "Paid"}
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                </Field>
              )}
            />
          </Section>

          <Section title="Party">
            <TextField
              label="M/s"
              name="party.name"
              registration={register("party.name")}
              error={errors.party?.name?.message}
            />
            <TextField
              label="GST No."
              name="party.gstNo"
              registration={register("party.gstNo")}
              error={errors.party?.gstNo?.message}
              placeholder="21AAFCI9440L1ZG"
              inputClassName="uppercase"
            />
            <TextField
              label="Address"
              name="party.address"
              registration={register("party.address")}
              error={errors.party?.address?.message}
              className="sm:col-span-2"
              multiline
            />
          </Section>

          <Section
            title="Route"
            note="Suggested, not confined — bills run to stations the office never books from"
          >
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
              placeholder="Khurdha"
            />
            <TextField
              label="Party's invoice no."
              name="partyInvoiceNo"
              registration={register("partyInvoiceNo")}
              error={errors.partyInvoiceNo?.message}
              inputClassName="tabular-nums"
              hint="The goods invoice, printed under the charge lines"
            />
          </Section>

          <Section title="Charge lines" columns={false}>
            {lines.fields.map((line, index) => (
              <LineRow
                key={line.id}
                index={index}
                kind={line.kind}
                control={control}
                setValue={setValue}
                errors={lineErrors}
                onRemove={() => lines.remove(index)}
                removable={lines.fields.length > 1}
              />
            ))}

            {/* An error about the list itself — none at all, or too many —
                rather than about a box inside one of its rows. */}
            {errors.lines?.message ? (
              <p className="text-xs text-destructive">{errors.lines.message}</p>
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
            <TextField
              label="Office note"
              name="remarks"
              registration={register("remarks")}
              error={errors.remarks?.message}
              multiline
            />
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
            <Button
              variant="outline"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button disabled={isSubmitting} onClick={() => void onSubmit()}>
              {creating ? "Save bill" : "Save changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
