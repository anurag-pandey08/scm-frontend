import { z } from "zod"

import { apiFetch, type RequestOptions } from "@/lib/api/client"
import type { CompanySlug } from "@/lib/companies"
import type { Invoice } from "@/lib/invoice-types"
import {
  bulkDeleteResultSchema,
  type BulkDeleteResult,
} from "@/lib/schemas/bulk-delete"
import {
  invoiceDtoSchema,
  invoicePageSchema,
  type InvoiceInput,
  type InvoicePage,
} from "@/lib/schemas/invoice"

/**
 * One firm's bill book.
 *
 * Every call names the book it is reading, because there is no bill book that
 * is not one company's — the same rule the API is built on. Responses are
 * parsed rather than cast, for the reason given in `api/companies.ts`.
 */

/**
 * The filters, as the bill book holds them.
 *
 * They live in the page's URL, so this is also the shape of its search params:
 * a filtered book is a link the clerk can send to the next desk, and it
 * survives a reload.
 */
export interface BillBookQuery {
  q: string
  status: string
  page: number
  pageSize: number
}

export const DEFAULT_QUERY: BillBookQuery = {
  q: "",
  status: "all",
  page: 1,
  pageSize: 25,
}

export const invoiceKeys = {
  all: (company: string) => ["invoices", company] as const,
  /**
   * Keyed on the filters as well as the firm, so each filtered view is cached
   * as its own page — going back to one the clerk has already looked at shows
   * it at once, and only the page they are on is refetched after a save.
   */
  page: (company: string, query: BillBookQuery) =>
    [...invoiceKeys.all(company), "page", query] as const,
  detail: (company: string, id: string) =>
    [...invoiceKeys.all(company), "detail", id] as const,
  nextBillNo: (company: string) =>
    [...invoiceKeys.all(company), "next-bill"] as const,
}

/** Drops the defaults, so a bare bill book is a bare URL. */
export function queryToSearchParams(query: BillBookQuery): URLSearchParams {
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
): BillBookQuery {
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
  return `/api/companies/${encodeURIComponent(company)}/invoices`
}

/** One page of a firm's bill book. */
export async function fetchInvoices(
  company: string,
  query: BillBookQuery,
  options?: RequestOptions
): Promise<InvoicePage> {
  const params = queryToSearchParams(query)
  const search = params.size > 0 ? `?${params.toString()}` : ""

  const data = await apiFetch<unknown>(`${bookPath(company)}${search}`, options)
  return invoicePageSchema.parse(data)
}

/** The number a new bill should carry — the highest in the book, plus one. */
export async function fetchNextBillNo(
  company: string,
  options?: RequestOptions
): Promise<string> {
  const data = await apiFetch<{ billNo: unknown }>(
    `${bookPath(company)}/next-bill`,
    options
  )
  return z.string().parse(data.billNo)
}

export async function createInvoice(
  company: CompanySlug,
  input: InvoiceInput
): Promise<Invoice> {
  const data = await apiFetch<{ invoice: unknown }>(bookPath(company), {
    method: "POST",
    body: input,
  })
  return invoiceDtoSchema.parse(data.invoice)
}

export async function updateInvoice(
  company: CompanySlug,
  id: string,
  input: InvoiceInput
): Promise<Invoice> {
  const data = await apiFetch<{ invoice: unknown }>(
    `${bookPath(company)}/${encodeURIComponent(id)}`,
    { method: "PATCH", body: input }
  )
  return invoiceDtoSchema.parse(data.invoice)
}

/**
 * The bills the clerk ticked, in one request.
 *
 * A POST with the list in the body rather than a DELETE carrying one, for the
 * reason given on the register's own bulk delete: a DELETE body is allowed by
 * the spec and dropped by plenty of things in front of an API.
 *
 * What comes back is how many rows actually went, which can be short of the
 * list — see `bulkDeleteResultSchema`.
 */
export async function deleteInvoices(
  company: CompanySlug,
  ids: string[]
): Promise<BulkDeleteResult> {
  const data = await apiFetch<unknown>(`${bookPath(company)}/bulk-delete`, {
    method: "POST",
    body: { ids },
  })
  return bulkDeleteResultSchema.parse(data)
}

export async function deleteInvoice(
  company: CompanySlug,
  id: string
): Promise<void> {
  await apiFetch<{ id: string }>(
    `${bookPath(company)}/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  )
}
