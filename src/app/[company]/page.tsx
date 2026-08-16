import { redirect } from "next/navigation"

import { companyFromParams, type CompanyParams } from "@/lib/company-route"

/** A bare firm URL opens on its dashboard. */
export default async function CompanyHome({
  params,
}: {
  params: CompanyParams
}) {
  const company = await companyFromParams(params)
  redirect(`/${company.slug}/dashboard`)
}
