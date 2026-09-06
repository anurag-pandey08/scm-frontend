"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  queryToSearchParams,
  type SlipBookQuery,
} from "@/lib/api/loading-slips"
import { formatNumber } from "@/lib/format"

/**
 * Paging through the slip book.
 *
 * The page number is in the URL like every other filter, so a clerk can send
 * "page 3 of the issued slips" and it opens on page 3. There is no "go to
 * page" box: a book is read forwards and backwards from where you are, and the
 * filters are how you get somewhere specific.
 */
export function LoadingSlipPagination({
  query,
  page,
  totalPages,
  total,
  onPendingChange,
}: {
  query: SlipBookQuery
  page: number
  totalPages: number
  /** Slips matching the filters, across every page. */
  total: number
  /** Told while the next page is being fetched, so the book can say so. */
  onPendingChange?: (pending: boolean) => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [pending, startTransition] = React.useTransition()

  React.useEffect(() => {
    onPendingChange?.(pending)
    // This row disappears entirely once a filter narrows the book to a single
    // page, which can happen mid-navigation — without this the book would be
    // left waiting on a page turn that no longer exists.
    return () => onPendingChange?.(false)
  }, [pending, onPendingChange])

  function go(to: number) {
    const params = queryToSearchParams({ ...query, page: to })
    const search = params.size > 0 ? `?${params.toString()}` : ""
    startTransition(() => router.replace(`${pathname}${search}`))
  }

  const first = (page - 1) * query.pageSize + 1
  const last = Math.min(page * query.pageSize, total)

  // One page of results is not paging — the range below the table would be
  // saying "1 to 8 of 8" beside two buttons that do nothing.
  if (totalPages <= 1) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground tabular-nums">
        {formatNumber(first)}–{formatNumber(last)} of {formatNumber(total)}
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => go(page - 1)}
        >
          <ChevronLeftIcon data-icon="inline-start" />
          Previous
        </Button>
        <p className="text-xs text-muted-foreground tabular-nums">
          Page {formatNumber(page)} of {formatNumber(totalPages)}
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => go(page + 1)}
        >
          Next
          <ChevronRightIcon data-icon="inline-end" />
        </Button>
      </div>
    </div>
  )
}
