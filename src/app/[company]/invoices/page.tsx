import type { Metadata } from "next"
import { HydrationBoundary, dehydrate } from "@tanstack/react-query"

import { InvoiceRegister } from "@/components/invoice/invoice-register"
import {
  fetchInvoices,
  invoiceKeys,
  searchParamsToQuery,
} from "@/lib/api/invoices"
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
  return { title: `Invoices — ${company.name}` }
}

/**
 * The bill book, fetched on the server and handed over already filtered.
 *
 * The filters are read off the URL here, not out of the book's memory, so the
 * page the browser is sent is the page that was asked for — a link to
 * "everything still to collect from Shakti Pumps" opens on those bills rather
 * than on the whole book and then narrowing itself.
 *
 * The same query is dehydrated into the cache the book reads from, so its first
 * render is not a request. It stays a client component from there because it is
 * one: filtering, raising, amending and printing are all things done to the
 * book rather than read off it.
 */
export default async function InvoicesPage({
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
      queryKey: invoiceKeys.page(company.slug, query),
      queryFn: () => fetchInvoices(company.slug, query, auth),
    })
    // A book that cannot be reached is not a broken page — the shell, the
    // filters and the letterhead are all still worth rendering, and the client
    // says so in the table and keeps trying.
    .catch(() => undefined)

  // Keyed on the firm so switching books remounts the register rather than
  // carrying one firm's open dialogs into the other's.
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InvoiceRegister key={company.slug} query={query} />
    </HydrationBoundary>
  )
}
