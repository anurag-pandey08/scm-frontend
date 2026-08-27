import type { Metadata } from "next"

import { LoadingSlipRegister } from "@/components/loading-slip/loading-slip-register"
import { companyFromParams, type CompanyParams } from "@/lib/company-route"

export async function generateMetadata({
  params,
}: {
  params: CompanyParams
}): Promise<Metadata> {
  const company = await companyFromParams(params)
  return { title: `Loading Slips — ${company.name}` }
}

export default async function LoadingSlipsPage({
  params,
}: {
  params: CompanyParams
}) {
  const company = await companyFromParams(params)

  // Keyed on the firm so switching books remounts the register rather than
  // carrying one firm's edits, filters and open dialogs into the other's.
  return <LoadingSlipRegister key={company.slug} />
}
