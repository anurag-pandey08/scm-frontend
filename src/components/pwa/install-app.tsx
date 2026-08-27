"use client"

import * as React from "react"
import { DownloadIcon, PlusSquareIcon, ShareIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  getServerSnapshot,
  getSnapshot,
  promptInstall,
  subscribe,
} from "@/lib/install-prompt"

/**
 * Reading the browser rather than reacting to it: none of this belongs in an
 * effect, so all three read through `useSyncExternalStore`, which also keeps
 * the server render and the first client render in step.
 */

/** Nothing to subscribe to — the user agent does not change under us. */
const NEVER_CHANGES = () => () => {}

function subscribeDisplayMode(onChange: () => void) {
  const query = window.matchMedia("(display-mode: standalone)")
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

function readStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari's own flag, from before the media query existed.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/**
 * Offers to put the app on the machine — a real install where the browser
 * supports one, and directions to the Share menu on an iPhone or iPad, which is
 * the only way there.
 *
 * Renders nothing at all once the app is installed, or in a browser that will
 * not have it.
 */
export function InstallApp() {
  const prompt = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )
  const standalone = React.useSyncExternalStore(
    subscribeDisplayMode,
    readStandalone,
    () => false
  )
  const isApple = React.useSyncExternalStore(
    NEVER_CHANGES,
    () => /iPad|iPhone|iPod/.test(navigator.userAgent),
    () => false
  )

  const [showAppleSteps, setShowAppleSteps] = React.useState(false)

  // Already installed, or a browser that has said nothing and offers no other
  // way in. Better to show no button than one that cannot do anything.
  if (standalone) return null
  if (!prompt && !isApple) return null

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          if (isApple && !prompt) setShowAppleSteps(true)
          else void promptInstall()
        }}
        aria-label="Install this app on your device"
      >
        <DownloadIcon data-icon="inline-start" />
        <span className="hidden sm:inline">Install</span>
      </Button>

      <Dialog open={showAppleSteps} onOpenChange={setShowAppleSteps}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to the Home Screen</DialogTitle>
            <DialogDescription>
              Safari installs an app from its Share menu rather than asking, so
              the last two steps are yours.
            </DialogDescription>
          </DialogHeader>

          <ol className="grid gap-3 text-sm">
            <li className="flex items-center gap-2.5">
              <ShareIcon className="size-4 shrink-0 text-muted-foreground" />
              Tap Share on the toolbar
            </li>
            <li className="flex items-center gap-2.5">
              <PlusSquareIcon className="size-4 shrink-0 text-muted-foreground" />
              Choose &ldquo;Add to Home Screen&rdquo;
            </li>
          </ol>

          <p className="text-xs text-muted-foreground">
            It opens without the browser around it after that, and the books
            stay readable when the line is down.
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAppleSteps(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
