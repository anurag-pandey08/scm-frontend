import { AppShell } from "@/components/app-shell"
import { CompanyProvider } from "@/components/company-provider"
import { COMPANY_SLUGS } from "@/lib/companies"
import { companyFromParams, type CompanyParams } from "@/lib/company-route"

/** Both firms are known up front, so both trees prerender as before. */
export function generateStaticParams() {
  return COMPANY_SLUGS.map((company) => ({ company }))
}

export default async function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: CompanyParams
}) {
  const company = await companyFromParams(params)

  // The firm is resolved here and nowhere below: the provider hands the screens
  // the letterhead as the office has it, which is the printed one until the
  // settings screen says otherwise.
  return (
    <CompanyProvider base={company}>
      <AppShell>{children}</AppShell>
    </CompanyProvider>
  )
}
