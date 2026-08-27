import { COMPANY_LIST, type CompanySlug } from "./companies"
import {
  affectsDetails,
  clearDetails,
  readDetails,
  writeDetails,
  type CompanyDetails,
} from "./company-settings"

/**
 * The saved letterheads, as an external store React can subscribe to.
 *
 * Local storage is exactly the kind of thing `useSyncExternalStore` is for: it
 * lives outside React, it is written from more than one place — this tab's
 * settings screen, and the other tab the office has the second book open in —
 * and its value has to be read afresh rather than mirrored into state.
 *
 * Snapshots are cached because React demands a stable reference: rebuilding the
 * object on every read would look like a change on every render and spin.
 */

export type SavedLetterheads = Partial<Record<CompanySlug, CompanyDetails>>

/**
 * What the server renders, and so what the first client render must agree with:
 * nothing saved, every firm on its printed letterhead. One frozen object, since
 * React compares snapshots by identity.
 */
const NOTHING_SAVED: SavedLetterheads = Object.freeze({})

let snapshot: SavedLetterheads | null = null
const listeners = new Set<() => void>()

function read(): SavedLetterheads {
  const saved: SavedLetterheads = {}
  for (const firm of COMPANY_LIST) {
    const details = readDetails(firm.slug)
    if (details) saved[firm.slug] = details
  }
  return saved
}

/** Drops the cached snapshot and wakes every subscriber. */
function changed() {
  snapshot = null
  for (const listener of listeners) listener()
}

function onStorage(event: StorageEvent) {
  if (affectsDetails(event.key)) changed()
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  // One `storage` listener between them all, and none at all once the last
  // subscriber goes — the event only fires for edits made in another tab.
  if (listeners.size === 1) window.addEventListener("storage", onStorage)

  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) window.removeEventListener("storage", onStorage)
  }
}

export function getSnapshot(): SavedLetterheads {
  snapshot ??= read()
  return snapshot
}

export function getServerSnapshot(): SavedLetterheads {
  return NOTHING_SAVED
}

export function saveLetterhead(slug: CompanySlug, details: CompanyDetails) {
  writeDetails(slug, details)
  changed()
}

/** Puts a firm back to the letterhead transcribed from its own book. */
export function restoreLetterhead(slug: CompanySlug) {
  clearDetails(slug)
  changed()
}
