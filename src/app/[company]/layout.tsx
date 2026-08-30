import { notFound } from "next/navigation"
import { HydrationBoundary, dehydrate } from "@tanstack/react-query"

import { AppShell } from "@/components/app-shell"
import { CompanyProvider } from "@/components/company-provider"
import { ApiError } from "@/lib/api/client"
import { companyKeys, fetchCompanies, fetchCompany } from "@/lib/api/companies"
import { withAuth } from "@/lib/api/server"
import {
  COMPANIES,
  COMPANY_LIST,
  COMPANY_SLUGS,
  isCompanySlug,
} from "@/lib/companies"
import { getQueryClient } from "@/lib/query-client"
import { printedCompany, type CompanyDto } from "@/lib/schemas/company"

/** Both firms are known up front, so both trees are routable without a fetch. */
export function generateStaticParams() {
  return COMPANY_SLUGS.map((company) => ({ company }))
}

/**
 * Resolves the firm once, here, and hands the rest of the tree two things: the
 * letterhead to render before anything has loaded, and a query cache already
 * holding the real one.
 *
 * The fetch happens on the server so the first paint is the firm's actual
 * details rather than a spinner or the printed fallback — the screens below
 * read them out of the hydrated cache without a second request.
 */
export default async function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ company: string }>
}) {
  const { company: slug } = await params

  // Checked against the slugs we keep books for before anything is fetched, so
  // a made-up URL is a 404 rather than a round trip that ends in one.
  if (!isCompanySlug(slug)) notFound()

  const queryClient = getQueryClient()
  const auth = await withAuth()

  // The switcher needs both firms and the screens need this one. Started
  // together rather than in sequence — neither waits on the other.
  const [company] = await Promise.all([
    loadCompany(slug, auth),
    queryClient
      .prefetchQuery({
        queryKey: companyKeys.list(),
        queryFn: () => fetchCompanies(auth),
      })
      // The list is only the switcher's; a page that renders without it is
      // still a working page, so a failure here is not the layout's problem.
      .catch(() => undefined),
  ])

  queryClient.setQueryData(companyKeys.detail(slug), company)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CompanyProvider
        slug={slug}
        printed={printedCompany(COMPANIES[slug])}
        printedList={COMPANY_LIST.map(printedCompany)}
      >
        <AppShell>{children}</AppShell>
      </CompanyProvider>
    </HydrationBoundary>
  )
}

/**
 * The firm as the API has it, or as its book has it when the API cannot be
 * reached.
 *
 * The fallback is the point. This app is installed on a desk that loses its
 * line, and a clerk who cannot reach the server should still see the register
 * rather than an error page — the letterhead they get is the printed one,
 * which is what the paper in front of them says anyway. A 404 is different:
 * that is the URL being wrong, and no fallback makes it right.
 */
async function loadCompany(
  slug: keyof typeof COMPANIES,
  auth: Awaited<ReturnType<typeof withAuth>>
): Promise<CompanyDto> {
  try {
    return await fetchCompany(slug, auth)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound()
    return printedCompany(COMPANIES[slug])
  }
}
