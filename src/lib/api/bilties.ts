import { z } from "zod"

import { apiFetch, type RequestOptions } from "@/lib/api/client"
import type { CompanySlug } from "@/lib/companies"
import {
  biltyDtoSchema,
  biltyPageSchema,
  type BiltyInput,
  type BiltyPage,
} from "@/lib/schemas/bilty"
import type { Bilty } from "@/lib/types"

/**
 * One firm's L.R. book.
 *
 * Every call names the book it is reading, because there is no register that
 * is not one company's — the same rule the API is built on. Responses are
 * parsed rather than cast, for the reason given in `api/companies.ts`.
 */

/**
 * The filters, as the register holds them.
 *
 * They live in the page's URL, so this is also the shape of its search params:
 * a filtered register is a link the clerk can send to the next desk, and it
 * survives a reload.
 */
export interface RegisterQuery {
  q: string
  status: string
  payment: string
  page: number
  pageSize: number
}

export const DEFAULT_QUERY: RegisterQuery = {
  q: "",
  status: "all",
  payment: "all",
  page: 1,
  pageSize: 25,
}

export const biltyKeys = {
  all: (company: string) => ["bilties", company] as const,
  /**
   * Keyed on the filters as well as the firm, so each filtered view is cached
   * as its own page — going back to one the clerk has already looked at shows
   * it at once, and only the page they are on is refetched after a save.
   */
  page: (company: string, query: RegisterQuery) =>
    [...biltyKeys.all(company), "page", query] as const,
  detail: (company: string, id: string) =>
    [...biltyKeys.all(company), "detail", id] as const,
  nextLrNo: (company: string) =>
    [...biltyKeys.all(company), "next-lr"] as const,
}

/** Drops the defaults, so a bare register is a bare URL. */
export function queryToSearchParams(query: RegisterQuery): URLSearchParams {
  const params = new URLSearchParams()

  if (query.q) params.set("q", query.q)
  if (query.status !== "all") params.set("status", query.status)
  if (query.payment !== "all") params.set("payment", query.payment)
  if (query.page !== 1) params.set("page", String(query.page))
  if (query.pageSize !== DEFAULT_QUERY.pageSize) {
    params.set("pageSize", String(query.pageSize))
  }

  return params
}

/**
 * Reads the filters off a URL.
 *
 * Anything unreadable falls back to the default rather than erroring: these
 * come off an address bar the clerk can type into, and the worst a nonsense
 * `page=banana` should do is show them page one. A filter the API does not
 * recognise is a different matter, and it says so.
 */
export function searchParamsToQuery(
  params: Record<string, string | string[] | undefined>
): RegisterQuery {
  const one = (key: string): string => {
    const value = params[key]
    return (Array.isArray(value) ? value[0] : value) ?? ""
  }

  const digits = (key: string, fallback: number): number => {
    const parsed = Number(one(key))
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
  }

  return {
    q: one("q"),
    status: one("status") || "all",
    payment: one("payment") || "all",
    page: digits("page", 1),
    pageSize: digits("pageSize", DEFAULT_QUERY.pageSize),
  }
}

function bookPath(company: string): string {
  return `/api/companies/${encodeURIComponent(company)}/bilties`
}

/** One page of a firm's register. */
export async function fetchBilties(
  company: string,
  query: RegisterQuery,
  options?: RequestOptions
): Promise<BiltyPage> {
  const params = queryToSearchParams(query)
  const search = params.size > 0 ? `?${params.toString()}` : ""

  const data = await apiFetch<unknown>(`${bookPath(company)}${search}`, options)
  return biltyPageSchema.parse(data)
}

/** The number a new L.R. should carry — the highest in the book, plus one. */
export async function fetchNextLrNo(
  company: string,
  options?: RequestOptions
): Promise<string> {
  const data = await apiFetch<{ lrNo: unknown }>(
    `${bookPath(company)}/next-lr`,
    options
  )
  return z.string().parse(data.lrNo)
}

export async function createBilty(
  company: CompanySlug,
  input: BiltyInput
): Promise<Bilty> {
  const data = await apiFetch<{ bilty: unknown }>(bookPath(company), {
    method: "POST",
    body: input,
  })
  return biltyDtoSchema.parse(data.bilty)
}

export async function updateBilty(
  company: CompanySlug,
  id: string,
  input: BiltyInput
): Promise<Bilty> {
  const data = await apiFetch<{ bilty: unknown }>(
    `${bookPath(company)}/${encodeURIComponent(id)}`,
    { method: "PATCH", body: input }
  )
  return biltyDtoSchema.parse(data.bilty)
}

export async function deleteBilty(
  company: CompanySlug,
  id: string
): Promise<void> {
  await apiFetch<{ id: string }>(
    `${bookPath(company)}/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  )
}
