import type { Metadata } from "next"

import { InvoiceRegister } from "@/components/invoice/invoice-register"
import { companyFromParams, type CompanyParams } from "@/lib/company-route"

export async function generateMetadata({
  params,
}: {
  params: CompanyParams
}): Promise<Metadata> {
  const company = await companyFromParams(params)
  return { title: `Invoices — ${company.name}` }
}

export default async function InvoicesPage({
  params,
}: {
  params: CompanyParams
}) {
  const company = await companyFromParams(params)

  // Keyed on the firm so switching books remounts the register rather than
  // carrying one firm's edits, filters and open dialogs into the other's.
  return <InvoiceRegister key={company.slug} company={company} />
}
