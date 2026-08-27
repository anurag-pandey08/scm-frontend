"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRightIcon, InfoIcon, RotateCcwIcon } from "lucide-react"
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
import { STATIONS, type Bank } from "@/lib/companies"
import {
  detailsOf,
  sameDetails,
  type CompanyDetails,
} from "@/lib/company-settings"

type Errors = Partial<Record<string, string>>

/** AQAPP2502L — five letters, four figures, one letter. */
const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/
/** ICIC0007205 — four letters, a nought, then six of either. */
const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
 */
export function CompanySettings() {
  const company = useCompany()
  const companies = useCompanies()
  const { isEdited, save, restore } = useCompanyEditor()

  const current = React.useMemo(() => detailsOf(company), [company])

  const [draft, setDraft] = React.useState<CompanyDetails>(current)
  const [errors, setErrors] = React.useState<Errors>({})
  const [loaded, setLoaded] = React.useState(company)
  const [confirmRestore, setConfirmRestore] = React.useState(false)

  // The firm is a fresh object whenever the saved letterhead changes — on the
  // first read out of the browser, and after every save. A changed identity
  // means "these are the details now", so the form reloads rather than sitting
  // on a draft of details nobody is using any more.
  if (company !== loaded) {
    setLoaded(company)
    setDraft(detailsOf(company))
    setErrors({})
  }

  const other = companies.find((firm) => firm.slug !== company.slug)
  const dirty = !sameDetails(draft, current)
  const edited = isEdited(company.slug)

  const set = <K extends keyof CompanyDetails>(
    key: K,
    value: CompanyDetails[K]
  ) => setDraft((d) => ({ ...d, [key]: value }))

  const setBank = (key: keyof Bank, value: string) =>
    setDraft((d) => ({ ...d, bank: { ...d.bank, [key]: value } }))

  const setEmail = (key: "lr" | "bill", value: string) =>
    setDraft((d) => ({ ...d, emails: { ...d.emails, [key]: value } }))

  function handleSave() {
    // Trimmed first and blank rows dropped, so what is checked is what gets
    // stored — and what gets stored is what goes on the paper.
    const filled = (values: string[]) =>
      values.map((value) => value.trim()).filter(Boolean)

    const next: CompanyDetails = {
      name: draft.name.trim(),
      monogram: draft.monogram.trim().toUpperCase(),
      tagline: draft.tagline.trim(),
      lrTagline: draft.lrTagline.trim(),
      billTagline: draft.billTagline.trim(),
      address: draft.address.trim(),
      officeLine: draft.officeLine.trim(),
      emails: {
        lr: draft.emails.lr.trim(),
        bill: draft.emails.bill.trim(),
      },
      phones: filled(draft.phones),
      pan: draft.pan.trim().toUpperCase(),
      jurisdiction: draft.jurisdiction.trim(),
      bank: {
        name: draft.bank.name.trim(),
        branch: draft.bank.branch.trim(),
        accountNo: draft.bank.accountNo.trim(),
        ifsc: draft.bank.ifsc.trim().toUpperCase(),
      },
      origin: draft.origin,
      bookingOffices: filled(draft.bookingOffices),
    }

    const found: Errors = {}
    if (!next.name) found.name = "The name across the top of the letterhead"
    if (!next.monogram) found.monogram = "Required"
    else if (next.monogram.length > 4) found.monogram = "Four letters at most"
    if (!next.address)
      found.address = "Printed under the name on every document"
    if (!next.officeLine) found.officeLine = "Required"
    if (!next.jurisdiction) found.jurisdiction = "Required"

    if (!next.emails.lr) found["emails.lr"] = "Required"
    else if (!EMAIL.test(next.emails.lr))
      found["emails.lr"] = "Does not look like an e-mail address"
    if (!next.emails.bill) found["emails.bill"] = "Required"
    else if (!EMAIL.test(next.emails.bill))
      found["emails.bill"] = "Does not look like an e-mail address"

    if (next.phones.length === 0)
      found.phones = "At least one — the L.R. prints them across the top"

    if (!next.pan) found.pan = "Required — it prints on the L.R. and the bill"
    else if (!PAN.test(next.pan))
      found.pan = "A PAN is five letters, four figures and a letter"

    if (!next.bank.name) found["bank.name"] = "Required"
    if (!next.bank.branch) found["bank.branch"] = "Required"
    if (!next.bank.accountNo) found["bank.accountNo"] = "Required"
    else if (!/^\d+$/.test(next.bank.accountNo))
      found["bank.accountNo"] = "Figures only"
    if (!next.bank.ifsc) found["bank.ifsc"] = "Required"
    else if (!IFSC.test(next.bank.ifsc))
      found["bank.ifsc"] = "An IFSC is four letters, a nought, then six more"

    if (next.bookingOffices.length === 0)
      found.bookingOffices = "At least one — a bilty is booked at one of these"

    setErrors(found)
    if (Object.keys(found).length > 0) {
      toast.error("Check the letterhead — some details are not right yet")
      return
    }

    setDraft(next)
    save(company.slug, next)
    toast.success(`Letterhead saved for ${next.name}`)
  }

  function handleRestore() {
    restore(company.slug)
    setConfirmRestore(false)
    setErrors({})
    toast.success("Back to the printed letterhead")
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
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
          Kept in this browser until the backend lands — the desk next door will
          not see these edits, and clearing the browser&apos;s data puts the
          firm back to the letterhead transcribed from its own book. Everything
          here goes straight onto the printed documents, so it is worth reading
          off the book rather than from memory.
        </span>
      </p>

      <Section
        title="Firm"
        description="How the app names this book and tells it apart from the other one."
      >
        <Field label="Name" htmlFor="name" error={errors.name}>
          <Input
            id="name"
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </Field>
        <Field
          label="Monogram"
          htmlFor="monogram"
          error={errors.monogram}
          hint="The tile in the sidebar and the roundel on the printed L.R."
        >
          <Input
            id="monogram"
            className="uppercase"
            maxLength={4}
            value={draft.monogram}
            onChange={(e) => set("monogram", e.target.value.toUpperCase())}
          />
        </Field>
        <Field
          label="Tagline"
          htmlFor="tagline"
          hint="Under the name in the app, beside the switcher"
          className="sm:col-span-2"
        >
          <Input
            id="tagline"
            value={draft.tagline}
            onChange={(e) => set("tagline", e.target.value)}
          />
        </Field>
      </Section>

      <Section
        title="Letterhead"
        description="Printed across the top of every document that leaves the office."
      >
        <Field
          label="Address"
          htmlFor="address"
          error={errors.address}
          hint="One line, exactly as the book prints it"
          className="sm:col-span-2"
        >
          <Textarea
            id="address"
            rows={2}
            value={draft.address}
            onChange={(e) => set("address", e.target.value)}
          />
        </Field>
        <Field
          label="Booking office line"
          htmlFor="officeLine"
          error={errors.officeLine}
          hint="The short form, for the sidebar and the switcher"
        >
          <Input
            id="officeLine"
            value={draft.officeLine}
            onChange={(e) => set("officeLine", e.target.value)}
          />
        </Field>
        <Field
          label="Jurisdiction"
          htmlFor="jurisdiction"
          error={errors.jurisdiction}
          hint="Printed in the corner of the L.R. and under the bill"
        >
          <Input
            id="jurisdiction"
            value={draft.jurisdiction}
            onChange={(e) => set("jurisdiction", e.target.value)}
          />
        </Field>
        <Field
          label="Tagline on the L.R."
          htmlFor="lrTagline"
          hint="The lorry receipt and the loading slip"
        >
          <Input
            id="lrTagline"
            value={draft.lrTagline}
            onChange={(e) => set("lrTagline", e.target.value)}
          />
        </Field>
        <Field
          label="Tagline on the bill"
          htmlFor="billTagline"
          hint="The two books word it differently — that is not a mistake"
        >
          <Input
            id="billTagline"
            value={draft.billTagline}
            onChange={(e) => set("billTagline", e.target.value)}
          />
        </Field>
      </Section>

      <Section
        title="Contact"
        description="The numbers along the top of the L.R., and the address each book is answered on."
      >
        <ListField
          label="Phone numbers"
          id="phone"
          itemLabel="Phone number"
          addLabel="Add number"
          placeholder="9376150604"
          inputClassName="tabular-nums"
          error={errors.phones}
          hint="Printed in order, one per line"
          values={draft.phones}
          onValuesChange={(values) => set("phones", values)}
        />
        <div className="grid content-start gap-4">
          <Field
            label="E-mail on the L.R."
            htmlFor="emailLr"
            error={errors["emails.lr"]}
          >
            <Input
              id="emailLr"
              type="email"
              value={draft.emails.lr}
              onChange={(e) => setEmail("lr", e.target.value)}
            />
          </Field>
          <Field
            label="E-mail on the bill"
            htmlFor="emailBill"
            error={errors["emails.bill"]}
            hint="The bill book was printed separately and may carry the other address"
          >
            <Input
              id="emailBill"
              type="email"
              value={draft.emails.bill}
              onChange={(e) => setEmail("bill", e.target.value)}
            />
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
          error={errors.pan}
          hint="Ten characters, as issued"
        >
          <Input
            id="pan"
            className="uppercase tabular-nums"
            maxLength={10}
            value={draft.pan}
            onChange={(e) => set("pan", e.target.value.toUpperCase())}
          />
        </Field>
        <Field label="Bank" htmlFor="bankName" error={errors["bank.name"]}>
          <Input
            id="bankName"
            value={draft.bank.name}
            onChange={(e) => setBank("name", e.target.value)}
          />
        </Field>
        <Field
          label="Branch"
          htmlFor="bankBranch"
          error={errors["bank.branch"]}
        >
          <Input
            id="bankBranch"
            value={draft.bank.branch}
            onChange={(e) => setBank("branch", e.target.value)}
          />
        </Field>
        <Field
          label="A/C No."
          htmlFor="accountNo"
          error={errors["bank.accountNo"]}
        >
          <Input
            id="accountNo"
            inputMode="numeric"
            className="tabular-nums"
            value={draft.bank.accountNo}
            onChange={(e) => setBank("accountNo", e.target.value)}
          />
        </Field>
        <Field label="IFSC" htmlFor="ifsc" error={errors["bank.ifsc"]}>
          <Input
            id="ifsc"
            className="uppercase tabular-nums"
            maxLength={11}
            value={draft.bank.ifsc}
            onChange={(e) => setBank("ifsc", e.target.value.toUpperCase())}
          />
        </Field>
      </Section>

      <Section
        title="Booking"
        description="What a fresh bilty or slip starts out with before the clerk touches it."
      >
        <Field
          label="Station booked from"
          htmlFor="origin"
          hint="Fills the From box on a new L.R. and slip"
        >
          <Select
            value={draft.origin}
            onValueChange={(value) => value && set("origin", value)}
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
        <ListField
          label="Booking offices"
          id="bookingOffice"
          itemLabel="Booking office"
          addLabel="Add office"
          placeholder="Odhav, Ahmedabad"
          error={errors.bookingOffices}
          hint="The first is where a new bilty is booked"
          values={draft.bookingOffices}
          onValuesChange={(values) => set("bookingOffices", values)}
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
          {dirty
            ? "Unsaved changes"
            : edited
              ? "Saved in this browser"
              : "Running on the printed letterhead"}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            disabled={!edited}
            onClick={() => setConfirmRestore(true)}
          >
            <RotateCcwIcon data-icon="inline-start" />
            Restore printed letterhead
          </Button>
          <Button
            variant="outline"
            disabled={!dirty}
            onClick={() => {
              setDraft(current)
              setErrors({})
            }}
          >
            Discard
          </Button>
          <Button disabled={!dirty} onClick={handleSave}>
            Save letterhead
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
              Every edit saved in this browser is dropped and the firm goes back
              to the details transcribed from its own book. Documents already
              printed are unaffected; ones printed from here on carry the
              restored letterhead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep my edits</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleRestore}>
              Restore letterhead
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
