"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  companyKeys,
  fetchCompanies,
  fetchCompany,
  restoreLetterhead,
  updateLetterhead,
} from "@/lib/api/companies"
import type { CompanySlug } from "@/lib/companies"
import type { CompanyDto, LetterheadInput } from "@/lib/schemas/company"

/**
 * Holds the firm every screen actually renders against.
 *
 * The layout resolves the firm on the server and puts it in the query cache, so
 * these hooks are reads of that cache rather than fetches of their own — the
 * first render already has the answer. They stay queries rather than plain
 * props because the letterhead is editable: a page's props are fixed when the
 * route is rendered, so a screen reading them would keep printing the old
 * letterhead after the settings screen saved a new one. Reading the cache, the
 * sidebar and the printed L.R. both change the moment the save lands.
 *
 * The provider itself carries only the slug and the printed fallback, which is
 * what the screens fall back to when the API cannot be reached.
 */

interface CompanyContextValue {
  slug: CompanySlug
  printed: CompanyDto
  printedList: CompanyDto[]
}

const CompanyContext = React.createContext<CompanyContextValue | null>(null)

export function CompanyProvider({
  slug,
  printed,
  printedList,
  children,
}: CompanyContextValue & { children: React.ReactNode }) {
  // Memoised on the fields rather than the object: the layout builds fresh
  // arrays on every render, and an unmemoised value would rerender every screen
  // under it for nothing.
  const value = React.useMemo(
    () => ({ slug, printed, printedList }),
    [slug, printed, printedList]
  )

  return (
    <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
  )
}

function useCompanyContext(caller: string): CompanyContextValue {
  const context = React.useContext(CompanyContext)
  if (!context)
    throw new Error(`${caller} must be used inside a CompanyProvider`)
  return context
}

/**
 * The firm whose books are open. Prefer this over threading `company` down from
 * a page — see the note above.
 */
export function useCompany(): CompanyDto {
  const { slug, printed } = useCompanyContext("useCompany")

  const { data } = useQuery({
    queryKey: companyKeys.detail(slug),
    queryFn: () => fetchCompany(slug),
    // Not `initialData`: that would be written into the cache and treated as a
    // real answer, so a firm whose fetch failed would sit on the printed
    // letterhead without trying again. As placeholder data it is shown while
    // the query keeps working, and replaced the moment the API answers.
    placeholderData: printed,
  })

  return data ?? printed
}

/** Both firms, for the switcher and for anything that names the other book. */
export function useCompanies(): CompanyDto[] {
  const { printedList } = useCompanyContext("useCompanies")

  const { data } = useQuery({
    queryKey: companyKeys.list(),
    queryFn: () => fetchCompanies(),
    placeholderData: printedList,
  })

  return data ?? printedList
}

/**
 * Saving and restoring — the settings screen and nothing else.
 *
 * Both writes seed the cache with what the API returned rather than only
 * invalidating it, so the sidebar, the switcher and the next printed document
 * show the new letterhead on the same tick the save lands, without a second
 * round trip. The list is invalidated behind that, because the switcher's copy
 * of this firm has just gone stale too.
 */
export function useCompanyEditor() {
  const { slug } = useCompanyContext("useCompanyEditor")
  const queryClient = useQueryClient()

  function applySaved(company: CompanyDto) {
    queryClient.setQueryData(companyKeys.detail(slug), company)
    void queryClient.invalidateQueries({ queryKey: companyKeys.list() })
  }

  const save = useMutation({
    mutationFn: (letterhead: LetterheadInput) =>
      updateLetterhead(slug, letterhead),
    onSuccess: applySaved,
  })

  const restore = useMutation({
    mutationFn: () => restoreLetterhead(slug),
    onSuccess: applySaved,
  })

  return { save, restore }
}
