import {
  QueryClient,
  defaultShouldDehydrateQuery,
  isServer,
} from "@tanstack/react-query"

import { ApiError } from "@/lib/api/client"

/**
 * One query client per request on the server, one for the whole session in the
 * browser.
 *
 * The distinction matters: a single client shared across server requests would
 * leak one office's data into another's render. In the browser there is only
 * ever one person, and a client rebuilt on every render would throw the cache
 * away each time.
 */

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Anything prefetched on the server arrives already stale at zero, so
        // the client refetches it the moment it mounts — which defeats the
        // prefetch. A short window means the hydrated data is simply used.
        staleTime: 60_000,

        // A register is read to be acted on, so it should catch up when the
        // clerk comes back to the tab — but not on every focus change while
        // they are working across two windows.
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,

        retry(failureCount, error) {
          // A 404 or a 400 will say the same thing however many times it is
          // asked. Only a server fault or an unreachable API is worth retrying.
          if (
            error instanceof ApiError &&
            error.status >= 400 &&
            error.status < 500
          ) {
            return false
          }
          return failureCount < 2
        },
      },
      mutations: {
        // A write is the office's decision, made once. Repeating it on their
        // behalf is not this layer's call.
        retry: false,
      },
      dehydrate: {
        // Carries queries the server started but has not finished across to
        // the browser, so a slow endpoint streams in rather than blocking the
        // page it is on.
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient()

  // Not created at module scope: React may suspend before the provider mounts,
  // and a client made during that render would be discarded along with it.
  browserQueryClient ??= makeQueryClient()
  return browserQueryClient
}
