"use client"

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import {
  biltyKeys,
  createBilty,
  deleteBilty,
  fetchBilties,
  fetchNextLrNo,
  updateBilty,
  type RegisterQuery,
} from "@/lib/api/bilties"
import type { CompanySlug } from "@/lib/companies"
import type { BiltyInput, BiltyPage } from "@/lib/schemas/bilty"
import type { Bilty } from "@/lib/types"

/**
 * The register's data, as hooks.
 *
 * The page these read has already been fetched on the server and handed over
 * in the dehydrated cache, so the first render is not a request — it is a read
 * of what the server put there. From then on the filters live in the URL, and
 * changing one changes the query key, which is what makes the register refetch.
 */

export function useBiltyPage(company: CompanySlug, query: RegisterQuery) {
  return useQuery({
    queryKey: biltyKeys.page(company, query),
    queryFn: () => fetchBilties(company, query),
    // Without this the table empties while the next page loads, and a register
    // that blinks between every filter change is hard to read a column down.
    // The old rows stay until the new ones arrive; `isPlaceholderData` is what
    // the header uses to say it is catching up.
    placeholderData: keepPreviousData,
  })
}

/**
 * The number a new L.R. should carry.
 *
 * Only fetched when the form is actually opening — `enabled` — because it is a
 * question about the state of the book that is worth asking late. Ask it on
 * page load and a bilty booked at the next desk in the meantime means two
 * clerks are handed the same number.
 */
export function useNextLrNo(company: CompanySlug, enabled: boolean) {
  return useQuery({
    queryKey: biltyKeys.nextLrNo(company),
    queryFn: () => fetchNextLrNo(company),
    enabled,
    // The book moves under this one. Nothing is gained by holding an answer
    // that was true a minute ago.
    staleTime: 0,
    gcTime: 0,
  })
}

/**
 * Booking, amending and striking out.
 *
 * All three invalidate the whole book rather than patching the page in place.
 * The register is sorted, filtered, paginated and totalled by Postgres, so a
 * saved bilty can land on another page, drop out of the current filter, or
 * change a footer total — none of which the client can work out for itself
 * without redoing everything the query already does.
 */
export function useBiltyMutations(company: CompanySlug) {
  const queryClient = useQueryClient()

  const refreshBook = () =>
    queryClient.invalidateQueries({ queryKey: biltyKeys.all(company) })

  const create = useMutation({
    mutationFn: (input: BiltyInput) => createBilty(company, input),
    onSuccess: refreshBook,
  })

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: BiltyInput }) =>
      updateBilty(company, id, input),
    onSuccess: refreshBook,
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteBilty(company, id),
    onSuccess: refreshBook,
  })

  return { create, update, remove }
}

/** An empty page, for rendering the register before the first answer lands. */
export const EMPTY_PAGE: BiltyPage = {
  bilties: [],
  meta: {
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 1,
    bookTotal: 0,
    totals: { gross: 0, balance: 0 },
  },
}

export type { Bilty }
