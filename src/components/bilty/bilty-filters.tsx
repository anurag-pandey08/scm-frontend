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
  type RegisterQuery,
} from "@/lib/api/bilties"
import { BILTY_STATUSES, PAYMENT_TYPES } from "@/lib/types"

const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  ...BILTY_STATUSES.map((status) => ({ value: status, label: status })),
]

const PAYMENT_FILTERS = [
  { value: "all", label: "All terms" },
  ...PAYMENT_TYPES.map((type) => ({ value: type, label: type })),
]

/** How long the clerk stops typing before the register goes and asks. */
const TYPING_PAUSE_MS = 300

/**
 * The filter row, which writes to the address bar rather than to state.
 *
 * That is the whole design. The filters are in the URL, so a filtered register
 * is a link — "everything still to collect on the Delhi run" can be sent to the
 * next desk, bookmarked, or reloaded without losing it — and the server can
 * read the same filters when it renders the page, which is what lets the first
 * paint arrive already filtered instead of filtering itself afterwards.
 *
 * `replace` rather than `push`: setting a filter is refining one view, not
 * moving to another, and pushing would make the back button walk the clerk
 * backwards through every keystroke.
 */
export function BiltyFilters({ query }: { query: RegisterQuery }) {
  const router = useRouter()
  const pathname = usePathname()

  // The search box is typed into far faster than the register can answer, so
  // it holds its own value and pushes it to the URL once the typing stops.
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
    (next: Partial<RegisterQuery>) => {
      // Any change to what is being looked at puts the clerk back on page one.
      // Staying on page 4 of a filter that now has two pages shows nothing at
      // all, which reads as "no bilties" rather than "wrong page".
      const params = queryToSearchParams({ ...query, ...next, page: 1 })
      const search = params.size > 0 ? `?${params.toString()}` : ""

      startTransition(() => router.replace(`${pathname}${search}`))
    },
    [pathname, query, router]
  )

  // Waits out the pause after the last keystroke, and is cancelled by the next
  // one — so a clerk typing "Bengaluru" asks once, not nine times.
  React.useEffect(() => {
    if (typed === query.q) return

    const timer = setTimeout(() => apply({ q: typed }), TYPING_PAUSE_MS)
    return () => clearTimeout(timer)
  }, [typed, query.q, apply])

  const filtersApplied =
    query.q !== "" || query.status !== "all" || query.payment !== "all"

  return (
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

      <div className="grid gap-1.5">
        <Label htmlFor="filter-payment" className="sr-only">
          Freight terms
        </Label>
        <Select
          items={PAYMENT_FILTERS}
          value={query.payment}
          onValueChange={(value) => value && apply({ payment: value })}
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
        disabled={!filtersApplied || pending}
        onClick={() => apply(DEFAULT_QUERY)}
      >
        Clear
      </Button>
    </div>
  )
}
