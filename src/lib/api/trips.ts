import { apiFetch, type RequestOptions } from "@/lib/api/client"
import {
  bulkDeleteResultSchema,
  type BulkDeleteResult,
} from "@/lib/schemas/bulk-delete"
import {
  tripDtoSchema,
  tripPageSchema,
  type TripInput,
  type TripPage,
} from "@/lib/schemas/trip"
import type { Trip, TripFilter } from "@/lib/trip-register-types"

/**
 * The office daybook.
 *
 * Nothing here names a company, and nothing should. Every other book in this
 * folder takes a `CompanySlug` as its first argument because there is no
 * register that is not one firm's; the daybook is worked by both firms and
 * both see the same rows, so the path is `/api/trips` and the query key has no
 * firm in it. See the note at the top of `lib/trip-register-types.ts`.
 *
 * Responses are parsed rather than cast, for the reason given in
 * `api/companies.ts`.
 */

/**
 * The filters, as the daybook holds them.
 *
 * They live in the page's URL, so this is also the shape of its search params:
 * a filtered daybook is a link the clerk can send to the next desk, and it
 * survives a reload.
 */
export interface RegisterQuery {
  q: string
  filter: TripFilter
  page: number
  pageSize: number
}

export const DEFAULT_QUERY: RegisterQuery = {
  q: "",
  filter: "all",
  page: 1,
  pageSize: 25,
}

export const tripKeys = {
  all: () => ["trips"] as const,
  /**
   * Keyed on the filters, so each filtered view is cached as its own page —
   * going back to one the clerk has already looked at shows it at once, and
   * only the page they are on is refetched after a save.
   */
  page: (query: RegisterQuery) => [...tripKeys.all(), "page", query] as const,
  detail: (id: string) => [...tripKeys.all(), "detail", id] as const,
}

/** Drops the defaults, so a bare daybook is a bare URL. */
export function queryToSearchParams(query: RegisterQuery): URLSearchParams {
  const params = new URLSearchParams()

  if (query.q) params.set("q", query.q)
  if (query.filter !== "all") params.set("filter", query.filter)
  if (query.page !== 1) params.set("page", String(query.page))
  if (query.pageSize !== DEFAULT_QUERY.pageSize) {
    params.set("pageSize", String(query.pageSize))
  }

  return params
}

const FILTERS: readonly string[] = ["all", "party-owes", "lorry-owed"]

/**
 * Reads the filters off a URL.
 *
 * Anything unreadable falls back to the default rather than erroring: these
 * come off an address bar the clerk can type into, and the worst a nonsense
 * `page=banana` should do is show them page one.
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

  const filter = one("filter")

  return {
    q: one("q"),
    // Narrowed here rather than passed through, because `filter` is a union on
    // this side and a hand-typed one would otherwise reach the Select as a
    // value it has no option for.
    filter: FILTERS.includes(filter) ? (filter as TripFilter) : "all",
    page: digits("page", 1),
    pageSize: digits("pageSize", DEFAULT_QUERY.pageSize),
  }
}

const BOOK_PATH = "/api/trips"

/** One page of the daybook. */
export async function fetchTrips(
  query: RegisterQuery,
  options?: RequestOptions
): Promise<TripPage> {
  const params = queryToSearchParams(query)
  const search = params.size > 0 ? `?${params.toString()}` : ""

  const data = await apiFetch<unknown>(`${BOOK_PATH}${search}`, options)
  return tripPageSchema.parse(data)
}

export async function createTrip(input: TripInput): Promise<Trip> {
  const data = await apiFetch<{ trip: unknown }>(BOOK_PATH, {
    method: "POST",
    body: input,
  })
  return tripDtoSchema.parse(data.trip)
}

export async function updateTrip(id: string, input: TripInput): Promise<Trip> {
  const data = await apiFetch<{ trip: unknown }>(
    `${BOOK_PATH}/${encodeURIComponent(id)}`,
    { method: "PATCH", body: input }
  )
  return tripDtoSchema.parse(data.trip)
}

export async function deleteTrip(id: string): Promise<void> {
  await apiFetch<{ id: string }>(`${BOOK_PATH}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
}

/**
 * The trips the clerk ticked, in one request.
 *
 * A POST with the list in the body rather than a DELETE carrying one, for the
 * reason given on the register's own bulk delete: a DELETE body is allowed by
 * the spec and dropped by plenty of things in front of an API.
 *
 * What comes back is how many rows actually went, which can be short of the
 * list — and rather more easily here than in the other three books, since the
 * desk that struck one off in the meantime need not be in this office.
 */
export async function deleteTrips(ids: string[]): Promise<BulkDeleteResult> {
  const data = await apiFetch<unknown>(`${BOOK_PATH}/bulk-delete`, {
    method: "POST",
    body: { ids },
  })
  return bulkDeleteResultSchema.parse(data)
}
