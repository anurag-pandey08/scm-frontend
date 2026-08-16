import { notFound } from "next/navigation"

import { findCompany, type Company } from "./companies"

/** The shape every page and layout under `app/[company]` is handed. */
export type CompanyParams = Promise<{ company: string }>

/**
 * Resolves the `[company]` segment of the URL to a firm, and 404s on a slug we
 * keep no book for. Every page under the segment goes through here, so no
 * screen can ever render against a firm that does not exist.
 */
export async function companyFromParams(
  params: CompanyParams
): Promise<Company> {
  const { company } = await params
  return findCompany(company) ?? notFound()
}
