"use client"

import { QueryClientProvider } from "@tanstack/react-query"

import { getQueryClient } from "@/lib/query-client"

/**
 * Puts the query cache in scope for the whole app.
 *
 * Sits at the root rather than around each screen, because the cache is what
 * lets one screen show what another has already loaded — the sidebar knows both
 * firms' names because the settings page fetched them.
 *
 * `getQueryClient` is called during render, not in state or a ref: on the
 * server it must hand back a fresh client for this request, and in the browser
 * the same one every time. It already knows which it is doing.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={getQueryClient()}>
      {children}
    </QueryClientProvider>
  )
}
