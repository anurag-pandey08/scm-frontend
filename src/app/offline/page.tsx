import type { Metadata } from "next"
import { CloudOffIcon } from "lucide-react"

import { RetryButton } from "@/components/pwa/retry-button"

export const metadata: Metadata = {
  title: "Offline — Sewak Transport",
}

/**
 * The last resort. The service worker serves this only when the line is down
 * and there is nothing cached to show instead — which in practice means a
 * screen the office has never opened on this machine.
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-12">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="grid size-12 place-items-center rounded-xl bg-muted">
          <CloudOffIcon className="size-6 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            This screen has not been opened here yet
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The line is down and there is no copy of this one on the machine.
            Screens the office has already opened still work — the registers,
            the bills and the slips are all kept in the browser. Anything else
            has to wait for the connection.
          </p>
        </div>
        <RetryButton />
      </div>
    </main>
  )
}
