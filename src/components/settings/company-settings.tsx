"use client"

import * as React from "react"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRightIcon, InfoIcon, RotateCcwIcon } from "lucide-react"
import {
  Controller,
  useForm,
  type FieldError,
  type FieldPath,
  type Merge,
} from "react-hook-form"
import { toast } from "sonner"

import {
  useCompanies,
  useCompany,
  useCompanyEditor,
} from "@/components/company-provider"
import { Monogram } from "@/components/company-switcher"
import { Field, ListField } from "@/components/settings/letterhead-fields"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ApiError } from "@/lib/api/client"
import { STATIONS } from "@/lib/companies"
import {
  letterheadOf,
  letterheadSchema,
  type LetterheadInput,
} from "@/lib/schemas/company"

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {children}
      </CardContent>
    </Card>
  )
}

/**
 * The firm's own details — everything the app prints across the top and along
 * the foot of an L.R., a bill and a loading slip, and nothing that belongs to a
 * consignment.
 *
 * The screen edits whichever firm the URL names, the same as every other screen
 * under `[company]`. The other firm keeps its own letterhead and is reached by
 * switching books; nothing here is shared between the two.
 *
 * Validation runs twice, in two places, and that is not a duplication to tidy
 * away: `letterheadSchema` checks the form as it is typed so the office is told
 * about a malformed IFSC without a round trip, and the API checks the same
 * rules again because a browser is not a place to enforce anything. When the
 * server rejects something the form let through, its field errors are put back
 * onto the inputs that caused them — see `applyServerErrors`.
 */
export function CompanySettings() {
  const company = useCompany()
  const companies = useCompanies()
  const { save, restore } = useCompanyEditor()

  const [confirmRestore, setConfirmRestore] = React.useState(false)

  const form = useForm<LetterheadInput>({
    resolver: zodResolver(letterheadSchema),
    defaultValues: letterheadOf(company),
    // Quiet until a field has been left once, then live — so a box is not
    // marked wrong while it is still being typed into for the first time.
    mode: "onTouched",
  })

  const {
    control,
    formState: { errors, isDirty, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError,
  } = form

  // The letterhead in the cache is the one that counts. It changes on a save,
  // on a restore, and when a refetch brings in an edit made at another desk —
  // and in every one of those cases the form is holding a draft of details
  // nobody is using any more, so it reloads.
  const [loaded, setLoaded] = React.useState(company)
  if (company !== loaded) {
    setLoaded(company)
    reset(letterheadOf(company))
  }

  const other = companies.find((firm) => firm.slug !== company.slug)
  const busy = isSubmitting || save.isPending || restore.isPending

  /**
   * Puts the API's field errors back on the inputs.
   *
   * The server addresses fields the way react-hook-form does — `emails.lr`,
   * `phones.1` — so a rejection lands on the input that caused it rather than
   * in a toast the office has to map back to a box themselves. Anything not
   * addressed to a field is left to the returned message.
   */
  function applyServerErrors(error: unknown): string {
    const fallback = "Could not save the letterhead"
    if (!(error instanceof ApiError)) return fallback

    if (error.fieldErrors) {
      for (const [path, messages] of Object.entries(error.fieldErrors)) {
        if (path === "_form" || !messages[0]) continue
        setError(path as FieldPath<LetterheadInput>, {
          type: "server",
          message: messages[0],
        })
      }
    }

    return error.message || fallback
  }

  const onSubmit = handleSubmit(async (letterhead) => {
    try {
      const saved = await save.mutateAsync(letterhead)
      toast.success(`Letterhead saved for ${saved.name}`)
    } catch (error) {
      toast.error(applyServerErrors(error))
    }
  })

  async function handleRestore() {
    setConfirmRestore(false)
    try {
      await restore.mutateAsync()
      toast.success("Back to the printed letterhead")
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Could not restore the printed letterhead"
      )
    }
  }

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className="mx-auto flex w-full max-w-4xl flex-col gap-5"
    >
      <header className="flex items-center gap-3">
        <Monogram company={company} />
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">
            Company Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            {company.name} — the letterhead every L.R., bill and loading slip is
            printed on
          </p>
        </div>
      </header>

      <p className="flex gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
        <InfoIcon className="mt-px size-3.5 shrink-0" />
        <span>
          Saved for the whole office — the desk next door prints on this
          letterhead too, from the moment it is saved. Everything here goes
          straight onto the printed documents, so it is worth reading off the
          book rather than from memory.
        </span>
      </p>

      <Section
        title="Firm"
        description="How the app names this book and tells it apart from the other one."
      >
        <Field label="Name" htmlFor="name" error={errors.name?.message}>
          <Input id="name" {...register("name")} />
        </Field>
        <Field
          label="Monogram"
          htmlFor="monogram"
          error={errors.monogram?.message}
          hint="The tile in the sidebar and the roundel on the printed L.R."
        >
          <Input
            id="monogram"
            className="uppercase"
            maxLength={4}
            {...register("monogram", {
              setValueAs: (value: string) => value.trim().toUpperCase(),
            })}
          />
        </Field>
        <Field
          label="Tagline"
          htmlFor="tagline"
          error={errors.tagline?.message}
          hint="Under the name in the app, beside the switcher"
          className="sm:col-span-2"
        >
          <Input id="tagline" {...register("tagline")} />
        </Field>
      </Section>

      <Section
        title="Letterhead"
        description="Printed across the top of every document that leaves the office."
      >
        <Field
          label="Address"
          htmlFor="address"
          error={errors.address?.message}
          hint="One line, exactly as the book prints it"
          className="sm:col-span-2"
        >
          <Textarea id="address" rows={2} {...register("address")} />
        </Field>
        <Field
          label="Booking office line"
          htmlFor="officeLine"
          error={errors.officeLine?.message}
          hint="The short form, for the sidebar and the switcher"
        >
          <Input id="officeLine" {...register("officeLine")} />
        </Field>
        <Field
          label="Jurisdiction"
          htmlFor="jurisdiction"
          error={errors.jurisdiction?.message}
          hint="Printed in the corner of the L.R. and under the bill"
        >
          <Input id="jurisdiction" {...register("jurisdiction")} />
        </Field>
        <Field
          label="Tagline on the L.R."
          htmlFor="lrTagline"
          error={errors.lrTagline?.message}
          hint="The lorry receipt and the loading slip"
        >
          <Input id="lrTagline" {...register("lrTagline")} />
        </Field>
        <Field
          label="Tagline on the bill"
          htmlFor="billTagline"
          error={errors.billTagline?.message}
          hint="The two books word it differently — that is not a mistake"
        >
          <Input id="billTagline" {...register("billTagline")} />
        </Field>
      </Section>

      <Section
        title="Contact"
        description="The numbers along the top of the L.R., and the address each book is answered on."
      >
        <Controller
          control={control}
          name="phones"
          render={({ field, fieldState }) => (
            <ListField
              label="Phone numbers"
              id="phone"
              itemLabel="Phone number"
              addLabel="Add number"
              placeholder="9376150604"
              inputClassName="tabular-nums"
              hint="Printed in order, one per line"
              values={field.value}
              onValuesChange={field.onChange}
              error={listError(fieldState.error)}
              itemErrors={rowErrors(errors.phones)}
            />
          )}
        />
        <div className="grid content-start gap-4">
          <Field
            label="E-mail on the L.R."
            htmlFor="emailLr"
            error={errors.emails?.lr?.message}
          >
            <Input id="emailLr" type="email" {...register("emails.lr")} />
          </Field>
          <Field
            label="E-mail on the bill"
            htmlFor="emailBill"
            error={errors.emails?.bill?.message}
            hint="The bill book was printed separately and may carry the other address"
          >
            <Input id="emailBill" type="email" {...register("emails.bill")} />
          </Field>
        </div>
      </Section>

      <Section
        title="Bank and PAN"
        description="The standing terms at the foot of the L.R., the slip and the bill."
      >
        <Field
          label="PAN"
          htmlFor="pan"
          error={errors.pan?.message}
          hint="Ten characters, as issued"
        >
          <Input
            id="pan"
            className="uppercase tabular-nums"
            maxLength={10}
            {...register("pan", {
              setValueAs: (value: string) => value.trim().toUpperCase(),
            })}
          />
        </Field>
        <Field
          label="Bank"
          htmlFor="bankName"
          error={errors.bank?.name?.message}
        >
          <Input id="bankName" {...register("bank.name")} />
        </Field>
        <Field
          label="Branch"
          htmlFor="bankBranch"
          error={errors.bank?.branch?.message}
        >
          <Input id="bankBranch" {...register("bank.branch")} />
        </Field>
        <Field
          label="A/C No."
          htmlFor="accountNo"
          error={errors.bank?.accountNo?.message}
        >
          <Input
            id="accountNo"
            inputMode="numeric"
            className="tabular-nums"
            {...register("bank.accountNo")}
          />
        </Field>
        <Field label="IFSC" htmlFor="ifsc" error={errors.bank?.ifsc?.message}>
          <Input
            id="ifsc"
            className="uppercase tabular-nums"
            maxLength={11}
            {...register("bank.ifsc", {
              setValueAs: (value: string) => value.trim().toUpperCase(),
            })}
          />
        </Field>
      </Section>

      <Section
        title="Booking"
        description="What a fresh bilty or slip starts out with before the clerk touches it."
      >
        {/* Through a Controller rather than `watch("origin")`: watch returns a
            fresh function on every render, which stops the React Compiler
            memoising this whole screen. A Controller subscribes to the one
            field instead. */}
        <Controller
          control={control}
          name="origin"
          render={({ field, fieldState }) => (
            <Field
              label="Station booked from"
              htmlFor="origin"
              error={fieldState.error?.message}
              hint="Fills the From box on a new L.R. and slip"
            >
              <Select
                value={field.value}
                // A Select that has been dismissed rather than chosen from
                // reports no value; the station it already had stands.
                onValueChange={(value) => value && field.onChange(value)}
              >
                <SelectTrigger id="origin" className="w-full">
                  <SelectValue />
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
          )}
        />
        <Controller
          control={control}
          name="bookingOffices"
          render={({ field, fieldState }) => (
            <ListField
              label="Booking offices"
              id="bookingOffice"
              itemLabel="Booking office"
              addLabel="Add office"
              placeholder="Odhav, Ahmedabad"
              hint="The first is where a new bilty is booked"
              values={field.value}
              onValuesChange={field.onChange}
              error={listError(fieldState.error)}
              itemErrors={rowErrors(errors.bookingOffices)}
            />
          )}
        />
      </Section>

      {other ? (
        <Card size="sm">
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Monogram company={other} className="size-7 text-[0.7rem]" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{other.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  Keeps its own letterhead, edited in its own book
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              render={<Link href={`/${other.slug}/settings`} />}
            >
              Open its settings
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* The form is long enough to scroll past its own header, so the actions
          follow it down. Always in the bar, and flat until there is something
          to save — buttons that come and go shove the ones beside them. */}
      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t bg-background/85 px-4 py-3 backdrop-blur lg:-mx-6 lg:px-6">
        <p className="text-xs text-muted-foreground">
          {isDirty
            ? "Unsaved changes"
            : company.isEdited
              ? "Saved for the office"
              : "Running on the printed letterhead"}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={!company.isEdited || busy}
            onClick={() => setConfirmRestore(true)}
          >
            <RotateCcwIcon data-icon="inline-start" />
            Restore printed letterhead
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!isDirty || busy}
            onClick={() => reset(letterheadOf(company))}
          >
            Discard
          </Button>
          <Button type="submit" disabled={!isDirty || busy}>
            {save.isPending ? "Saving…" : "Save letterhead"}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmRestore} onOpenChange={setConfirmRestore}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Restore the printed letterhead for {company.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Every edit the office has saved is dropped and the firm goes back
              to the details transcribed from its own book — for every desk, not
              just this one. Documents already printed are unaffected; ones
              printed from here on carry the restored letterhead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep the edits</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void handleRestore()}
            >
              Restore letterhead
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}

/**
 * How react-hook-form reports an array field.
 *
 * When only the list is wrong it is a plain `FieldError`. When the rows are
 * wrong it becomes that error *merged with* an array of per-row errors — one
 * value that is both an object and a list, which is why the two readers below
 * take the same type and pull different things out of it.
 */
type ArrayFieldError =
  FieldError | Merge<FieldError, (FieldError | undefined)[]> | undefined

/**
 * The message about a list itself rather than about one of its rows — that it
 * is empty, or longer than the letterhead has room for.
 *
 * Filed against the array, then moved to `root` once a row has an error of its
 * own, so both places are looked at.
 */
function listError(error: ArrayFieldError): string | undefined {
  return error?.root?.message ?? error?.message
}

/**
 * The message on each row, by position, for the rows that have one.
 *
 * The cast is the merged type above being unpicked: TypeScript will not narrow
 * an object-and-array intersection through `Array.isArray`, but the check has
 * still done its job — past it, this is the per-row array.
 */
function rowErrors(
  errors: ArrayFieldError
): (string | undefined)[] | undefined {
  if (!Array.isArray(errors)) return undefined

  return (errors as (FieldError | undefined)[]).map((error) => error?.message)
}
