import type { Metadata } from "next"
import { HydrationBoundary, dehydrate } from "@tanstack/react-query"

import { BiltyRegister } from "@/components/bilty/bilty-register"
import { biltyKeys, fetchBilties, searchParamsToQuery } from "@/lib/api/bilties"
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
  return { title: `Bilty Register — ${company.name}` }
}

/**
 * The register, fetched on the server and handed over already filtered.
 *
 * The filters are read off the URL here, not out of the register's memory, so
 * the page the browser is sent is the page that was asked for — a link to
 * "everything still to collect on the Delhi run" opens on those rows rather
 * than on the whole book and then narrowing itself.
 *
 * The same query is dehydrated into the cache the register reads from, so its
 * first render is not a request. It stays a client component from there
 * because it is one: filtering, booking, amending and printing are all things
 * done to the register rather than read off it.
 */
export default async function BiltyPage({
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
      queryKey: biltyKeys.page(company.slug, query),
      queryFn: () => fetchBilties(company.slug, query, auth),
    })
    // A register that cannot be reached is not a broken page — the shell, the
    // filters and the letterhead are all still worth rendering, and the client
    // says so in the table and keeps trying.
    .catch(() => undefined)

  // Keyed on the firm so switching books remounts the register rather than
  // carrying one firm's open dialogs into the other's.
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BiltyRegister key={company.slug} query={query} />
    </HydrationBoundary>
  )
}
