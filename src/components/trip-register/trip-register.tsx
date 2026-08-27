"use client"

import * as React from "react"
import {
  EllipsisIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react"
import { toast } from "sonner"

import { TripFormDialog } from "@/components/trip-register/trip-form-dialog"
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TODAY } from "@/lib/data"
import { formatDateNumeric, formatINR, formatNumber } from "@/lib/format"
import {
  REGISTER_ORIGIN,
  getSeedTrips,
  nextTripId,
} from "@/lib/trip-register-data"
import {
  emptyTrip,
  tripDueFromParty,
  tripFreight,
  tripReceived,
  type Trip,
} from "@/lib/trip-register-types"
import { cn } from "@/lib/utils"

type Filter = "all" | "party-owes" | "lorry-owed"

/**
 * The filter options, each with the label the closed trigger shows for it.
 * `Select` is handed these as `items` so the trigger can name the choice —
 * without them it falls back to printing the raw value, and "party-owes" is not
 * what the row reads as.
 */
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All rows" },
  { value: "party-owes", label: "Party still owes" },
  { value: "lorry-owed", label: "Lorry still to be paid" },
]

function matches(trip: Trip, query: string) {
  if (!query) return true
  const needle = query.trim().toLowerCase()
  return [
    trip.truckNo,
    trip.partyName,
    trip.brokerName,
    trip.from,
    trip.to,
    trip.goods,
    trip.lrNo,
    trip.remarks,
  ].some((field) => field.toLowerCase().includes(needle))
}

const byNewest = (a: Trip, b: Trip) =>
  a.date === b.date ? 0 : a.date < b.date ? 1 : -1

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
  onEdit,
  onDelete,
}: {
  trip: Trip
  onEdit: () => void
  onDelete: () => void
}) {
  const dueFromParty = Math.max(0, tripDueFromParty(trip))
  const dueToLorry = trip.paidDate ? 0 : trip.balance

  return (
    <Card size="sm" className="gap-2.5">
      <div className="flex items-start gap-2 px-3">
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

export function TripRegister() {
  const [trips, setTrips] = React.useState<Trip[]>(() => getSeedTrips())
  const [query, setQuery] = React.useState("")
  const [filter, setFilter] = React.useState<Filter>("all")

  const [form, setForm] = React.useState<{
    open: boolean
    mode: "create" | "edit"
    trip: Trip
  }>(() => ({
    open: false,
    mode: "create",
    trip: emptyTrip(TODAY, REGISTER_ORIGIN),
  }))

  const [pendingDelete, setPendingDelete] = React.useState<Trip | null>(null)

  /**
   * Where the Truck No. column parks. A hard-coded offset only lines up while
   * the Date column happens to be exactly that wide — the table lays itself out
   * from its contents, so the real width drifts with the viewport and leaves
   * either a seam the spread shows through or an overlap that eats the date.
   * Measuring the header cell keeps the two flush at any width.
   */
  const dateHead = React.useRef<HTMLTableCellElement>(null)
  const [dateWidth, setDateWidth] = React.useState(96)

  React.useEffect(() => {
    const cell = dateHead.current
    if (!cell) return
    const observer = new ResizeObserver(() => {
      // Floor it: a sub-pixel overlap hides under the next column, a sub-pixel
      // shortfall is a visible hairline of scrolled text.
      setDateWidth(Math.floor(cell.getBoundingClientRect().width))
    })
    observer.observe(cell)
    return () => observer.disconnect()
  }, [])

  /** `left` for the two pinned columns; every other column scrolls. */
  const stickyLeft = (index: number) =>
    index === 0 ? { left: 0 } : index === 1 ? { left: dateWidth } : undefined

  const visible = React.useMemo(
    () =>
      trips
        .filter((trip) => {
          if (!matches(trip, query)) return false
          if (filter === "party-owes") return tripDueFromParty(trip) > 0
          if (filter === "lorry-owed") return trip.balance > 0 && !trip.paidDate
          return true
        })
        .sort(byNewest),
    [trips, query, filter]
  )

  const totals = React.useMemo(
    () =>
      visible.reduce(
        (acc, trip) => {
          acc.freight += tripFreight(trip)
          acc.commission += trip.commission
          acc.received += tripReceived(trip)
          acc.dueFromParty += Math.max(0, tripDueFromParty(trip))
          if (!trip.paidDate) acc.dueToLorry += trip.balance
          return acc
        },
        {
          freight: 0,
          commission: 0,
          received: 0,
          dueFromParty: 0,
          dueToLorry: 0,
        }
      ),
    [visible]
  )

  function openCreate() {
    setForm({
      open: true,
      mode: "create",
      trip: emptyTrip(TODAY, REGISTER_ORIGIN),
    })
  }

  function openEdit(trip: Trip) {
    // A fresh copy each time, so reopening the same row always reloads it
    // rather than resuming a half-finished draft.
    setForm({ open: true, mode: "edit", trip: structuredClone(trip) })
  }

  function handleSave(saved: Trip) {
    setTrips((current) => {
      const exists = current.some((t) => t.id === saved.id)
      return exists
        ? current.map((t) => (t.id === saved.id ? saved : t))
        : [{ ...saved, id: nextTripId() }, ...current]
    })
    setForm((f) => ({ ...f, open: false }))
    toast.success(
      form.mode === "create"
        ? `Trip ${saved.truckNo} entered`
        : `Trip ${saved.truckNo} updated`
    )
  }

  function handleDelete() {
    const removed = pendingDelete
    if (!removed) return
    setTrips((current) => current.filter((t) => t.id !== removed.id))
    setPendingDelete(null)
    toast.success(`Trip ${removed.truckNo} struck off`, {
      action: {
        label: "Undo",
        onClick: () =>
          setTrips((current) =>
            current.some((t) => t.id === removed.id)
              ? current
              : [removed, ...current]
          ),
      },
    })
  }

  const filtersApplied = query !== "" || filter !== "all"

  /** Same words whether the register is showing as cards or as the spread. */
  const emptyState = (
    <>
      <p className="text-sm font-medium">No trips found</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {filtersApplied
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
        <Button onClick={openCreate}>
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
          register.
        </span>
      </p>

      {/* One filter row above everything it scopes */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid min-w-56 flex-1 gap-1.5">
          <Label htmlFor="search" className="sr-only">
            Search the register
          </Label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="search"
              className="pl-8"
              placeholder="Truck, party, broker, goods, L.R. no., destination…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="filter-money" className="sr-only">
            Outstanding
          </Label>
          <Select
            items={FILTERS}
            value={filter}
            onValueChange={(v) => v && setFilter(v)}
          >
            <SelectTrigger id="filter-money" className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILTERS.map(({ value, label }) => (
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
            setFilter("all")
          }}
        >
          Clear
        </Button>
      </div>

      {/* Totals sit above the spread — a footer row 22 columns wide would be
          off the side of the screen the moment anyone scrolled. */}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {(
          [
            ["Rows", `${visible.length} of ${trips.length}`],
            ["Freight", formatINR(totals.freight)],
            ["Commission", formatINR(totals.commission)],
            ["Due from parties", formatINR(totals.dueFromParty)],
            ["Due to lorries", formatINR(totals.dueToLorry)],
          ] as const
        ).map(([label, value]) => (
          <Card key={label} className="gap-1 px-3 py-2.5">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm font-semibold tabular-nums">{value}</dd>
          </Card>
        ))}
      </dl>

      {/* Below md: one card per trip. See `TripCard` for why the spread does
          not come along. */}
      <div className="flex flex-col gap-3 md:hidden">
        {visible.length === 0 ? (
          <Card className="px-4 py-8 text-center">{emptyState}</Card>
        ) : (
          visible.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onEdit={() => openEdit(trip)}
              onDelete={() => setPendingDelete(trip)}
            />
          ))
        )}
      </div>

      <Card className="hidden py-0 md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
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
            {visible.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={COLUMNS.length + 1}
                  className="h-28 text-center"
                >
                  {emptyState}
                </TableCell>
              </TableRow>
            ) : (
              visible.map((trip) => (
                <TableRow key={trip.id} className="group/row">
                  {cells(trip).map((value, index) => (
                    <TableCell
                      key={COLUMNS[index]}
                      style={stickyLeft(index)}
                      className={cn(
                        NUMERIC.has(COLUMNS[index]) &&
                          "text-right tabular-nums",
                        COLUMNS[index] === "Remarks" &&
                          "max-w-56 truncate text-xs whitespace-normal text-muted-foreground",
                        index === 0 && cn(stickyCell, "z-10 w-24 tabular-nums"),
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
                      onEdit={() => openEdit(trip)}
                      onDelete={() => setPendingDelete(trip)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <TripFormDialog
        open={form.open}
        onOpenChange={(open) => setForm((f) => ({ ...f, open }))}
        mode={form.mode}
        initial={form.trip}
        onSave={handleSave}
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
              Strike off the {pendingDelete?.truckNo} trip?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the row for {pendingDelete?.partyName} from the
              daybook. Both firms work this one book, so it goes for everyone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Strike it off
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
