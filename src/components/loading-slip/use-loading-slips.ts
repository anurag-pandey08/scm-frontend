"use client"

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import {
  createLoadingSlip,
  deleteLoadingSlip,
  deleteLoadingSlips,
  fetchLoadingSlips,
  fetchNextSlipNo,
  loadingSlipKeys,
  updateLoadingSlip,
  type SlipBookQuery,
} from "@/lib/api/loading-slips"
import type { CompanySlug } from "@/lib/companies"
import type { LoadingSlip } from "@/lib/loading-slip-types"
import type {
  LoadingSlipInput,
  LoadingSlipPage,
} from "@/lib/schemas/loading-slip"

/**
 * The slip book's data, as hooks.
 *
 * The page these read has already been fetched on the server and handed over
 * in the dehydrated cache, so the first render is not a request — it is a read
 * of what the server put there. From then on the filters live in the URL, and
 * changing one changes the query key, which is what makes the book refetch.
 */

export function useLoadingSlipPage(company: CompanySlug, query: SlipBookQuery) {
  return useQuery({
    queryKey: loadingSlipKeys.page(company, query),
    queryFn: () => fetchLoadingSlips(company, query),
    // Without this the table empties while the next page loads, and a book
    // that blinks between every filter change is hard to read a column down.
    placeholderData: keepPreviousData,
  })
}

/**
 * The number a new slip should carry.
 *
 * Only fetched when the form is actually opening — `enabled` — because it is a
 * question about the state of the book that is worth asking late. Ask it on
 * page load and a slip written at the next desk in the meantime means two
 * clerks are handed the same number.
 */
export function useNextSlipNo(company: CompanySlug, enabled: boolean) {
  return useQuery({
    queryKey: loadingSlipKeys.nextSlipNo(company),
    queryFn: () => fetchNextSlipNo(company),
    enabled,
    // The book moves under this one. Nothing is gained by holding an answer
    // that was true a minute ago.
    staleTime: 0,
    gcTime: 0,
  })
}

/**
 * Writing, amending and striking out.
 *
 * All four invalidate the whole book rather than patching the page in place.
 * The book is sorted, filtered, paginated and totalled by Postgres, so a saved
 * slip can land on another page, drop out of the current filter, or change a
 * footer total — none of which the client can work out for itself without
 * redoing everything the query already does.
 */
export function useLoadingSlipMutations(company: CompanySlug) {
  const queryClient = useQueryClient()

  const refreshBook = () =>
    queryClient.invalidateQueries({ queryKey: loadingSlipKeys.all(company) })

  const create = useMutation({
    mutationFn: (input: LoadingSlipInput) => createLoadingSlip(company, input),
    onSuccess: refreshBook,
  })

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: LoadingSlipInput }) =>
      updateLoadingSlip(company, id, input),
    onSuccess: refreshBook,
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteLoadingSlip(company, id),
    onSuccess: refreshBook,
  })

  // The ticked rows, in one request rather than one request each. A loop would
  // leave the book half struck out if the fourth call failed, and would make
  // the register refetch once per row.
  const removeMany = useMutation({
    mutationFn: (ids: string[]) => deleteLoadingSlips(company, ids),
    onSuccess: refreshBook,
  })

  return { create, update, remove, removeMany }
}

/** An empty page, for rendering the book before the first answer lands. */
export const EMPTY_PAGE: LoadingSlipPage = {
  slips: [],
  meta: {
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 1,
    bookTotal: 0,
    totals: { hire: 0, advance: 0, balance: 0 },
  },
}

export type { LoadingSlip }
