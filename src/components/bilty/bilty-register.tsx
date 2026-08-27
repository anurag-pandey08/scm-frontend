"use client"

import * as React from "react"
import {
  EllipsisIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  ScrollTextIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { PaymentBadge, StatusBadge } from "@/components/bilty/badges"
import { BiltyDetailSheet } from "@/components/bilty/bilty-detail-sheet"
import { BiltyFormDialog } from "@/components/bilty/bilty-form-dialog"
import { BiltyLrDialog } from "@/components/bilty/bilty-lr-dialog"
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
import { getSeedBilties, nextLrNo, TODAY } from "@/lib/data"
import { formatDate, formatINR, formatNumber } from "@/lib/format"
import {
  BILTY_STATUSES,
  PAYMENT_TYPES,
  balanceDue,
  emptyBilty,
  grossTotal,
  type Bilty,
  type BiltyStatus,
  type PaymentType,
} from "@/lib/types"

type StatusFilter = BiltyStatus | "all"
type PaymentFilter = PaymentType | "all"

/**
 * The filter options, each with the label the closed trigger shows for it.
 * `Select` is handed these as `items` so the trigger can name the choice —
 * without them it falls back to printing the raw value, and "all" is not
 * what the row reads as.
 */
const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  ...BILTY_STATUSES.map((status) => ({ value: status, label: status })),
]

const PAYMENT_FILTERS: { value: PaymentFilter; label: string }[] = [
  { value: "all", label: "All terms" },
  ...PAYMENT_TYPES.map((type) => ({ value: type, label: type })),
]

function matches(bilty: Bilty, query: string) {
  if (!query) return true
  const needle = query.trim().toLowerCase()
  return [
    bilty.lrNo,
    bilty.lorryNo,
    bilty.from,
    bilty.to,
    bilty.consignor.name,
    bilty.consignee.name,
    bilty.contents,
    bilty.invoiceNo,
    bilty.eWayBillNo,
  ].some((field) => field.toLowerCase().includes(needle))
}

const byNewest = (a: Bilty, b: Bilty) =>
  a.lrDate === b.lrDate
    ? Number(b.lrNo) - Number(a.lrNo)
    : a.lrDate < b.lrDate
      ? 1
      : -1

export function BiltyRegister() {
  // Defaults for a fresh L.R. come off whichever firm's book is open, and
  // follow the letterhead if the office edits it.
  const company = useCompany()

  const blank = React.useCallback(
    (lrNo: string) =>
      emptyBilty(lrNo, TODAY, {
        from: company.origin,
        bookingOffice: company.bookingOffices[0],
      }),
    [company]
  )

  const [bilties, setBilties] = React.useState<Bilty[]>(() =>
    getSeedBilties(company.slug)
  )
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState<StatusFilter>("all")
  const [payment, setPayment] = React.useState<PaymentFilter>("all")

  const [form, setForm] = React.useState<{
    open: boolean
    mode: "create" | "edit"
    bilty: Bilty
  }>(() => ({ open: false, mode: "create", bilty: blank("") }))

  const [detail, setDetail] = React.useState<Bilty | null>(null)
  const [detailOpen, setDetailOpen] = React.useState(false)
  const [lr, setLr] = React.useState<Bilty | null>(null)
  const [lrOpen, setLrOpen] = React.useState(false)
  const [pendingDelete, setPendingDelete] = React.useState<Bilty | null>(null)

  const visible = React.useMemo(
    () =>
      bilties
        .filter(
          (b) =>
            matches(b, query) &&
            (status === "all" || b.status === status) &&
            (payment === "all" || b.paymentType === payment)
        )
        .sort(byNewest),
    [bilties, query, status, payment]
  )

  const totals = React.useMemo(
    () =>
      visible.reduce(
        (acc, b) => {
          if (b.status === "Cancelled") return acc
          acc.gross += grossTotal(b.charges)
          acc.balance += balanceDue(b.charges)
          return acc
        },
        { gross: 0, balance: 0 }
      ),
    [visible]
  )

  const takenLrNos = React.useMemo(
    () => bilties.filter((b) => b.id !== form.bilty.id).map((b) => b.lrNo),
    [bilties, form.bilty.id]
  )

  function openCreate() {
    setForm({
      open: true,
      mode: "create",
      bilty: blank(nextLrNo(company.slug, bilties)),
    })
  }

  function openEdit(bilty: Bilty) {
    // A fresh copy each time, so reopening the same record always reloads it
    // rather than resuming a half-finished draft.
    setForm({ open: true, mode: "edit", bilty: structuredClone(bilty) })
  }

  function openDetail(bilty: Bilty) {
    setDetail(bilty)
    setDetailOpen(true)
  }

  function openLr(bilty: Bilty) {
    setLr(bilty)
    setLrOpen(true)
  }

  function handleSave(saved: Bilty) {
    setBilties((current) => {
      const exists = current.some((b) => b.id === saved.id)
      return exists
        ? current.map((b) => (b.id === saved.id ? saved : b))
        : [saved, ...current]
    })
    setForm((f) => ({ ...f, open: false }))
    toast.success(
      form.mode === "create"
        ? `Bilty ${saved.lrNo} saved`
        : `Bilty ${saved.lrNo} updated`
    )
  }

  function handleDelete() {
    const removed = pendingDelete
    if (!removed) return
    setBilties((current) => current.filter((b) => b.id !== removed.id))
    setPendingDelete(null)
    toast.success(`Bilty ${removed.lrNo} deleted`, {
      action: {
        label: "Undo",
        onClick: () =>
          setBilties((current) =>
            current.some((b) => b.id === removed.id)
              ? current
              : [removed, ...current]
          ),
      },
    })
  }

  const filtersApplied = query !== "" || status !== "all" || payment !== "all"

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
        <Button onClick={openCreate}>
          <PlusIcon data-icon="inline-start" />
          New bilty
        </Button>
      </header>

      {/* One filter row above everything it scopes */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid min-w-56 flex-1 gap-1.5">
          <Label htmlFor="search" className="sr-only">
            Search bilties
          </Label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="search"
              className="pl-8"
              placeholder="L.R. no., party, lorry, destination, e-way bill…"
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

        <div className="grid gap-1.5">
          <Label htmlFor="filter-payment" className="sr-only">
            Freight terms
          </Label>
          <Select
            items={PAYMENT_FILTERS}
            value={payment}
            onValueChange={(v) => v && setPayment(v)}
          >
            <SelectTrigger id="filter-payment" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_FILTERS.map(({ value, label }) => (
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
            setPayment("all")
          }}
        >
          Clear
        </Button>
      </div>

      <Card className="py-0">
        <Table>
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
            {visible.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={10} className="h-28 text-center">
                  <p className="text-sm font-medium">No bilties found</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {filtersApplied
                      ? "Nothing matches these filters."
                      : "The register is empty — book the first bilty."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              visible.map((bilty) => (
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
                        <DropdownMenuItem onClick={() => openLr(bilty)}>
                          <ScrollTextIcon />
                          View bilty
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openDetail(bilty)}>
                          <EyeIcon />
                          Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(bilty)}>
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

          {visible.length > 0 ? (
            <TableFooter>
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8}>
                  {visible.length} of {bilties.length} bilties · balance to
                  collect{" "}
                  <span className="tabular-nums">
                    {formatINR(totals.balance)}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatINR(totals.gross)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          ) : null}
        </Table>
      </Card>

      <BiltyFormDialog
        open={form.open}
        onOpenChange={(open) => setForm((f) => ({ ...f, open }))}
        mode={form.mode}
        initial={form.bilty}
        company={company}
        takenLrNos={takenLrNos}
        onSave={handleSave}
      />

      <BiltyLrDialog
        bilty={lr}
        company={company}
        open={lrOpen}
        onOpenChange={setLrOpen}
        onEdit={openEdit}
      />

      <BiltyDetailSheet
        bilty={detail}
        company={company}
        open={detailOpen}
        onOpenChange={setDetailOpen}
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
              Delete bilty {pendingDelete?.lrNo}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the entry for {pendingDelete?.consignor.name} to{" "}
              {pendingDelete?.to} from the register. If the consignment was
              actually called off, mark it Cancelled instead so the L.R.
              numbering stays unbroken.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Delete bilty
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
