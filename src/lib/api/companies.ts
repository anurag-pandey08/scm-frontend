import { apiFetch, type RequestOptions } from "@/lib/api/client"
import type { CompanySlug } from "@/lib/companies"
import {
  companySchema,
  type CompanyDto,
  type LetterheadInput,
} from "@/lib/schemas/company"

/**
 * The company endpoints, and the query keys that name them.
 *
 * Every response is parsed rather than cast. The API is a separate repository
 * on a separate deploy cycle, so "it returns a CompanyDto" is a claim that can
 * quietly stop being true; parsing turns that into an error at the boundary,
 * with the field named, instead of a blank line on a printed letterhead.
 */

export const companyKeys = {
  all: ["companies"] as const,
  list: () => [...companyKeys.all, "list"] as const,
  detail: (slug: string) => [...companyKeys.all, "detail", slug] as const,
}

/** Every firm the office keeps books for, in sidebar order. */
export async function fetchCompanies(
  options?: RequestOptions
): Promise<CompanyDto[]> {
  const data = await apiFetch<{ companies: unknown }>("/api/companies", options)
  return companySchema.array().parse(data.companies)
}

/** One firm's letterhead. Throws a 404 `ApiError` on a slug we keep no book for. */
export async function fetchCompany(
  slug: string,
  options?: RequestOptions
): Promise<CompanyDto> {
  const data = await apiFetch<{ company: unknown }>(
    `/api/companies/${encodeURIComponent(slug)}`,
    options
  )
  return companySchema.parse(data.company)
}

/** Saves the letterhead the office typed over the printed one. */
export async function updateLetterhead(
  slug: CompanySlug,
  letterhead: LetterheadInput
): Promise<CompanyDto> {
  const data = await apiFetch<{ company: unknown }>(
    `/api/companies/${encodeURIComponent(slug)}`,
    { method: "PATCH", body: letterhead }
  )
  return companySchema.parse(data.company)
}

/** Puts a firm back to the letterhead transcribed from its own book. */
export async function restoreLetterhead(
  slug: CompanySlug
): Promise<CompanyDto> {
  const data = await apiFetch<{ company: unknown }>(
    `/api/companies/${encodeURIComponent(slug)}/restore`,
    { method: "POST" }
  )
  return companySchema.parse(data.company)
}
