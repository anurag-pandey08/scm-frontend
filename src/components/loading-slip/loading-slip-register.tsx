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

import { LoadingSlipStatusBadge } from "@/components/loading-slip/badges"
import { LoadingSlipDialog } from "@/components/loading-slip/loading-slip-dialog"
import { LoadingSlipFormDialog } from "@/components/loading-slip/loading-slip-form-dialog"
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
import { getSeedLoadingSlips, nextSlipNo } from "@/lib/loading-slip-data"
import {
  LOADING_SLIP_STATUSES,
  emptyLoadingSlip,
  slipBalance,
  type LoadingSlip,
  type LoadingSlipStatus,
} from "@/lib/loading-slip-types"

type StatusFilter = LoadingSlipStatus | "all"

function matches(slip: LoadingSlip, query: string) {
  if (!query) return true
  const needle = query.trim().toLowerCase()
  return [
    slip.slipNo,
    slip.party,
    slip.vehicleNo,
    slip.from,
    slip.to,
    slip.remarks,
  ].some((field) => field.toLowerCase().includes(needle))
}

const byNewest = (a: LoadingSlip, b: LoadingSlip) =>
  a.slipDate === b.slipDate
    ? Number(b.slipNo) - Number(a.slipNo)
    : a.slipDate < b.slipDate
      ? 1
      : -1

export function LoadingSlipRegister({ company }: { company: Company }) {
  const [slips, setSlips] = React.useState<LoadingSlip[]>(() =>
    getSeedLoadingSlips(company.slug)
  )
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState<StatusFilter>("all")

  const [form, setForm] = React.useState<{
    open: boolean
    mode: "create" | "edit"
    slip: LoadingSlip
  }>(() => ({
    open: false,
    mode: "create",
    slip: emptyLoadingSlip("", TODAY, company.origin),
  }))

  const [viewing, setViewing] = React.useState<LoadingSlip | null>(null)
  const [viewOpen, setViewOpen] = React.useState(false)
  const [pendingDelete, setPendingDelete] = React.useState<LoadingSlip | null>(
    null
  )

  const visible = React.useMemo(
    () =>
      slips
        .filter(
          (s) => matches(s, query) && (status === "all" || s.status === status)
        )
        .sort(byNewest),
    [slips, query, status]
  )

  const totals = React.useMemo(
    () =>
      visible.reduce(
        (acc, slip) => {
          if (slip.status === "Cancelled") return acc
          acc.hire += slip.totalFreight
          acc.advance += slip.advance
          acc.balance += slipBalance(slip)
          return acc
        },
        { hire: 0, advance: 0, balance: 0 }
      ),
    [visible]
  )

  const takenSlipNos = React.useMemo(
    () => slips.filter((s) => s.id !== form.slip.id).map((s) => s.slipNo),
    [slips, form.slip.id]
  )

  function openCreate() {
    setForm({
      open: true,
      mode: "create",
      slip: emptyLoadingSlip(
        nextSlipNo(company.slug, slips),
        TODAY,
        company.origin
      ),
    })
  }

  function openEdit(slip: LoadingSlip) {
    // A fresh copy each time, so reopening the same record always reloads it
    // rather than resuming a half-finished draft.
    setForm({ open: true, mode: "edit", slip: structuredClone(slip) })
  }

  function openSlip(slip: LoadingSlip) {
    setViewing(slip)
    setViewOpen(true)
  }

  function handleSave(saved: LoadingSlip) {
    setSlips((current) => {
      const exists = current.some((s) => s.id === saved.id)
      return exists
        ? current.map((s) => (s.id === saved.id ? saved : s))
        : [saved, ...current]
    })
    setForm((f) => ({ ...f, open: false }))
    toast.success(
      form.mode === "create"
        ? `Slip ${saved.slipNo} saved`
        : `Slip ${saved.slipNo} updated`
    )
  }

  function handleDelete() {
    const removed = pendingDelete
    if (!removed) return
    setSlips((current) => current.filter((s) => s.id !== removed.id))
    setPendingDelete(null)
    toast.success(`Slip ${removed.slipNo} deleted`, {
      action: {
        label: "Undo",
        onClick: () =>
          setSlips((current) =>
            current.some((s) => s.id === removed.id)
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
          <h1 className="text-xl font-semibold tracking-tight">
            Loading Slips
          </h1>
          <p className="text-sm text-muted-foreground">
            Lorries placed against a party&apos;s order — write the slip, print
            it off the book and send it with the driver
          </p>
        </div>
        <Button onClick={openCreate}>
          <PlusIcon data-icon="inline-start" />
          New slip
        </Button>
      </header>

      {/* One filter row above everything it scopes */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid min-w-56 flex-1 gap-1.5">
          <Label htmlFor="search" className="sr-only">
            Search slips
          </Label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="search"
              className="pl-8"
              placeholder="Slip no., party, lorry, destination…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="filter-status" className="sr-only">
            Status
          </Label>
          <Select value={status} onValueChange={(v) => v && setStatus(v)}>
            <SelectTrigger id="filter-status" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {LOADING_SLIP_STATUSES.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtersApplied ? (
          <Button
            variant="ghost"
            onClick={() => {
              setQuery("")
              setStatus("all")
            }}
          >
            Clear
          </Button>
        ) : null}
      </div>

      <Card className="py-0">
        <Table>
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
            {visible.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={9} className="h-28 text-center">
                  <p className="text-sm font-medium">No loading slips found</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {filtersApplied
                      ? "Nothing matches these filters."
                      : "The slip book is empty — write the first slip."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              visible.map((slip) => (
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
                        <DropdownMenuItem onClick={() => openSlip(slip)}>
                          <FileTextIcon />
                          View slip
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(slip)}>
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

          {visible.length > 0 ? (
            <TableFooter>
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6}>
                  {visible.length} of {slips.length} slips · advanced{" "}
                  <span className="tabular-nums">
                    {formatINR(totals.advance)}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatINR(totals.hire)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatINR(totals.balance)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          ) : null}
        </Table>
      </Card>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <PrinterIcon className="size-3.5" />
        Open a slip to print it — the sheet goes to the printer on its own, with
        the app around it left off the page.
      </p>

      <LoadingSlipFormDialog
        open={form.open}
        onOpenChange={(open) => setForm((f) => ({ ...f, open }))}
        mode={form.mode}
        initial={form.slip}
        takenSlipNos={takenSlipNos}
        onSave={handleSave}
      />

      <LoadingSlipDialog
        slip={viewing}
        company={company}
        open={viewOpen}
        onOpenChange={setViewOpen}
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
              Delete slip {pendingDelete?.slipNo}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the slip written for {pendingDelete?.party} from the
              book. If the slip already went out with a driver and the trip then
              fell through, mark it Cancelled instead so the numbering stays
              unbroken.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Delete slip
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
