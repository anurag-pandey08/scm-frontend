import { COMPANY_COOKIE, type CompanySlug } from "./companies"

/** A year — long enough that the office never has to pick its firm twice. */
const REMEMBER_FOR = 60 * 60 * 24 * 365

/**
 * Notes which firm's books were last open, so `/` reopens them. Written from
 * the browser rather than through a server action: switching firm is a
 * navigation, and waiting on a round trip just to record a preference would
 * put a stall in front of it. The server only ever reads this.
 */
export function rememberCompany(slug: CompanySlug) {
  document.cookie = `${COMPANY_COOKIE}=${slug}; path=/; max-age=${REMEMBER_FOR}; samesite=lax`
}
