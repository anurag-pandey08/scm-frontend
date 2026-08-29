import { apiFetch, type RequestOptions } from "@/lib/api/client"
import { dashboardSchema, type Dashboard } from "@/lib/schemas/dashboard"

/**
 * One firm's dashboard.
 *
 * A single request for the whole screen, because the whole screen is one
 * reading of one book: the tiles, the trend, the split and the lanes are taken
 * against the same snapshot in Postgres, and asking for them separately would
 * let the tiles and the pie disagree by whatever was booked in between.
 *
 * No query keys and no hooks — the dashboard is read, not worked on, so it is
 * rendered on the server and never refetched in the browser. See the page.
 */

/**
 * Every figure on a firm's dashboard.
 *
 * The window is the API's to decide — thirty days, ending on the office's own
 * today — and it comes back in the answer, which is what the header prints.
 * There is no control for it yet; when there is, it goes in the URL the way
 * the register's filters do, and this takes a `days`.
 */
export async function fetchDashboard(
  company: string,
  options?: RequestOptions
): Promise<Dashboard> {
  const data = await apiFetch<{ dashboard: unknown }>(
    `/api/companies/${encodeURIComponent(company)}/dashboard`,
    options
  )
  return dashboardSchema.parse(data.dashboard)
}
