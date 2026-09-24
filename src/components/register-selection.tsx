"use client"

import * as React from "react"
import { Trash2Icon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * Ticking rows off a register, for all four books.
 *
 * The four registers differ in what a row is and what striking one out is
 * called; they do not differ in what a tick means. So the ticks, the "all on
 * this page" box and the bar that appears above the table live here once, and
 * each book supplies its own nouns.
 */

/** What a register gets back from `useRowSelection`. */
export interface RowSelection {
  /** The ticked ids, in the order the rows are on the page. */
  readonly selected: string[]
  readonly count: number
  /** Every row on the page is ticked — the "all" box is filled. */
  readonly allSelected: boolean
  /** Some but not all — the "all" box shows a dash. */
  readonly someSelected: boolean
  isSelected(id: string): boolean
  toggle(id: string): void
  /** Ticks every row on the page, or clears them if they are already ticked. */
  toggleAll(): void
  clear(): void
}

const NOTHING: ReadonlySet<string> = new Set()

/**
 * The ticks against the rows currently on screen.
 *
 * Scoped to the page on purpose. A tick is a thing the clerk can see, and a
 * selection that survived a filter change would be a set of rows nobody is
 * looking at — the count in the bar would be right and the rows it named
 * would be anyone's guess. So when the rows change, the ticks go: a filter, a
 * page turn, a save that reorders the book, and the deletion itself.
 *
 * "The rows changed" is the list of ids, not the object identity of the array:
 * a refetch that comes back with the same page leaves the ticks alone, which
 * is what makes the bar survive the invalidation after a save.
 *
 * The comparison is made during the render rather than in an effect, so the
 * table never paints one frame carrying a count from the page before.
 */
export function useRowSelection<Row extends { id: string }>(
  rows: readonly Row[]
): RowSelection {
  const ids = rows.map((row) => row.id)
  // Ids are cuids, so a space cannot appear inside one and cannot run two of
  // them together.
  const signature = ids.join(" ")

  const [state, setState] = React.useState<{
    signature: string
    ticked: ReadonlySet<string>
  }>(() => ({ signature, ticked: NOTHING }))

  if (state.signature !== signature) {
    setState({ signature, ticked: NOTHING })
  }

  // Read past the state rather than out of it while the reset above is still
  // pending, so this render already agrees with the render it schedules.
  const ticked = state.signature === signature ? state.ticked : NOTHING

  const selected = ids.filter((id) => ticked.has(id))

  return {
    selected,
    count: selected.length,
    allSelected: ids.length > 0 && selected.length === ids.length,
    someSelected: selected.length > 0 && selected.length < ids.length,
    isSelected: (id) => ticked.has(id),
    toggle(id) {
      setState((previous) => {
        const next = new Set(previous.ticked)
        // `delete` reports whether it removed anything, which is the same
        // question as "was it ticked".
        if (!next.delete(id)) next.add(id)
        return { signature, ticked: next }
      })
    },
    toggleAll() {
      setState({
        signature,
        ticked: selected.length === ids.length ? NOTHING : new Set(ids),
      })
    },
    clear() {
      setState({ signature, ticked: NOTHING })
    },
  }
}

/**
 * The box at the top of the tick column.
 *
 * Wrapped rather than left to each register because pairing `checked` with
 * `indeterminate` is the part that is easy to get wrong, and getting it wrong
 * means a half-ticked box that claims to be full.
 */
export function SelectAllBox({
  selection,
  label,
  disabled,
}: {
  selection: RowSelection
  /** What the box is selecting, for a reader who cannot see the column. */
  label: string
  disabled?: boolean
}) {
  return (
    <Checkbox
      checked={selection.allSelected}
      indeterminate={selection.someSelected}
      onCheckedChange={() => selection.toggleAll()}
      disabled={disabled}
      aria-label={label}
    />
  )
}

/** The box against one row. */
export function SelectRowBox({
  selection,
  id,
  label,
  className,
}: {
  selection: RowSelection
  id: string
  label: string
  className?: string
}) {
  return (
    <Checkbox
      checked={selection.isSelected(id)}
      onCheckedChange={() => selection.toggle(id)}
      aria-label={label}
      className={className}
    />
  )
}

/**
 * The bar above the table, while anything is ticked.
 *
 * It says what is about to be acted on before offering the action, and the
 * count is announced rather than only drawn — a clerk working the keyboard
 * ticks rows without ever looking at the bar.
 */
export function SelectionBar({
  count,
  noun,
  plural,
  action,
  pending,
  onClear,
  onDelete,
  className,
}: {
  count: number
  /** "bilty" — used when exactly one row is ticked. */
  noun: string
  /** "bilties" — used for every other count. */
  plural: string
  /** The destructive button's words: each book strikes rows out differently. */
  action: string
  pending?: boolean
  onClear: () => void
  onDelete: () => void
  className?: string
}) {
  if (count === 0) return null

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 rounded-lg border border-foreground/15 bg-muted px-3 py-2",
        className
      )}
    >
      <p className="text-sm font-medium" aria-live="polite">
        {formatNumber(count)} {count === 1 ? noun : plural} selected
      </p>

      <div className="flex items-center gap-1.5">
        <Button variant="ghost" size="sm" onClick={onClear}>
          <XIcon data-icon="inline-start" />
          Clear
        </Button>
        <Button
          variant="destructive"
          size="sm"
          disabled={pending}
          onClick={onDelete}
        >
          <Trash2Icon data-icon="inline-start" />
          {action}
        </Button>
      </div>
    </div>
  )
}
