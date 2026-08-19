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

/**
 * The first two columns stay put while the rest of the spread scrolls, so a row
 * never loses the date and lorry that identify it. They carry their own
 * background, and follow the row's hover with it.
 *
 * The Date column is pinned to `w-24` so the Truck No. column's `left-24` lands
 * exactly against it — leave the width off and the second column overlaps the
 * first as soon as a date renders narrower than the offset.
 */
const stickyCell =
  "sticky bg-background transition-colors group-hover/row:bg-muted/50"

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
          <Select value={filter} onValueChange={(v) => v && setFilter(v)}>
            <SelectTrigger id="filter-money" className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All rows</SelectItem>
              <SelectItem value="party-owes">Party still owes</SelectItem>
              <SelectItem value="lorry-owed">Lorry still to be paid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtersApplied ? (
          <Button
            variant="ghost"
            onClick={() => {
              setQuery("")
              setFilter("all")
            }}
          >
            Clear
          </Button>
        ) : null}
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

      <Card className="py-0">
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
                  className={cn(
                    NUMERIC.has(column) && "text-right",
                    index === 0 && cn(stickyCell, "left-0 z-20 w-24"),
                    index === 1 && cn(stickyCell, "left-24 z-20 border-r")
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
                  <p className="text-sm font-medium">No trips found</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {filtersApplied
                      ? "Nothing matches these filters."
                      : "The daybook is empty — enter the first trip."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              visible.map((trip) => (
                <TableRow key={trip.id} className="group/row">
                  {cells(trip).map((value, index) => (
                    <TableCell
                      key={COLUMNS[index]}
                      className={cn(
                        NUMERIC.has(COLUMNS[index]) &&
                          "text-right tabular-nums",
                        COLUMNS[index] === "Remarks" &&
                          "max-w-56 truncate text-xs whitespace-normal text-muted-foreground",
                        index === 0 &&
                          cn(stickyCell, "left-0 z-10 w-24 tabular-nums"),
                        index === 1 &&
                          cn(stickyCell, "left-24 z-10 border-r font-medium")
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
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="icon-sm" />}
                        aria-label={`Actions for the ${trip.truckNo} trip`}
                      >
                        <EllipsisIcon />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => openEdit(trip)}>
                          <PencilIcon />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setPendingDelete(trip)}
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
