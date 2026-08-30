import { cookies } from "next/headers"

import type { RequestOptions } from "@/lib/api/client"

/**
 * Server-side only. Importing this from a client component pulls `next/headers`
 * into the browser bundle and fails the build — which is the intended guard.
 *
 * A server component runs in Node, not in the browser, so nothing attaches the
 * user's cookies to a fetch it makes: the request it is answering has them, and
 * the request it sends does not. This copies them across, so a page rendered on
 * the server is authenticated as the person who asked for it.
 *
 * Only the auth cookie is forwarded. The rest are the browser's business —
 * theme, install prompts, which book was last open — and the API has no use for
 * them.
 */

/** Matches AUTH_COOKIE_NAME in scm-backend/src/utils/auth-cookie.ts. */
const AUTH_COOKIE = "access_token"

export async function withAuth(
  options: RequestOptions = {}
): Promise<RequestOptions> {
  const token = (await cookies()).get(AUTH_COOKIE)

  if (!token) return options

  return {
    ...options,
    headers: {
      ...options.headers,
      Cookie: `${AUTH_COOKIE}=${token.value}`,
    },
  }
}
