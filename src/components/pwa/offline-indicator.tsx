"use client"

import { useOffline } from "next/offline"
import { CloudOffIcon } from "lucide-react"

/**
 * Says so when the line is down.
 *
 * The books do not stop working — they are held in the browser — so this is a
 * statement of fact rather than a warning, and it sits quietly in the header
 * instead of pushing a banner across the top of the work.
 *
 * `useOffline` is more trustworthy than `navigator.onLine`: it also counts a
 * request that could not reach the origin, which is what a jammed office
 * connection actually looks like.
 */
export function OfflineIndicator() {
  const isOffline = useOffline()

  if (!isOffline) return null

  return (
    <p
      role="status"
      className="flex items-center gap-1.5 rounded-lg bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"
      title="No connection — the registers are kept in this browser and still work"
    >
      <CloudOffIcon className="size-3.5" />
      <span className="hidden sm:inline">Offline</span>
    </p>
  )
}
