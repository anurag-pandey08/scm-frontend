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

import { LoadingSlipStatusBadge } from "@/components/loading-slip/badges"
import { LoadingSlipDialog } from "@/components/loading-slip/loading-slip-dialog"
import { LoadingSlipFilters } from "@/components/loading-slip/loading-slip-filters"
import { LoadingSlipFormDialog } from "@/components/loading-slip/loading-slip-form-dialog"
import { LoadingSlipPagination } from "@/components/loading-slip/loading-slip-pagination"
import {
  EMPTY_PAGE,
  useLoadingSlipMutations,
  useLoadingSlipPage,
} from "@/components/loading-slip/use-loading-slips"
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
import { ApiError } from "@/lib/api/client"
import type { SlipBookQuery } from "@/lib/api/loading-slips"
import { formatDate, formatINR, formatNumber } from "@/lib/format"
import { slipBalance, type LoadingSlip } from "@/lib/loading-slip-types"
import type { LoadingSlipInput } from "@/lib/schemas/loading-slip"

/**
 * The slip book, as a register.
 *
 * Filtering, sorting, paging and the footer totals are all Postgres's — the
 * page arrives already narrowed, already counted and already added up, and
 * this renders it. That is a change from what it used to do: it once held the
 * whole book in memory and filtered it in the browser, which is fine for eight
 * slips and not for a year of them.
 *
 * What is left here is the book as a document — the rows, the actions on a
 * row, and the three dialogs those actions open.
 */
export function LoadingSlipRegister({ query }: { query: SlipBookQuery }) {
  // Defaults for a fresh slip come off whichever firm's book is open, and
  // follow the letterhead if the office edits it.
  const company = useCompany()

  const { data, isFetching, isError, error } = useLoadingSlipPage(
    company.slug,
    query
  )
  const { create, update, remove } = useLoadingSlipMutations(company.slug)

  const { slips, meta } = data ?? EMPTY_PAGE

  const [form, setForm] = React.useState<{
    open: boolean
    /** The slip being amended, or null when a new one is being written. */
    editing: LoadingSlip | null
  }>({ open: false, editing: null })

  const [viewing, setViewing] = React.useState<LoadingSlip | null>(null)
  const [viewOpen, setViewOpen] = React.useState(false)
  const [pendingDelete, setPendingDelete] = React.useState<LoadingSlip | null>(
    null
  )

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
    ? "Saving slip…"
    : deleting
      ? "Deleting slip…"
      : "Fetching slips…"

  const filtersApplied = query.q !== "" || query.status !== "all"

  async function handleSave(input: LoadingSlipInput): Promise<void> {
    const editing = form.editing

    if (editing) {
      await update.mutateAsync({ id: editing.id, input })
      toast.success(`Slip ${input.slipNo} updated`)
    } else {
      await create.mutateAsync(input)
      toast.success(`Slip ${input.slipNo} saved`)
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
      // in memory is free; putting a deleted slip back into the book means
      // writing it again, under a number that may since have been taken. The
      // dialog says to mark it Cancelled instead, which is the real undo.
      toast.success(`Slip ${removed.slipNo} deleted`)
    } catch (cause) {
      toast.error(
        cause instanceof ApiError
          ? cause.message
          : `Could not delete slip ${removed.slipNo}`
      )
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Loading Slips
          </h1>
          <p className="text-sm text-muted-foreground">
            Lorries placed against a party&apos;s order — write the slip, print
            it off the book and send it with the driver
          </p>
        </div>
        <Button onClick={() => setForm({ open: true, editing: null })}>
          <PlusIcon data-icon="inline-start" />
          New slip
        </Button>
      </header>

      <LoadingSlipFilters query={query} onPendingChange={setFiltersPending} />

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
                <TableHead>No.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>To M/s.</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Freight</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {slips.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={9} className="h-28 text-center">
                    <p className="text-sm font-medium">
                      {isError
                        ? "Could not read the slip book"
                        : "No loading slips found"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {isError
                        ? error instanceof ApiError
                          ? error.message
                          : "Something went wrong reading the book."
                        : filtersApplied
                          ? "Nothing matches these filters."
                          : "The slip book is empty — write the first slip."}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                slips.map((slip) => (
                  <TableRow key={slip.id}>
                    <TableCell className="font-medium tabular-nums">
                      {slip.slipNo}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(slip.slipDate)}
                    </TableCell>
                    <TableCell className="max-w-64">
                      <div className="truncate">{slip.party}</div>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {slip.vehicleNo}
                    </TableCell>
                    <TableCell>
                      {slip.from} → {slip.to}
                    </TableCell>
                    <TableCell>
                      <LoadingSlipStatusBadge status={slip.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatINR(slip.totalFreight)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatINR(slipBalance(slip))}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={<Button variant="ghost" size="icon-sm" />}
                          aria-label={`Actions for slip ${slip.slipNo}`}
                        >
                          <EllipsisIcon />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            onClick={() => {
                              setViewing(slip)
                              setViewOpen(true)
                            }}
                          >
                            <FileTextIcon />
                            View slip
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              setForm({ open: true, editing: slip })
                            }
                          >
                            <PencilIcon />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setPendingDelete(slip)}
                          >
                            <Trash2Icon />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>

            {slips.length > 0 ? (
              <TableFooter>
                <TableRow className="hover:bg-transparent">
                  {/* The totals are of everything the filters match, not of the
                      rows on this page — a clerk filtering to one party's slips
                      wants what is owed on all of them. */}
                  <TableCell colSpan={6}>
                    {formatNumber(meta.total)} of {formatNumber(meta.bookTotal)}{" "}
                    slips · advanced{" "}
                    <span className="tabular-nums">
                      {formatINR(meta.totals.advance)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatINR(meta.totals.hire)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatINR(meta.totals.balance)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            ) : null}
          </Table>
        </Card>

        <TruckLoadingOverlay show={busy} label={busyLabel} />
      </div>

      <LoadingSlipPagination
        query={query}
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPendingChange={setPagePending}
      />

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <PrinterIcon className="size-3.5" />
        Open a slip to print it — the sheet goes to the printer on its own, with
        the app around it left off the page.
      </p>

      <LoadingSlipFormDialog
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

      <LoadingSlipDialog
        slip={viewing}
        company={company}
        open={viewOpen}
        onOpenChange={setViewOpen}
        onEdit={(slip) => setForm({ open: true, editing: slip })}
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
              Delete slip {pendingDelete?.slipNo}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the slip written for {pendingDelete?.party} from the
              book, for every desk, and it cannot be undone. If the slip already
              went out with a driver and the trip then fell through, mark it
              Cancelled instead so the numbering stays unbroken.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => void handleDelete()}
            >
              Delete slip
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
