"use client"

import * as React from "react"
import { toast } from "sonner"

/**
 * Puts the service worker in place, and nothing else — it renders no markup.
 *
 * Development is left uncontrolled on purpose: a worker caching the shell in
 * front of the dev server hides the very edits you are making.
 */
export function ServiceWorker() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (!("serviceWorker" in navigator)) return

    // Whether this page was already being served by a worker tells an update
    // apart from a first install: only the former is worth interrupting for.
    const hadController = navigator.serviceWorker.controller !== null

    function onControllerChange() {
      if (!hadController) return
      toast("A new version of the app is ready", {
        description: "Reload to pick it up. Nothing you have typed is lost.",
        duration: Infinity,
        action: { label: "Reload", onClick: () => window.location.reload() },
      })
    }

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange
    )

    // `updateViaCache: "none"` so the worker itself is never served from the
    // HTTP cache — otherwise a stale one can outlive several deploys.
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {
        // An unregisterable worker is not worth a word to the office: the app
        // runs exactly as it did before, just without the offline copy.
      })

    return () =>
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      )
  }, [])

  return null
}
