import type { Metadata } from "next"

import { CompanySettings } from "@/components/settings/company-settings"
import { companyFromParams, type CompanyParams } from "@/lib/company-route"

export async function generateMetadata({
  params,
}: {
  params: CompanyParams
}): Promise<Metadata> {
  // The printed name, not the edited one — page titles are rendered on the
  // server, which has no sight of what a browser has saved.
  const company = await companyFromParams(params)
  return { title: `Company Settings — ${company.name}` }
}

export default async function SettingsPage({
  params,
}: {
  params: CompanyParams
}) {
  const company = await companyFromParams(params)

  // Keyed on the firm so switching books reloads the form rather than carrying
  // a half-typed letterhead from one firm into the other's.
  return <CompanySettings key={company.slug} />
}
