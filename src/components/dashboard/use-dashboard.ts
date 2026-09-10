"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import {
  dashboardKeys,
  fetchDashboard,
  type DashboardQuery,
} from "@/lib/api/dashboard"
import type { CompanySlug } from "@/lib/companies"

/**
 * The dashboard's data, as a hook.
 *
 * One query and no mutations — the screen is a reading of the book. What it
 * reads has already been fetched on the server and handed over in the
 * dehydrated cache, so the first render is not a request.
 *
 * It is a query rather than a plain server-side `await` for two reasons worth
 * naming: the shared client refetches on window focus, so a dashboard left
 * open on a second monitor catches up when the clerk looks back at it; and a
 * book that cannot be reached becomes an error state on the page rather than
 * a thrown render.
 */
export function useDashboard(company: CompanySlug, query: DashboardQuery) {
  return useQuery({
    queryKey: dashboardKeys.summary(company, query),
    queryFn: () => fetchDashboard(company, query),
    // Without this the tiles and both charts blank out while a wider window
    // loads, and the whole screen jumps. The old figures stay up until the new
    // ones land; the loader says they are being replaced.
    placeholderData: keepPreviousData,
  })
}
