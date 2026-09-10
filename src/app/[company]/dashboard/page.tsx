import type { Metadata } from "next"
import { HydrationBoundary, dehydrate } from "@tanstack/react-query"

import { DashboardView } from "@/components/dashboard/dashboard-view"
import {
  dashboardKeys,
  fetchDashboard,
  searchParamsToQuery,
} from "@/lib/api/dashboard"
import { withAuth } from "@/lib/api/server"
import { companyFromParams, type CompanyParams } from "@/lib/company-route"
import { getQueryClient } from "@/lib/query-client"

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export async function generateMetadata({
  params,
}: {
  params: CompanyParams
}): Promise<Metadata> {
  const company = await companyFromParams(params)
  return { title: `Dashboard — ${company.name}` }
}

/**
 * One firm's dashboard, read on the server and handed over already counted.
 *
 * The window is read off the URL here, not out of the screen's memory, so the
 * page the browser is sent covers the period that was asked for — a link to
 * the last quarter opens on the last quarter rather than on the last month and
 * then redrawing.
 *
 * The same query is dehydrated into the cache the view reads from, so its
 * first render is not a request. It stays a client component from there for
 * two reasons: the charts are, and a dashboard left open should catch up when
 * the clerk looks back at the tab.
 */
export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: CompanyParams
  searchParams: SearchParams
}) {
  const company = await companyFromParams(params)
  const query = searchParamsToQuery(await searchParams)

  const queryClient = getQueryClient()
  const auth = await withAuth()

  await queryClient
    .prefetchQuery({
      queryKey: dashboardKeys.summary(company.slug, query),
      queryFn: () => fetchDashboard(company.slug, query, auth),
    })
    // A book that cannot be reached is not a broken page — the shell and the
    // window selector are still worth rendering, and the client says so on the
    // screen and keeps trying.
    .catch(() => undefined)

  // Keyed on the firm so switching books remounts the screen rather than
  // showing one firm's figures under the other's letterhead for a frame.
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardView key={company.slug} query={query} />
    </HydrationBoundary>
  )
}
