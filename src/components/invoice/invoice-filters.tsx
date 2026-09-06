"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { SearchIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
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
  DEFAULT_QUERY,
  queryToSearchParams,
  type BillBookQuery,
} from "@/lib/api/invoices"
import { INVOICE_STATUSES } from "@/lib/invoice-types"

/**
 * The filter options, each with the label the closed trigger shows for it.
 * `Select` is handed these as `items` so the trigger can name the choice —
 * without them it falls back to printing the raw value, and "all" is not what
 * the row reads as.
 */
const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  ...INVOICE_STATUSES.map((status) => ({ value: status, label: status })),
]

/** How long the clerk stops typing before the book goes and asks. */
const TYPING_PAUSE_MS = 300

/**
 * The filter row, which writes to the address bar rather than to state.
 *
 * That is the whole design, and it is the register's. The filters are in the
 * URL, so a filtered bill book is a link — "everything still to collect from
 * Shakti Pumps" can be sent to the next desk, bookmarked, or reloaded without
 * losing it — and the server can read the same filters when it renders the
 * page, which is what lets the first paint arrive already filtered.
 *
 * `replace` rather than `push`: setting a filter is refining one view, not
 * moving to another, and pushing would make the back button walk the clerk
 * backwards through every keystroke.
 */
export function InvoiceFilters({
  query,
  onPendingChange,
}: {
  query: BillBookQuery
  /**
   * Told whenever a filter is on its way to the server, so the book can put
   * its loader up. The wait starts here, not at the query: the URL is changed
   * first and the new page fetched on the server, so by the time the book's
   * own query key moves, most of the round trip is already spent.
   */
  onPendingChange?: (pending: boolean) => void
}) {
  const router = useRouter()
  const pathname = usePathname()

  // The search box is typed into far faster than the book can answer, so it
  // holds its own value and pushes it to the URL once the typing stops.
  // Everything else is read straight from the URL.
  const [typed, setTyped] = React.useState(query.q)
  const [pending, startTransition] = React.useTransition()

  // A filter cleared from elsewhere — the Clear button, the back button — has
  // to reach the box, which is not listening to the URL while it is being
  // typed into.
  const [lastQ, setLastQ] = React.useState(query.q)
  if (query.q !== lastQ) {
    setLastQ(query.q)
    setTyped(query.q)
  }

  const apply = React.useCallback(
    (next: Partial<BillBookQuery>) => {
      // Any change to what is being looked at puts the clerk back on page one.
      // Staying on page 4 of a filter that now has two pages shows nothing at
      // all, which reads as "no bills" rather than "wrong page".
      const params = queryToSearchParams({ ...query, ...next, page: 1 })
      const search = params.size > 0 ? `?${params.toString()}` : ""

      startTransition(() => router.replace(`${pathname}${search}`))
    },
    [pathname, query, router]
  )

  // Waits out the pause after the last keystroke, and is cancelled by the next
  // one — so a clerk typing a party name asks once, not nine times.
  React.useEffect(() => {
    if (typed === query.q) return

    const timer = setTimeout(() => apply({ q: typed }), TYPING_PAUSE_MS)
    return () => clearTimeout(timer)
  }, [typed, query.q, apply])

  React.useEffect(() => {
    onPendingChange?.(pending)
    // Leaves the book unblocked rather than stuck behind a loader for a
    // navigation nobody is waiting on any more.
    return () => onPendingChange?.(false)
  }, [pending, onPendingChange])

  const filtersApplied = query.q !== "" || query.status !== "all"

  return (
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
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="filter-status" className="sr-only">
          Status
        </Label>
        <Select
          items={STATUS_FILTERS}
          value={query.status}
          onValueChange={(value) => value && apply({ status: value })}
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
        disabled={!filtersApplied || pending}
        onClick={() => apply(DEFAULT_QUERY)}
      >
        Clear
      </Button>
    </div>
  )
}
