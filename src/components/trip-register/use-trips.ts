"use client"

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import {
  createTrip,
  deleteTrip,
  deleteTrips,
  fetchTrips,
  tripKeys,
  updateTrip,
  type RegisterQuery,
} from "@/lib/api/trips"
import type { TripInput, TripPage } from "@/lib/schemas/trip"
import type { Trip } from "@/lib/trip-register-types"

/**
 * The daybook's data, as hooks.
 *
 * The page these read has already been fetched on the server and handed over
 * in the dehydrated cache, so the first render is not a request — it is a read
 * of what the server put there. From then on the filters live in the URL, and
 * changing one changes the query key, which is what makes the book refetch.
 *
 * No company anywhere, unlike the other three registers' hooks. One book.
 */

export function useTripPage(query: RegisterQuery) {
  return useQuery({
    queryKey: tripKeys.page(query),
    queryFn: () => fetchTrips(query),
    // Without this the spread empties while the next page loads, and a ledger
    // that blinks between every filter change is hard to read a column down.
    placeholderData: keepPreviousData,
  })
}

/**
 * Entering, amending and striking off.
 *
 * All four invalidate the whole daybook rather than patching the page in
 * place. The book is sorted, filtered, paginated and totalled by Postgres, so
 * a saved trip can land on another page, drop out of the current filter, or
 * change one of the five figures above the spread — none of which the client
 * can work out for itself without redoing everything the query already does.
 */
export function useTripMutations() {
  const queryClient = useQueryClient()

  const refreshBook = () =>
    queryClient.invalidateQueries({ queryKey: tripKeys.all() })

  const create = useMutation({
    mutationFn: (input: TripInput) => createTrip(input),
    onSuccess: refreshBook,
  })

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: TripInput }) =>
      updateTrip(id, input),
    onSuccess: refreshBook,
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteTrip(id),
    onSuccess: refreshBook,
  })

  // The ticked rows, in one request rather than one request each. A loop would
  // leave the daybook half struck off if the fourth call failed — and this is
  // the book both offices work, so a half-finished strike-off is a half-
  // finished strike-off for everyone.
  const removeMany = useMutation({
    mutationFn: (ids: string[]) => deleteTrips(ids),
    onSuccess: refreshBook,
  })

  return { create, update, remove, removeMany }
}

/** An empty page, for rendering the ledger before the first answer lands. */
export const EMPTY_PAGE: TripPage = {
  trips: [],
  meta: {
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 1,
    bookTotal: 0,
    totals: {
      freight: 0,
      commission: 0,
      received: 0,
      dueFromParty: 0,
      dueToLorry: 0,
    },
  },
}

export type { Trip }
