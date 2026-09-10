import { apiFetch, type RequestOptions } from "@/lib/api/client"
import { dashboardDtoSchema, type DashboardDto } from "@/lib/schemas/dashboard"

/**
 * One firm's dashboard.
 *
 * Every figure is that firm's, taken from that firm's book — the same rule the
 * register is built on, so the call names the firm like every other read here.
 * Responses are parsed rather than cast, for the reason given in
 * `api/companies.ts`.
 *
 * One GET and nothing else. The screen is a reading of the book; nothing on it
 * writes, so there are no mutations in this file and no keys for them.
 */

/**
 * How far back the figures are read.
 *
 * A parameter rather than a constant because the figures are only ever true of
 * a period — "booked", "still to collect" and "on the road" all mean nothing
 * without one, which is why the header prints the window. It lives in the URL
 * like every other filter in the app, so a dashboard read over a particular
 * stretch is a link.
 */
export interface DashboardQuery {
  days: number
}

export const DEFAULT_QUERY: DashboardQuery = { days: 30 }

/** The windows the selector offers. Capped at a year, as the API is. */
export const WINDOW_OPTIONS = [7, 30, 60, 90, 180, 365] as const

export const dashboardKeys = {
  all: (company: string) => ["dashboard", company] as const,
  summary: (company: string, query: DashboardQuery) =>
    [...dashboardKeys.all(company), "summary", query] as const,
}

/** Drops the default, so the usual dashboard is a bare URL. */
export function queryToSearchParams(query: DashboardQuery): URLSearchParams {
  const params = new URLSearchParams()

  if (query.days !== DEFAULT_QUERY.days) {
    params.set("days", String(query.days))
  }

  return params
}

/**
 * Reads the window off a URL.
 *
 * Anything unreadable falls back to thirty days rather than erroring: this
 * comes off an address bar the clerk can type into, and the worst a nonsense
 * `days=banana` should do is show them the usual month.
 */
export function searchParamsToQuery(
  params: Record<string, string | string[] | undefined>
): DashboardQuery {
  const raw = params.days
  const value = Number((Array.isArray(raw) ? raw[0] : raw) ?? "")

  // Held to the same 1–365 the API enforces, so a hand-typed window is
  // answered here rather than bounced by the server.
  const valid = Number.isInteger(value) && value >= 1 && value <= 365

  return { days: valid ? value : DEFAULT_QUERY.days }
}

/** Every figure on one firm's dashboard, taken against one snapshot. */
export async function fetchDashboard(
  company: string,
  query: DashboardQuery,
  options?: RequestOptions
): Promise<DashboardDto> {
  const params = queryToSearchParams(query)
  const search = params.size > 0 ? `?${params.toString()}` : ""

  const data = await apiFetch<{ dashboard: unknown }>(
    `/api/companies/${encodeURIComponent(company)}/dashboard${search}`,
    options
  )

  return dashboardDtoSchema.parse(data.dashboard)
}
