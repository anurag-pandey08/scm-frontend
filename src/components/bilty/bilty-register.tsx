"use client"

import * as React from "react"
import {
  EllipsisIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  ScrollTextIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { PaymentBadge, StatusBadge } from "@/components/bilty/badges"
import { BiltyDetailSheet } from "@/components/bilty/bilty-detail-sheet"
import { BiltyFilters } from "@/components/bilty/bilty-filters"
import { BiltyFormDialog } from "@/components/bilty/bilty-form-dialog"
import { BiltyLrDialog } from "@/components/bilty/bilty-lr-dialog"
import { BiltyPagination } from "@/components/bilty/bilty-pagination"
import {
  EMPTY_PAGE,
  useBiltyMutations,
  useBiltyPage,
} from "@/components/bilty/use-bilties"
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
import type { RegisterQuery } from "@/lib/api/bilties"
import { formatDate, formatINR, formatNumber } from "@/lib/format"
import type { BiltyInput } from "@/lib/schemas/bilty"
import { grossTotal, type Bilty } from "@/lib/types"

/**
 * The L.R. book, as a register.
 *
 * Filtering, sorting, paging and the footer totals are all Postgres's — the
 * page arrives already narrowed, already counted and already added up, and
 * this renders it. That is a change from what it used to do: it once held the
 * whole book in memory and filtered it in the browser, which is fine for
 * twenty-nine consignments and not for a year of them.
 *
 * What is left here is the register as a document — the rows, the actions on a
 * row, and the four dialogs those actions open.
 */
export function BiltyRegister({ query }: { query: RegisterQuery }) {
  // Defaults for a fresh L.R. come off whichever firm's book is open, and
  // follow the letterhead if the office edits it.
  const company = useCompany()

  const { data, isFetching, isError, error } = useBiltyPage(company.slug, query)
  const { create, update, remove } = useBiltyMutations(company.slug)

  const { bilties, meta } = data ?? EMPTY_PAGE

  // Filtering and paging are navigations before they are queries — the URL is
  // rewritten and the page re-fetched on the server — so the register has to
  // hear about them from the controls rather than from its own query.
  const [filtersPending, setFiltersPending] = React.useState(false)
  const [pagePending, setPagePending] = React.useState(false)

  const saving = create.isPending || update.isPending
  const deleting = remove.isPending

  // One loader for everything that leaves the rows on screen out of date:
  // a search, a filter, a page turn, a save, a deletion, and the refetch each
  // write kicks off afterwards.
  const busy = isFetching || filtersPending || pagePending || saving || deleting
  const busyLabel = saving
    ? "Saving bilty…"
    : deleting
      ? "Deleting bilty…"
      : "Fetching bilties…"

  const [form, setForm] = React.useState<{
    open: boolean
    /** The record being amended, or null when a new one is being booked. */
    editing: Bilty | null
  }>({ open: false, editing: null })

  const [detail, setDetail] = React.useState<Bilty | null>(null)
  const [detailOpen, setDetailOpen] = React.useState(false)
  const [lr, setLr] = React.useState<Bilty | null>(null)
  const [lrOpen, setLrOpen] = React.useState(false)
  const [pendingDelete, setPendingDelete] = React.useState<Bilty | null>(null)

  const filtersApplied =
    query.q !== "" || query.status !== "all" || query.payment !== "all"

  async function handleSave(input: BiltyInput): Promise<void> {
    const editing = form.editing

    if (editing) {
      await update.mutateAsync({ id: editing.id, input })
      toast.success(`Bilty ${input.lrNo} updated`)
    } else {
      await create.mutateAsync(input)
      toast.success(`Bilty ${input.lrNo} saved`)
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
      // in memory is free; putting a deleted consignment back into the book
      // means booking it again, under a number that may since have been taken.
      // The dialog says to mark it Cancelled instead, which is the real undo.
      toast.success(`Bilty ${removed.lrNo} deleted`)
    } catch (cause) {
      toast.error(
        cause instanceof ApiError
          ? cause.message
          : `Could not delete bilty ${removed.lrNo}`
      )
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Bilty Register
          </h1>
          <p className="text-sm text-muted-foreground">
            Every lorry receipt in the book — book, amend and close consignments
          </p>
        </div>
        <Button onClick={() => setForm({ open: true, editing: null })}>
          <PlusIcon data-icon="inline-start" />
          New bilty
        </Button>
      </header>

      <BiltyFilters query={query} onPendingChange={setFiltersPending} />

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
                <TableHead>L.R. No.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Consignor → Consignee</TableHead>
                <TableHead className="text-right">Pkgs</TableHead>
                <TableHead className="text-right">Charged wt.</TableHead>
                <TableHead>Terms</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Gr. Total</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {bilties.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={10} className="h-28 text-center">
                    <p className="text-sm font-medium">
                      {isError
                        ? "Could not read the register"
                        : "No bilties found"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {isError
                        ? error instanceof ApiError
                          ? error.message
                          : "Something went wrong reading the book."
                        : filtersApplied
                          ? "Nothing matches these filters."
                          : "The register is empty — book the first bilty."}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                bilties.map((bilty) => (
                  <TableRow key={bilty.id}>
                    <TableCell className="font-medium tabular-nums">
                      {bilty.lrNo}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(bilty.lrDate)}
                    </TableCell>
                    <TableCell>
                      <div>
                        {bilty.from} → {bilty.to}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {bilty.lorryNo}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-64">
                      <div className="truncate">{bilty.consignor.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {bilty.consignee.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(bilty.packages)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(bilty.chargedWeight)}
                    </TableCell>
                    <TableCell>
                      <PaymentBadge type={bilty.paymentType} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={bilty.status} />
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatINR(grossTotal(bilty.charges))}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={<Button variant="ghost" size="icon-sm" />}
                          aria-label={`Actions for bilty ${bilty.lrNo}`}
                        >
                          <EllipsisIcon />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            onClick={() => {
                              setLr(bilty)
                              setLrOpen(true)
                            }}
                          >
                            <ScrollTextIcon />
                            View bilty
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setDetail(bilty)
                              setDetailOpen(true)
                            }}
                          >
                            <EyeIcon />
                            Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              setForm({ open: true, editing: bilty })
                            }
                          >
                            <PencilIcon />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setPendingDelete(bilty)}
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

            {bilties.length > 0 ? (
              <TableFooter>
                <TableRow className="hover:bg-transparent">
                  {/* The totals are of everything the filters match, not of the
                    rows on this page — a clerk filtering to one party's To Pay
                    consignments wants what that party owes altogether. */}
                  <TableCell colSpan={8}>
                    {formatNumber(meta.total)} of {formatNumber(meta.bookTotal)}{" "}
                    bilties · balance to collect{" "}
                    <span className="tabular-nums">
                      {formatINR(meta.totals.balance)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatINR(meta.totals.gross)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            ) : null}
          </Table>
        </Card>

        <TruckLoadingOverlay show={busy} label={busyLabel} />
      </div>

      <BiltyPagination
        query={query}
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPendingChange={setPagePending}
      />

      <BiltyFormDialog
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

      <BiltyLrDialog
        bilty={lr}
        company={company}
        open={lrOpen}
        onOpenChange={setLrOpen}
        onEdit={(bilty) => setForm({ open: true, editing: bilty })}
      />

      <BiltyDetailSheet
        bilty={detail}
        company={company}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={(bilty) => setForm({ open: true, editing: bilty })}
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
              Delete bilty {pendingDelete?.lrNo}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the entry for {pendingDelete?.consignor.name} to{" "}
              {pendingDelete?.to} from the register, for every desk, and it
              cannot be undone. If the consignment was actually called off, mark
              it Cancelled instead so the L.R. numbering stays unbroken.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => void handleDelete()}
            >
              Delete bilty
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
