import { z } from "zod"

import { apiFetch, type RequestOptions } from "@/lib/api/client"
import type { CompanySlug } from "@/lib/companies"
import type { LoadingSlip } from "@/lib/loading-slip-types"
import {
  loadingSlipDtoSchema,
  loadingSlipPageSchema,
  type LoadingSlipInput,
  type LoadingSlipPage,
} from "@/lib/schemas/loading-slip"

/**
 * One firm's slip book.
 *
 * Every call names the book it is reading, because there is no slip book that
 * is not one company's — the same rule the API is built on. Responses are
 * parsed rather than cast, for the reason given in `api/companies.ts`.
 */

/**
 * The filters, as the slip book holds them.
 *
 * They live in the page's URL, so this is also the shape of its search params:
 * a filtered book is a link the clerk can send to the next desk, and it
 * survives a reload.
 */
export interface SlipBookQuery {
  q: string
  status: string
  page: number
  pageSize: number
}

export const DEFAULT_QUERY: SlipBookQuery = {
  q: "",
  status: "all",
  page: 1,
  pageSize: 25,
}

export const loadingSlipKeys = {
  all: (company: string) => ["loading-slips", company] as const,
  /**
   * Keyed on the filters as well as the firm, so each filtered view is cached
   * as its own page — going back to one the clerk has already looked at shows
   * it at once, and only the page they are on is refetched after a save.
   */
  page: (company: string, query: SlipBookQuery) =>
    [...loadingSlipKeys.all(company), "page", query] as const,
  detail: (company: string, id: string) =>
    [...loadingSlipKeys.all(company), "detail", id] as const,
  nextSlipNo: (company: string) =>
    [...loadingSlipKeys.all(company), "next-slip"] as const,
}

/** Drops the defaults, so a bare slip book is a bare URL. */
export function queryToSearchParams(query: SlipBookQuery): URLSearchParams {
  const params = new URLSearchParams()

  if (query.q) params.set("q", query.q)
  if (query.status !== "all") params.set("status", query.status)
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
 * `page=banana` should do is show them page one.
 */
export function searchParamsToQuery(
  params: Record<string, string | string[] | undefined>
): SlipBookQuery {
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
    page: digits("page", 1),
    pageSize: digits("pageSize", DEFAULT_QUERY.pageSize),
  }
}

function bookPath(company: string): string {
  return `/api/companies/${encodeURIComponent(company)}/loading-slips`
}

/** One page of a firm's slip book. */
export async function fetchLoadingSlips(
  company: string,
  query: SlipBookQuery,
  options?: RequestOptions
): Promise<LoadingSlipPage> {
  const params = queryToSearchParams(query)
  const search = params.size > 0 ? `?${params.toString()}` : ""

  const data = await apiFetch<unknown>(`${bookPath(company)}${search}`, options)
  return loadingSlipPageSchema.parse(data)
}

/** The number a new slip should carry — the highest in the book, plus one. */
export async function fetchNextSlipNo(
  company: string,
  options?: RequestOptions
): Promise<string> {
  const data = await apiFetch<{ slipNo: unknown }>(
    `${bookPath(company)}/next-slip`,
    options
  )
  return z.string().parse(data.slipNo)
}

export async function createLoadingSlip(
  company: CompanySlug,
  input: LoadingSlipInput
): Promise<LoadingSlip> {
  const data = await apiFetch<{ slip: unknown }>(bookPath(company), {
    method: "POST",
    body: input,
  })
  return loadingSlipDtoSchema.parse(data.slip)
}

export async function updateLoadingSlip(
  company: CompanySlug,
  id: string,
  input: LoadingSlipInput
): Promise<LoadingSlip> {
  const data = await apiFetch<{ slip: unknown }>(
    `${bookPath(company)}/${encodeURIComponent(id)}`,
    { method: "PATCH", body: input }
  )
  return loadingSlipDtoSchema.parse(data.slip)
}

export async function deleteLoadingSlip(
  company: CompanySlug,
  id: string
): Promise<void> {
  await apiFetch<{ id: string }>(
    `${bookPath(company)}/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  )
}
