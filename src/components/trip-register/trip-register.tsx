"use client"

import * as React from "react"
import {
  EllipsisIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  SelectAllBox,
  SelectionBar,
  SelectRowBox,
  useRowSelection,
  type RowSelection,
} from "@/components/register-selection"
import { TripFilters } from "@/components/trip-register/trip-filters"
import { TripFormDialog } from "@/components/trip-register/trip-form-dialog"
import { TripPagination } from "@/components/trip-register/trip-pagination"
import {
  EMPTY_PAGE,
  useTripMutations,
  useTripPage,
} from "@/components/trip-register/use-trips"
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TruckLoadingOverlay } from "@/components/ui/truck-loader"
import { ApiError } from "@/lib/api/client"
import type { RegisterQuery } from "@/lib/api/trips"
import { formatDateNumeric, formatINR, formatNumber } from "@/lib/format"
import type { TripInput } from "@/lib/schemas/trip"
import {
  tripDueFromParty,
  tripFreight,
  type Trip,
} from "@/lib/trip-register-types"
import { cn } from "@/lib/utils"

/** Money cells read as blank rather than ₹0 — the ledger leaves them empty. */
function money(amount: number): string {
  return amount ? formatNumber(amount) : ""
}

/** The header groups, in the order they run across the paper spread. */
const GROUPS: [string, number][] = [
  ["Consignment", 9],
  ["Owed to the lorry", 5],
  ["Office", 3],
  ["Party payment", 5],
]

const COLUMNS = [
  "Date",
  "Truck No.",
  "Party Name",
  "Broker Name",
  "From",
  "To",
  "Goods",
  "Rate",
  "Weight",
  "Advance",
  "Balance",
  "To Pay",
  "Receive Date",
  "Paid Date",
  "L.R. No.",
  "Commission",
  "Remarks",
  "Party Payment",
  "Advance Receive Rs.",
  "Advance Date",
  "Balance Receive Rs.",
  "Balance Date",
]

/** Right-aligned in the ledger: every money and measure column. */
const NUMERIC = new Set([
  "Rate",
  "Weight",
  "Advance",
  "Balance",
  "To Pay",
  "Commission",
  "Party Payment",
  "Advance Receive Rs.",
  "Balance Receive Rs.",
])

/** Closes the pinned pair off from the spread — see `stickyCell`. */
const stickyEdge = "shadow-[inset_-1px_0_0_0_var(--border)]"

/**
 * The first two columns stay put while the rest of the spread scrolls, so a row
 * never loses the date and lorry that identify it.
 *
 * Two things make them read as solid paper rather than tracing paper. The
 * background is `bg-card` — the Card the table sits in, not `bg-background`,
 * which is a different colour under the dark theme. And the row's hover tint
 * arrives as an overlay rather than as `bg-muted/50` on the cell itself: a
 * half-transparent background would let the scrolled columns show straight
 * through. The overlay sits behind the text (`-z-10`, inside the stacking
 * context the sticky cell already opens) and matches the tint the rest of the
 * row takes from the `tr`.
 *
 * The pair is closed off on the right by `stickyEdge` rather than a `border-r`:
 * collapsed table borders are painted by the table, not the cell, so they stay
 * behind while the cell sticks.
 */
const stickyCell = cn(
  "sticky bg-card",
  "before:pointer-events-none before:absolute before:inset-0 before:-z-10",
  "before:bg-muted/50 before:opacity-0 before:transition-opacity",
  "group-hover/row:before:opacity-100 group-has-aria-expanded/row:before:opacity-100"
)

/**
 * Edit and delete for one trip — the table's last cell on a wide screen, the
 * card's top corner on a narrow one.
 */
function RowActions({
  trip,
  onEdit,
  onDelete,
}: {
  trip: Trip
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" />}
        aria-label={`Actions for the ${trip.truckNo} trip`}
      >
        <EllipsisIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={onEdit}>
          <PencilIcon />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2Icon />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** One labelled figure on a trip card. */
function CardField({
  label,
  value,
  className,
  strong,
}: {
  label: string
  value: React.ReactNode
  className?: string
  strong?: boolean
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className={cn("truncate", strong && "font-medium tabular-nums")}>
        {value}
      </dd>
    </div>
  )
}

/**
 * A trip as it reads below `md`. The spread is 22 columns wide: on a phone the
 * pinned Date and Truck No. pair eats most of the viewport and leaves a slot
 * too narrow to read the scrolled columns through, so the row is dealt out
 * downwards instead. What is here is what identifies the trip and what is
 * outstanding either side of it; the rest of the ledger is one tap away, in
 * the same form the row is edited in.
 */
function TripCard({
  trip,
  selection,
  onEdit,
  onDelete,
}: {
  trip: Trip
  selection: RowSelection
  onEdit: () => void
  onDelete: () => void
}) {
  const dueFromParty = Math.max(0, tripDueFromParty(trip))
  const dueToLorry = trip.paidDate ? 0 : trip.balance

  return (
    <Card
      size="sm"
      className={cn(
        "gap-2.5",
        // The spread marks a ticked row by tinting it; a card has no row to
        // tint, so it takes a ring instead.
        selection.isSelected(trip.id) && "ring-1 ring-foreground/25"
      )}
    >
      <div className="flex items-start gap-2 px-3">
        <SelectRowBox
          selection={selection}
          id={trip.id}
          label={`Select the ${trip.truckNo} trip`}
          className="mt-0.5"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{trip.truckNo}</p>
          <p className="truncate text-xs text-muted-foreground">
            {formatDateNumeric(trip.date)} · {trip.from} → {trip.to}
          </p>
        </div>
        <RowActions trip={trip} onEdit={onEdit} onDelete={onDelete} />
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t px-3 pt-2.5 text-xs">
        <CardField
          label={trip.brokerName ? "Party · Broker" : "Party"}
          className="col-span-2"
          value={
            trip.brokerName
              ? `${trip.partyName} · ${trip.brokerName}`
              : trip.partyName
          }
        />
        <CardField
          label="Goods"
          className="col-span-2"
          value={
            trip.weight
              ? `${trip.goods} · ${Number(trip.weight.toFixed(3))} t`
              : trip.goods
          }
        />
        <CardField
          label="Freight"
          strong
          value={formatINR(tripFreight(trip))}
        />
        <CardField
          label="Commission"
          strong
          value={trip.commission ? formatINR(trip.commission) : "—"}
        />
        <CardField
          label="Party still owes"
          strong
          value={dueFromParty ? formatINR(dueFromParty) : "Settled"}
        />
        <CardField
          label="Lorry still to be paid"
          strong
          value={dueToLorry ? formatINR(dueToLorry) : "Settled"}
        />
      </dl>

      {trip.remarks ? (
        <p className="border-t px-3 pt-2.5 text-xs text-muted-foreground">
          {trip.remarks}
        </p>
      ) : null}
    </Card>
  )
}

/**
 * The office daybook.
 *
 * Filtering, sorting, paging and the five figures above the spread are all
 * Postgres's — the page arrives already narrowed, already counted and already
 * added up, and this renders it. That is a change from what it used to do: it
 * once held the whole book in memory and filtered it in the browser, which is
 * fine for fifteen trips and not for a year of them.
 *
 * The totals in particular are worth naming: every one of them is an
 * expression over columns rather than a column — rate × weight, a bill less
 * two receipts, a balance counted only where nobody has been paid — and all
 * five are now worked out in SQL. See `trip.repository.ts` for why.
 */
export function TripRegister({ query }: { query: RegisterQuery }) {
  const { data, isFetching, isError, error } = useTripPage(query)
  const { create, update, remove, removeMany } = useTripMutations()

  const { trips, meta } = data ?? EMPTY_PAGE

  // The ticked rows, scoped to the page on screen — see `useRowSelection`.
  const selection = useRowSelection(trips)

  const [form, setForm] = React.useState<{
    open: boolean
    /** The row being amended, or null when a new one is being entered. */
    editing: Trip | null
  }>({ open: false, editing: null })

  const [pendingDelete, setPendingDelete] = React.useState<Trip | null>(null)
  const [bulkOpen, setBulkOpen] = React.useState(false)

  // Filtering and paging are navigations before they are queries — the URL is
  // rewritten and the page re-fetched on the server — so the ledger has to
  // hear about them from the controls rather than from its own query.
  const [filtersPending, setFiltersPending] = React.useState(false)
  const [pagePending, setPagePending] = React.useState(false)

  const saving = create.isPending || update.isPending
  const deleting = remove.isPending || removeMany.isPending

  // One loader for everything that leaves the rows on screen out of date: a
  // search, a filter, a page turn, a save, a deletion, and the refetch each
  // write kicks off afterwards.
  const busy = isFetching || filtersPending || pagePending || saving || deleting
  const busyLabel = saving
    ? "Saving trip…"
    : deleting
      ? "Striking off…"
      : "Fetching trips…"

  /**
   * The widths of the pinned columns to the left of each other, so each can be
   * pinned flush against the one before it. Measured rather than assumed
   * because the tick box and the date column both size themselves off their
   * content, and a hard-coded offset would leave a seam or an overlap.
   *
   * Watched rather than read once. Below `md` the spread is `display: none`
   * and the cards are showing in its place, so a cell measured on mount at
   * phone width measures zero — and every column to the right of it is then
   * pinned on top of the one before it for as long as the page is open. The
   * zero is ignored and the last real figures kept, and the observer takes
   * the true ones the moment the spread is laid out.
   */
  const [tickWidth, setTickWidth] = React.useState(40)
  const [dateWidth, setDateWidth] = React.useState(96)

  const tickHead = React.useRef<HTMLTableCellElement | null>(null)
  const dateHead = React.useRef<HTMLTableCellElement | null>(null)

  React.useEffect(() => {
    function measure() {
      const tick = tickHead.current?.getBoundingClientRect().width ?? 0
      const date = dateHead.current?.getBoundingClientRect().width ?? 0

      if (tick > 0) setTickWidth(tick)
      if (date > 0) setDateWidth(date)
    }

    measure()

    const observer = new ResizeObserver(measure)
    if (tickHead.current) observer.observe(tickHead.current)
    if (dateHead.current) observer.observe(dateHead.current)

    return () => observer.disconnect()
    // The two header cells outlive every page of rows — the header is rendered
    // whether or not the book has anything in it — so there is nothing to
    // re-subscribe to.
  }, [])

  /**
   * `left` for the two pinned data columns; every other column scrolls. The
   * tick column is pinned too and sits at 0, but it is rendered outside the
   * `COLUMNS` map, so it sets its own offset rather than taking one from here.
   */
  const stickyLeft = (index: number) =>
    index === 0
      ? { left: tickWidth }
      : index === 1
        ? { left: tickWidth + dateWidth }
        : undefined

  const filtersApplied = query.q !== "" || query.filter !== "all"

  async function handleSave(input: TripInput): Promise<void> {
    const editing = form.editing

    if (editing) {
      await update.mutateAsync({ id: editing.id, input })
      toast.success(`Trip ${input.truckNo} updated`)
    } else {
      await create.mutateAsync(input)
      toast.success(`Trip ${input.truckNo} entered`)
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
      // in memory is free; putting a struck-off trip back into a book both
      // offices work means entering it again, and the other desk may have
      // acted on its absence in the meantime.
      toast.success(`Trip ${removed.truckNo} struck off`)
    } catch (cause) {
      toast.error(
        cause instanceof ApiError
          ? cause.message
          : `Could not strike off the ${removed.truckNo} trip`
      )
    }
  }

  async function handleBulkDelete() {
    const ids = selection.selected
    if (ids.length === 0) return

    setBulkOpen(false)

    try {
      const { deleted, requested } = await removeMany.mutateAsync(ids)

      // The refetch this kicks off changes the rows, which clears the ticks on
      // its own — but that lands a moment later, and a bar still counting rows
      // that have gone reads like the strike-off did not take.
      selection.clear()

      // Two figures came back, and they can differ: a trip struck off between
      // the tick and the confirmation is one this request asked for and did
      // not remove — and in this book the desk that struck it off need not
      // even be in this office.
      toast.success(
        deleted === requested
          ? `${deleted} ${deleted === 1 ? "trip" : "trips"} struck off`
          : `${deleted} of ${requested} struck off — the rest had already gone`
      )
    } catch (cause) {
      toast.error(
        cause instanceof ApiError
          ? cause.message
          : "Could not strike off the selected trips"
      )
    }
  }

  /** Same words whether the register is showing as cards or as the spread. */
  const emptyState = (
    <>
      <p className="text-sm font-medium">
        {isError ? "Could not read the daybook" : "No trips found"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {isError
          ? error instanceof ApiError
            ? error.message
            : "Something went wrong reading the register."
          : filtersApplied
            ? "Nothing matches these filters."
            : "The daybook is empty — enter the first trip."}
      </p>
    </>
  )

  const cells = (trip: Trip): React.ReactNode[] => [
    formatDateNumeric(trip.date),
    trip.truckNo,
    trip.partyName,
    trip.brokerName || "—",
    trip.from,
    trip.to,
    trip.goods,
    money(trip.rate),
    trip.weight ? Number(trip.weight.toFixed(3)) : "",
    money(trip.advance),
    money(trip.balance),
    money(trip.toPay),
    formatDateNumeric(trip.receiveDate),
    formatDateNumeric(trip.paidDate),
    trip.lrNo,
    money(trip.commission),
    trip.remarks,
    money(trip.partyPayment),
    money(trip.advanceReceiveRs),
    formatDateNumeric(trip.advanceDate),
    money(trip.balanceReceiveRs),
    formatDateNumeric(trip.balanceDate),
  ]

  return (
    <div className="mx-auto flex w-full max-w-[100rem] flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Trip Register
          </h1>
          <p className="text-sm text-muted-foreground">
            The office daybook — one row per lorry sent out, from the goods it
            carried through to the money settled either side of it
          </p>
        </div>
        <Button onClick={() => setForm({ open: true, editing: null })}>
          <PlusIcon data-icon="inline-start" />
          New trip
        </Button>
      </header>

      {/* This book belongs to neither firm, and saying so once is worth more
          than leaving the reader to work out why the rows do not change. */}
      <p className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <UsersIcon className="mt-px size-3.5 shrink-0" />
        <span>
          One book for both firms. Unlike the L.R., bill and slip books, these
          rows are shared — switching firms in the sidebar shows the same
          register, and a row struck off here is gone for both offices.
        </span>
      </p>

      <TripFilters query={query} onPendingChange={setFiltersPending} />

      <SelectionBar
        count={selection.count}
        noun="trip"
        plural="trips"
        action="Strike off selected"
        pending={removeMany.isPending}
        onClear={selection.clear}
        onDelete={() => setBulkOpen(true)}
      />

      {/* Totals sit above the spread — a footer row 22 columns wide would be
          off the side of the screen the moment anyone scrolled. They are of
          everything the filters match, not of the rows on this page. */}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {(
          [
            [
              "Rows",
              `${formatNumber(meta.total)} of ${formatNumber(meta.bookTotal)}`,
            ],
            ["Freight", formatINR(meta.totals.freight)],
            ["Commission", formatINR(meta.totals.commission)],
            ["Due from parties", formatINR(meta.totals.dueFromParty)],
            ["Due to lorries", formatINR(meta.totals.dueToLorry)],
          ] as const
        ).map(([label, value]) => (
          <Card key={label} className="gap-1 px-3 py-2.5">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm font-semibold tabular-nums">{value}</dd>
          </Card>
        ))}
      </dl>

      {/* The loader covers the ledger in both its shapes — the cards below md
          and the spread above it — so the wrapper wraps them both. It is a
          sibling of each Card rather than a child, because the lorry holds
          itself in view as the clerk scrolls and a Card's `overflow-hidden`
          would stop it. */}
      <div className="relative">
        {/* Below md: one card per trip. See `TripCard` for why the spread does
            not come along. */}
        <div className="flex flex-col gap-3 md:hidden">
          {trips.length === 0 ? (
            <Card className="px-4 py-8 text-center">{emptyState}</Card>
          ) : (
            <>
              {/* The spread puts this box at the top of the tick column. The
                  cards have no header to put it in, so it gets a line of its
                  own — without it a phone can tick rows one at a time and
                  never all of them. */}
              <label className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
                <SelectAllBox
                  selection={selection}
                  label="Select every trip on this page"
                />
                Select all on this page
              </label>

              {trips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  selection={selection}
                  onEdit={() => setForm({ open: true, editing: trip })}
                  onDelete={() => setPendingDelete(trip)}
                />
              ))}
            </>
          )}
        </div>

        <Card
          className="hidden py-0 md:block"
          data-pending={busy ? "" : undefined}
        >
          <Table aria-busy={busy}>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {/* Above the tick column, which belongs to no group. */}
                <TableHead className="w-10" />
                {GROUPS.map(([label, span]) => (
                  <TableHead
                    key={label}
                    colSpan={span}
                    className="border-r text-center text-xs tracking-wide text-muted-foreground uppercase last:border-r-0"
                  >
                    {label}
                  </TableHead>
                ))}
                <TableHead className="w-10" />
              </TableRow>
              <TableRow className="hover:bg-transparent">
                <TableHead
                  ref={tickHead}
                  style={{ left: 0 }}
                  className={cn(stickyCell, "z-20 w-10")}
                >
                  <SelectAllBox
                    selection={selection}
                    label="Select every trip on this page"
                    disabled={trips.length === 0}
                  />
                </TableHead>
                {COLUMNS.map((column, index) => (
                  <TableHead
                    key={column}
                    ref={index === 0 ? dateHead : undefined}
                    style={stickyLeft(index)}
                    className={cn(
                      NUMERIC.has(column) && "text-right",
                      index === 0 && cn(stickyCell, "z-20 w-24"),
                      index === 1 && cn(stickyCell, stickyEdge, "z-20")
                    )}
                  >
                    {column}
                  </TableHead>
                ))}
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {trips.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={COLUMNS.length + 2}
                    className="h-28 text-center"
                  >
                    {emptyState}
                  </TableCell>
                </TableRow>
              ) : (
                trips.map((trip) => (
                  <TableRow
                    key={trip.id}
                    className="group/row"
                    data-state={
                      selection.isSelected(trip.id) ? "selected" : undefined
                    }
                  >
                    <TableCell
                      style={{ left: 0 }}
                      className={cn(stickyCell, "z-10 w-10")}
                    >
                      <SelectRowBox
                        selection={selection}
                        id={trip.id}
                        label={`Select the ${trip.truckNo} trip`}
                      />
                    </TableCell>
                    {cells(trip).map((value, index) => (
                      <TableCell
                        key={COLUMNS[index]}
                        style={stickyLeft(index)}
                        className={cn(
                          NUMERIC.has(COLUMNS[index]) &&
                            "text-right tabular-nums",
                          COLUMNS[index] === "Remarks" &&
                            "max-w-56 truncate text-xs whitespace-normal text-muted-foreground",
                          index === 0 &&
                            cn(stickyCell, "z-10 w-24 tabular-nums"),
                          index === 1 &&
                            cn(stickyCell, stickyEdge, "z-10 font-medium")
                        )}
                        title={
                          COLUMNS[index] === "Remarks" && trip.remarks
                            ? trip.remarks
                            : undefined
                        }
                      >
                        {value}
                      </TableCell>
                    ))}
                    <TableCell>
                      <RowActions
                        trip={trip}
                        onEdit={() => setForm({ open: true, editing: trip })}
                        onDelete={() => setPendingDelete(trip)}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        <TruckLoadingOverlay show={busy} label={busyLabel} />
      </div>

      <TripPagination
        query={query}
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPendingChange={setPagePending}
      />

      <TripFormDialog
        open={form.open}
        onOpenChange={(open) =>
          setForm((f) =>
            open ? { ...f, open } : { open: false, editing: null }
          )
        }
        editing={form.editing}
        onSave={handleSave}
      />

      {/* Its own dialog rather than the one below dressed up: the wording is
          about a set of rows the clerk cannot re-read at this point, so it
          names the count and says what it takes with it. */}
      <AlertDialog
        open={bulkOpen}
        onOpenChange={(open) => {
          if (!open) setBulkOpen(false)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Strike off {selection.count}{" "}
              {selection.count === 1 ? "trip" : "trips"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes{" "}
              {selection.count === 1 ? "the ticked row" : "every ticked row"}{" "}
              from the daybook, and it cannot be undone. Both firms work this
              one book, so it goes for everyone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep them</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={removeMany.isPending}
              onClick={() => void handleBulkDelete()}
            >
              Strike {selection.count === 1 ? "it" : "them"} off
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Strike off the {pendingDelete?.truckNo} trip?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the row for {pendingDelete?.partyName} from the
              daybook, and it cannot be undone. Both firms work this one book,
              so it goes for everyone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => void handleDelete()}
            >
              Strike it off
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
