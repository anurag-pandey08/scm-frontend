/**
 * Chrome's install invitation, held on to so the app can offer it in its own
 * words rather than leaving it to the browser's bar.
 *
 * The event fires once, early — often before React has mounted anything — so it
 * is caught at module scope and kept. An external store, like the letterheads,
 * because that is what it is: something outside React that changes on its own.
 *
 * Safari on iOS never fires it. There the app can only tell the user where the
 * Share menu is, which is what the install button falls back to.
 */

/** Not in TypeScript's DOM library — the event is Chromium's own. */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

function changed() {
  for (const listener of listeners) listener()
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Hold the browser's own bar back; the app has a better place to ask.
    event.preventDefault()
    deferred = event as BeforeInstallPromptEvent
    changed()
  })

  window.addEventListener("appinstalled", () => {
    deferred = null
    changed()
  })
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getSnapshot(): BeforeInstallPromptEvent | null {
  return deferred
}

/** Nothing is installable while rendering on the server. */
export function getServerSnapshot(): BeforeInstallPromptEvent | null {
  return null
}

/**
 * Shows the browser's install dialog. The saved event is spent either way — the
 * browser hands over a fresh one if the app is still not installed.
 */
export async function promptInstall(): Promise<
  "accepted" | "dismissed" | "unavailable"
> {
  const event = deferred
  if (!event) return "unavailable"

  deferred = null
  changed()

  await event.prompt()
  const { outcome } = await event.userChoice
  return outcome
}
