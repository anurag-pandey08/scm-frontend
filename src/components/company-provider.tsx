"use client"

import * as React from "react"

import { COMPANY_LIST, type Company, type CompanySlug } from "@/lib/companies"
import { applyDetails, type CompanyDetails } from "@/lib/company-settings"
import {
  getServerSnapshot,
  getSnapshot,
  restoreLetterhead,
  saveLetterhead,
  subscribe,
} from "@/lib/letterhead-store"

/**
 * Holds the firm every screen actually renders against.
 *
 * The `[company]` segment is resolved on the server and both trees are
 * prerendered, so the firm arrives as static data — exactly what is wanted for
 * the first paint, and no use at all once the office has edited its own
 * letterhead. This provider sits between the two: it carries the printed
 * letterhead down from the layout, and lays whatever the browser has saved over
 * the top of it.
 *
 * The overlay is read through `useSyncExternalStore` rather than copied into
 * state, so the prerendered HTML and the first client render agree (both show
 * the printed letterhead) and React swaps in the saved one straight after
 * hydration, here and in any other tab that saves.
 */

const CompanyContext = React.createContext<Company | null>(null)

export function CompanyProvider({
  base,
  children,
}: {
  /** The firm the server resolved from the URL, straight off the letterhead. */
  base: Company
  children: React.ReactNode
}) {
  return (
    <CompanyContext.Provider value={base}>{children}</CompanyContext.Provider>
  )
}

function useBase(caller: string): Company {
  const base = React.useContext(CompanyContext)
  if (!base) throw new Error(`${caller} must be used inside a CompanyProvider`)
  return base
}

function useSaved() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/**
 * The firm whose books are open. Prefer this over threading `company` down from
 * a page: a page's props are fixed when the route is rendered, so a screen that
 * reads them keeps printing the old letterhead after the office edits it.
 */
export function useCompany(): Company {
  const base = useBase("useCompany")
  const saved = useSaved()
  // Memoised because callers lean on the identity: the settings form reloads
  // its draft when the firm it is editing becomes a different object.
  return React.useMemo(
    () => applyDetails(base, saved[base.slug] ?? null),
    [base, saved]
  )
}

/** Both firms, for the switcher and for anything that names the other book. */
export function useCompanies(): Company[] {
  const saved = useSaved()
  return React.useMemo(
    () =>
      COMPANY_LIST.map((firm) => applyDetails(firm, saved[firm.slug] ?? null)),
    [saved]
  )
}

/** Saving and restoring — the settings screen and nothing else. */
export function useCompanyEditor() {
  const saved = useSaved()
  return {
    /** Whether a firm is running on saved details rather than the printed ones. */
    isEdited: (slug: CompanySlug) => saved[slug] !== undefined,
    save: (slug: CompanySlug, details: CompanyDetails) =>
      saveLetterhead(slug, details),
    restore: (slug: CompanySlug) => restoreLetterhead(slug),
  }
}
