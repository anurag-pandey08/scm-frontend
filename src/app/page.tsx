import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { COMPANY_COOKIE, DEFAULT_COMPANY, isCompanySlug } from "@/lib/companies"

/**
 * The app has no home of its own — it always opens on a firm. Whichever book
 * the clerk last had open is reopened; a first visit, or a cookie naming a firm
 * we no longer keep, falls back to the default.
 */
export default async function Home() {
  const remembered = (await cookies()).get(COMPANY_COOKIE)?.value
  const company =
    remembered && isCompanySlug(remembered) ? remembered : DEFAULT_COMPANY

  redirect(`/${company}/dashboard`)
}
