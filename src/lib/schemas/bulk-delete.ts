import { z } from "zod"

/**
 * What a bulk delete answers with, in every book.
 *
 * Two figures rather than one, because they can differ: `requested` is what the
 * clerk ticked and `deleted` is what Postgres actually found to remove. A row
 * struck out at the next desk between the tick and the confirmation is in the
 * first and not the second, and the register says so rather than claiming a
 * number it did not remove.
 *
 * Mirrors the response the four `removeMany` controllers build in scm-backend
 * — when one moves, move the other.
 */
export const bulkDeleteResultSchema = z.object({
  deleted: z.number().int().nonnegative(),
  requested: z.number().int().nonnegative(),
})

export type BulkDeleteResult = z.infer<typeof bulkDeleteResultSchema>
