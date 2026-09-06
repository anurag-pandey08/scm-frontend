"use client"

import * as React from "react"
import {
  EllipsisIcon,
  FileTextIcon,
  PencilIcon,
  PlusIcon,
  PrinterIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { InvoiceStatusBadge } from "@/components/invoice/badges"
import { InvoiceBillDialog } from "@/components/invoice/invoice-bill-dialog"
import { InvoiceFilters } from "@/components/invoice/invoice-filters"
import { InvoiceFormDialog } from "@/components/invoice/invoice-form-dialog"
import { InvoicePagination } from "@/components/invoice/invoice-pagination"
import {
  EMPTY_PAGE,
  useInvoiceMutations,
  useInvoicePage,
} from "@/components/invoice/use-invoices"
import { useCompany } from "@/components/company-provider"
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
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TruckLoadingOverlay } from "@/components/ui/truck-loader"
import type { BillBookQuery } from "@/lib/api/invoices"
import { ApiError } from "@/lib/api/client"
import { formatDate, formatINR, formatNumber } from "@/lib/format"
import { billedChallans, invoiceTotal, type Invoice } from "@/lib/invoice-types"
import type { InvoiceInput } from "@/lib/schemas/invoice"

/**
 * The bill book, as a register.
 *
 * Filtering, sorting, paging and the footer totals are all Postgres's — the
 * page arrives already narrowed, already counted and already added up, and
 * this renders it. That is a change from what it used to do: it once held the
 * whole book in memory and filtered it in the browser, which is fine for
 * thirteen bills and not for a year of them.
 *
 * What is left here is the book as a document — the rows, the actions on a
 * row, and the three dialogs those actions open.
 */
export function InvoiceRegister({ query }: { query: BillBookQuery }) {
  // Defaults for a fresh bill come off whichever firm's book is open, and
  // follow the letterhead if the office edits it.
  const company = useCompany()

  const { data, isFetching, isError, error } = useInvoicePage(
    company.slug,
    query
  )
  const { create, update, remove } = useInvoiceMutations(company.slug)

  const { invoices, meta } = data ?? EMPTY_PAGE

  const [form, setForm] = React.useState<{
    open: boolean
    /** The bill being amended, or null when a new one is being raised. */
    editing: Invoice | null
  }>({ open: false, editing: null })

  const [bill, setBill] = React.useState<Invoice | null>(null)
  const [billOpen, setBillOpen] = React.useState(false)
  const [pendingDelete, setPendingDelete] = React.useState<Invoice | null>(null)

  // Filtering and paging are navigations before they are queries — the URL is
  // rewritten and the page re-fetched on the server — so the book has to hear
  // about them from the controls rather than from its own query.
  const [filtersPending, setFiltersPending] = React.useState(false)
  const [pagePending, setPagePending] = React.useState(false)

  const saving = create.isPending || update.isPending
  const deleting = remove.isPending

  // One loader for everything that leaves the rows on screen out of date: a
  // search, a filter, a page turn, a save, a deletion, and the refetch each
  // write kicks off afterwards.
  const busy = isFetching || filtersPending || pagePending || saving || deleting
  const busyLabel = saving
    ? "Saving bill…"
    : deleting
      ? "Deleting bill…"
      : "Fetching bills…"

  const filtersApplied = query.q !== "" || query.status !== "all"

  async function handleSave(input: InvoiceInput): Promise<void> {
    const editing = form.editing

    if (editing) {
      await update.mutateAsync({ id: editing.id, input })
      toast.success(`Bill ${input.billNo} updated`)
    } else {
      await create.mutateAsync(input)
      toast.success(`Bill ${input.billNo} saved`)
    }

    setForm({ open: false, editing: null })
  }

  async function handleDelete() {
    const removed = pendingDelete
    if (!removed) return

    setPendingDelete(null)

    try {
      await remove.mutateAsync(removed.id)
      // No undo. It used to offer one, because putting a row back into a list
      // in memory is free; putting a deleted bill back into the book means
      // raising it again, under a number that may since have been taken. The
      // dialog says to mark it Cancelled instead, which is the real undo.
      toast.success(`Bill ${removed.billNo} deleted`)
    } catch (cause) {
      toast.error(
        cause instanceof ApiError
          ? cause.message
          : `Could not delete bill ${removed.billNo}`
      )
    }
  }

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
        <Button onClick={() => setForm({ open: true, editing: null })}>
          <PlusIcon data-icon="inline-start" />
          New bill
        </Button>
      </header>

      <InvoiceFilters query={query} onPendingChange={setFiltersPending} />

      {/* Covered rather than emptied while the next page is fetched — the rows
          on screen are still the right answer to the previous question, and
          blanking them makes every filter change look like a reload.

          The lorry is a sibling of the card, not a child: it holds itself in
          view as the clerk scrolls, which the card's `overflow-hidden` would
          otherwise stop. */}
      <div className="relative">
        <Card className="py-0" data-pending={busy ? "" : undefined}>
          <Table aria-busy={busy}>
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
              {invoices.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={8} className="h-28 text-center">
                    <p className="text-sm font-medium">
                      {isError
                        ? "Could not read the bill book"
                        : "No bills found"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {isError
                        ? error instanceof ApiError
                          ? error.message
                          : "Something went wrong reading the book."
                        : filtersApplied
                          ? "Nothing matches these filters."
                          : "The bill book is empty — raise the first bill."}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => {
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
                            <DropdownMenuItem
                              onClick={() => {
                                setBill(invoice)
                                setBillOpen(true)
                              }}
                            >
                              <FileTextIcon />
                              View bill
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                setForm({ open: true, editing: invoice })
                              }
                            >
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

            {invoices.length > 0 ? (
              <TableFooter>
                <TableRow className="hover:bg-transparent">
                  {/* The totals are of everything the filters match, not of the
                      rows on this page — a clerk filtering to one party's
                      raised bills wants what that party owes altogether. */}
                  <TableCell colSpan={6}>
                    {formatNumber(meta.total)} of {formatNumber(meta.bookTotal)}{" "}
                    bills · outstanding{" "}
                    <span className="tabular-nums">
                      {formatINR(meta.totals.outstanding)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatINR(meta.totals.billed)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            ) : null}
          </Table>
        </Card>

        <TruckLoadingOverlay show={busy} label={busyLabel} />
      </div>

      <InvoicePagination
        query={query}
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPendingChange={setPagePending}
      />

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <PrinterIcon className="size-3.5" />
        Open a bill to print it — the sheet goes to the printer on its own, with
        the app around it left off the page.
      </p>

      <InvoiceFormDialog
        open={form.open}
        onOpenChange={(open) =>
          setForm((f) =>
            open ? { ...f, open } : { open: false, editing: null }
          )
        }
        editing={form.editing}
        company={company}
        onSave={handleSave}
      />

      <InvoiceBillDialog
        invoice={bill}
        company={company}
        open={billOpen}
        onOpenChange={setBillOpen}
        onEdit={(invoice) => setForm({ open: true, editing: invoice })}
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
              the book, for every desk, and it cannot be undone. If the party
              was billed and the bill was then withdrawn, mark it Cancelled
              instead so the numbering stays unbroken.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => void handleDelete()}
            >
              Delete bill
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
