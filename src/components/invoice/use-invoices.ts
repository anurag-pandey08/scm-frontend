"use client"

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import {
  createInvoice,
  deleteInvoice,
  fetchInvoices,
  fetchNextBillNo,
  invoiceKeys,
  updateInvoice,
  type BillBookQuery,
} from "@/lib/api/invoices"
import type { CompanySlug } from "@/lib/companies"
import type { Invoice } from "@/lib/invoice-types"
import type { InvoiceInput, InvoicePage } from "@/lib/schemas/invoice"

/**
 * The bill book's data, as hooks.
 *
 * The page these read has already been fetched on the server and handed over
 * in the dehydrated cache, so the first render is not a request — it is a read
 * of what the server put there. From then on the filters live in the URL, and
 * changing one changes the query key, which is what makes the book refetch.
 */

export function useInvoicePage(company: CompanySlug, query: BillBookQuery) {
  return useQuery({
    queryKey: invoiceKeys.page(company, query),
    queryFn: () => fetchInvoices(company, query),
    // Without this the table empties while the next page loads, and a book
    // that blinks between every filter change is hard to read a column down.
    placeholderData: keepPreviousData,
  })
}

/**
 * The number a new bill should carry.
 *
 * Only fetched when the form is actually opening — `enabled` — because it is a
 * question about the state of the book that is worth asking late. Ask it on
 * page load and a bill raised at the next desk in the meantime means two
 * clerks are handed the same number.
 */
export function useNextBillNo(company: CompanySlug, enabled: boolean) {
  return useQuery({
    queryKey: invoiceKeys.nextBillNo(company),
    queryFn: () => fetchNextBillNo(company),
    enabled,
    // The book moves under this one. Nothing is gained by holding an answer
    // that was true a minute ago.
    staleTime: 0,
    gcTime: 0,
  })
}

/**
 * Raising, amending and striking out.
 *
 * All three invalidate the whole book rather than patching the page in place.
 * The book is sorted, filtered, paginated and totalled by Postgres, so a saved
 * bill can land on another page, drop out of the current filter, or change a
 * footer total — none of which the client can work out for itself without
 * redoing everything the query already does.
 */
export function useInvoiceMutations(company: CompanySlug) {
  const queryClient = useQueryClient()

  const refreshBook = () =>
    queryClient.invalidateQueries({ queryKey: invoiceKeys.all(company) })

  const create = useMutation({
    mutationFn: (input: InvoiceInput) => createInvoice(company, input),
    onSuccess: refreshBook,
  })

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: InvoiceInput }) =>
      updateInvoice(company, id, input),
    onSuccess: refreshBook,
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteInvoice(company, id),
    onSuccess: refreshBook,
  })

  return { create, update, remove }
}

/** An empty page, for rendering the book before the first answer lands. */
export const EMPTY_PAGE: InvoicePage = {
  invoices: [],
  meta: {
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 1,
    bookTotal: 0,
    totals: { billed: 0, outstanding: 0 },
  },
}

export type { Invoice }
