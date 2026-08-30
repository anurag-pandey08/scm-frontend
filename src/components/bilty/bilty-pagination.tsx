"use client"

import { usePathname, useRouter } from "next/navigation"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { queryToSearchParams, type RegisterQuery } from "@/lib/api/bilties"
import { formatNumber } from "@/lib/format"

/**
 * Paging through the register.
 *
 * The page number is in the URL like every other filter, so a clerk can send
 * "page 3 of the Delhi run" and it opens on page 3. There is no "go to page"
 * box: a register is read forwards and backwards from where you are, and the
 * filters are how you get somewhere specific.
 */
export function BiltyPagination({
  query,
  page,
  totalPages,
  total,
}: {
  query: RegisterQuery
  page: number
  totalPages: number
  /** Rows matching the filters, across every page. */
  total: number
}) {
  const router = useRouter()
  const pathname = usePathname()

  function go(to: number) {
    const params = queryToSearchParams({ ...query, page: to })
    const search = params.size > 0 ? `?${params.toString()}` : ""
    router.replace(`${pathname}${search}`)
  }

  const first = (page - 1) * query.pageSize + 1
  const last = Math.min(page * query.pageSize, total)

  // One page of results is not paging — the range below the table would be
  // saying "1 to 12 of 12" beside two buttons that do nothing.
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
