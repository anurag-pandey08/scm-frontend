import type { Metadata } from "next"

import { TripRegister } from "@/components/trip-register/trip-register"
import { companyFromParams, type CompanyParams } from "@/lib/company-route"

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

export default async function TripsPage({ params }: { params: CompanyParams }) {
  // Resolved only to 404 on a slug we keep no books for, the same as every
  // other page under the segment.
  await companyFromParams(params)

  // Deliberately not keyed on the firm. The other registers are, so switching
  // books remounts them and one firm's edits never bleed into the other's —
  // here there is only one book, and remounting it would throw away work for
  // no reason.
  return <TripRegister />
}
