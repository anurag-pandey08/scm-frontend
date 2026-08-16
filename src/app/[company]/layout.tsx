import { AppShell } from "@/components/app-shell"
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

  return <AppShell company={company}>{children}</AppShell>
}
