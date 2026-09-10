"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  queryToSearchParams,
  WINDOW_OPTIONS,
  type DashboardQuery,
} from "@/lib/api/dashboard"

/**
 * How far back the dashboard is read.
 *
 * The one control on the screen, and it writes to the address bar rather than
 * to state — the same rule the four registers' filters follow. A dashboard
 * read over a particular stretch is therefore a link, and the server can read
 * the window when it renders the page, which is what lets the first paint
 * arrive over the right period rather than over thirty days and then redraw.
 *
 * `replace` rather than `push`: changing the window is refining one view, not
 * moving to another.
 */
const OPTIONS = WINDOW_OPTIONS.map((days) => ({
  value: String(days),
  label: days === 365 ? "Last 12 months" : `Last ${days} days`,
}))

export function DashboardWindowSelect({
  query,
  onPendingChange,
}: {
  query: DashboardQuery
  /**
   * Told while the new window is on its way, so the page can put its loader
   * up. The wait starts here, not at the query: the URL is changed first and
   * the figures re-read on the server.
   */
  onPendingChange?: (pending: boolean) => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [pending, startTransition] = React.useTransition()

  React.useEffect(() => {
    onPendingChange?.(pending)
    // Leaves the page unblocked rather than stuck behind a loader for a
    // navigation nobody is waiting on any more.
    return () => onPendingChange?.(false)
  }, [pending, onPendingChange])

  function apply(days: number) {
    const params = queryToSearchParams({ ...query, days })
    const search = params.size > 0 ? `?${params.toString()}` : ""

    startTransition(() => router.replace(`${pathname}${search}`))
  }

  return (
    <div className="grid gap-1.5">
      <Label htmlFor="dashboard-window" className="sr-only">
        Reporting window
      </Label>
      <Select
        items={OPTIONS}
        value={String(query.days)}
        onValueChange={(value) => value && apply(Number(value))}
      >
        <SelectTrigger id="dashboard-window" size="sm" className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map(({ value, label }) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
