import type { Metadata } from "next"
import { HydrationBoundary, dehydrate } from "@tanstack/react-query"

import { TripRegister } from "@/components/trip-register/trip-register"
import { fetchTrips, searchParamsToQuery, tripKeys } from "@/lib/api/trips"
import { withAuth } from "@/lib/api/server"
import { companyFromParams, type CompanyParams } from "@/lib/company-route"
import { getQueryClient } from "@/lib/query-client"

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export async function generateMetadata({
  params,
}: {
  params: CompanyParams
}): Promise<Metadata> {
  // The register is shared, but the page still sits inside a firm's chrome, so
  // the tab says which firm's sidebar you are looking at it from.
  const company = await companyFromParams(params)
  return { title: `Trip Register — ${company.name}` }
}

/**
 * The daybook, fetched on the server and handed over already filtered.
 *
 * The filters are read off the URL here, not out of the register's memory, so
 * the page the browser is sent is the page that was asked for — a link to
 * "everything the parties still owe" opens on those rows rather than on the
 * whole book and then narrowing itself.
 *
 * The prefetch takes no firm, unlike every other page under this segment. One
 * book, both offices — see the note at the top of `lib/trip-register-types.ts`.
 */
export default async function TripsPage({
  params,
  searchParams,
}: {
  params: CompanyParams
  searchParams: SearchParams
}) {
  // Resolved only to 404 on a slug we keep no books for, the same as every
  // other page under the segment. Nothing else is taken from it.
  await companyFromParams(params)

  const query = searchParamsToQuery(await searchParams)

  const queryClient = getQueryClient()
  const auth = await withAuth()

  await queryClient
    .prefetchQuery({
      queryKey: tripKeys.page(query),
      queryFn: () => fetchTrips(query, auth),
    })
    // A book that cannot be reached is not a broken page — the shell, the
    // filters and the letterhead are all still worth rendering, and the client
    // says so in the spread and keeps trying.
    .catch(() => undefined)

  // Deliberately not keyed on the firm. The other registers are, so switching
  // books remounts them and one firm's edits never bleed into the other's —
  // here there is only one book, and remounting it would throw away work for
  // no reason.
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TripRegister query={query} />
    </HydrationBoundary>
  )
}
