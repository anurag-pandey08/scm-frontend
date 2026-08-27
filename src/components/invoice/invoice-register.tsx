"use client"

import * as React from "react"
import {
  EllipsisIcon,
  FileTextIcon,
  PencilIcon,
  PlusIcon,
  PrinterIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { InvoiceStatusBadge } from "@/components/invoice/badges"
import { InvoiceBillDialog } from "@/components/invoice/invoice-bill-dialog"
import { InvoiceFormDialog } from "@/components/invoice/invoice-form-dialog"
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
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Company } from "@/lib/companies"
import { TODAY } from "@/lib/data"
import { formatDate, formatINR } from "@/lib/format"
import { getSeedInvoices, nextBillNo } from "@/lib/invoice-data"
import {
  INVOICE_STATUSES,
  billedChallans,
  emptyInvoice,
  invoiceTotal,
  outstanding,
  type Invoice,
  type InvoiceStatus,
} from "@/lib/invoice-types"

type StatusFilter = InvoiceStatus | "all"

/**
 * The filter options, each with the label the closed trigger shows for it.
 * `Select` is handed these as `items` so the trigger can name the choice —
 * without them it falls back to printing the raw value, and "all" is not
 * what the row reads as.
 */
const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  ...INVOICE_STATUSES.map((status) => ({ value: status, label: status })),
]

function matches(invoice: Invoice, query: string) {
  if (!query) return true
  const needle = query.trim().toLowerCase()
  return [
    invoice.billNo,
    invoice.party.name,
    invoice.party.gstNo,
    invoice.from,
    invoice.to,
    invoice.partyInvoiceNo,
    ...invoice.lines.map((line) => `${line.challanNo} ${line.particulars}`),
  ].some((field) => field.toLowerCase().includes(needle))
}

const byNewest = (a: Invoice, b: Invoice) =>
  a.billDate === b.billDate
    ? Number(b.billNo) - Number(a.billNo)
    : a.billDate < b.billDate
      ? 1
      : -1

export function InvoiceRegister({ company }: { company: Company }) {
  const [invoices, setInvoices] = React.useState<Invoice[]>(() =>
    getSeedInvoices(company.slug)
  )
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState<StatusFilter>("all")

  const [form, setForm] = React.useState<{
    open: boolean
    mode: "create" | "edit"
    invoice: Invoice
  }>(() => ({
    open: false,
    mode: "create",
    invoice: emptyInvoice("", TODAY, company.origin),
  }))

  const [bill, setBill] = React.useState<Invoice | null>(null)
  const [billOpen, setBillOpen] = React.useState(false)
  const [pendingDelete, setPendingDelete] = React.useState<Invoice | null>(null)

  const visible = React.useMemo(
    () =>
      invoices
        .filter(
          (i) => matches(i, query) && (status === "all" || i.status === status)
        )
        .sort(byNewest),
    [invoices, query, status]
  )

  const totals = React.useMemo(
    () =>
      visible.reduce(
        (acc, invoice) => {
          if (invoice.status !== "Cancelled")
            acc.billed += invoiceTotal(invoice)
          acc.outstanding += outstanding(invoice)
          return acc
        },
        { billed: 0, outstanding: 0 }
      ),
    [visible]
  )

  const takenBillNos = React.useMemo(
    () => invoices.filter((i) => i.id !== form.invoice.id).map((i) => i.billNo),
    [invoices, form.invoice.id]
  )

  function openCreate() {
    setForm({
      open: true,
      mode: "create",
      invoice: emptyInvoice(
        nextBillNo(company.slug, invoices),
        TODAY,
        company.origin
      ),
    })
  }

  function openEdit(invoice: Invoice) {
    // A fresh copy each time, so reopening the same record always reloads it
    // rather than resuming a half-finished draft.
    setForm({ open: true, mode: "edit", invoice: structuredClone(invoice) })
  }

  function openBill(invoice: Invoice) {
    setBill(invoice)
    setBillOpen(true)
  }

  function handleSave(saved: Invoice) {
    setInvoices((current) => {
      const exists = current.some((i) => i.id === saved.id)
      return exists
        ? current.map((i) => (i.id === saved.id ? saved : i))
        : [saved, ...current]
    })
    setForm((f) => ({ ...f, open: false }))
    toast.success(
      form.mode === "create"
        ? `Bill ${saved.billNo} saved`
        : `Bill ${saved.billNo} updated`
    )
  }

  function handleDelete() {
    const removed = pendingDelete
    if (!removed) return
    setInvoices((current) => current.filter((i) => i.id !== removed.id))
    setPendingDelete(null)
    toast.success(`Bill ${removed.billNo} deleted`, {
      action: {
        label: "Undo",
        onClick: () =>
          setInvoices((current) =>
            current.some((i) => i.id === removed.id)
              ? current
              : [removed, ...current]
          ),
      },
    })
  }

  const filtersApplied = query !== "" || status !== "all"

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Freight bills raised on the parties — draw one up, print it off the
            book and mark it settled
          </p>
        </div>
        <Button onClick={openCreate}>
          <PlusIcon data-icon="inline-start" />
          New bill
        </Button>
      </header>

      {/* One filter row above everything it scopes */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid min-w-56 flex-1 gap-1.5">
          <Label htmlFor="search" className="sr-only">
            Search bills
          </Label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="search"
              className="pl-8"
              placeholder="Bill no., party, challan, lorry, destination…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="filter-status" className="sr-only">
            Status
          </Label>
          <Select
            items={STATUS_FILTERS}
            value={status}
            onValueChange={(v) => v && setStatus(v)}
          >
            <SelectTrigger id="filter-status" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Always in the row, and flat until there is something to clear. A
            button that comes and goes shoves the controls beside it sideways
            every time a filter is set or dropped. */}
        <Button
          variant="ghost"
          disabled={!filtersApplied}
          onClick={() => {
            setQuery("")
            setStatus("all")
          }}
        >
          Clear
        </Button>
      </div>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bill No.</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>M/s</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Challans</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {visible.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="h-28 text-center">
                  <p className="text-sm font-medium">No bills found</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {filtersApplied
                      ? "Nothing matches these filters."
                      : "The bill book is empty — raise the first bill."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              visible.map((invoice) => {
                const challans = billedChallans(invoice)
                return (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium tabular-nums">
                      {invoice.billNo}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(invoice.billDate)}
                    </TableCell>
                    <TableCell className="max-w-64">
                      <div className="truncate">{invoice.party.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {invoice.party.gstNo || "GST not on record"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {invoice.from} → {invoice.to}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {challans.length > 0 ? challans.join(", ") : "—"}
                    </TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={invoice.status} />
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatINR(invoiceTotal(invoice))}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={<Button variant="ghost" size="icon-sm" />}
                          aria-label={`Actions for bill ${invoice.billNo}`}
                        >
                          <EllipsisIcon />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => openBill(invoice)}>
                            <FileTextIcon />
                            View bill
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(invoice)}>
                            <PencilIcon />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setPendingDelete(invoice)}
                          >
                            <Trash2Icon />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>

          {visible.length > 0 ? (
            <TableFooter>
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6}>
                  {visible.length} of {invoices.length} bills · outstanding{" "}
                  <span className="tabular-nums">
                    {formatINR(totals.outstanding)}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatINR(totals.billed)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          ) : null}
        </Table>
      </Card>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <PrinterIcon className="size-3.5" />
        Open a bill to print it — the sheet goes to the printer on its own, with
        the app around it left off the page.
      </p>

      <InvoiceFormDialog
        open={form.open}
        onOpenChange={(open) => setForm((f) => ({ ...f, open }))}
        mode={form.mode}
        initial={form.invoice}
        takenBillNos={takenBillNos}
        onSave={handleSave}
      />

      <InvoiceBillDialog
        invoice={bill}
        company={company}
        open={billOpen}
        onOpenChange={setBillOpen}
        onEdit={openEdit}
      />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete bill {pendingDelete?.billNo}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the bill raised on {pendingDelete?.party.name} from
              the book. If the party was billed and the bill was then withdrawn,
              mark it Cancelled instead so the numbering stays unbroken.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Delete bill
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
