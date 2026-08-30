"use client"

import { RefreshCwIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

/** Asks for the page again — the whole of the offline page's interactivity. */
export function RetryButton() {
  return (
    <Button variant="outline" onClick={() => window.location.reload()}>
      <RefreshCwIcon data-icon="inline-start" />
      Try again
    </Button>
  )
}
